"""Multi-stage reasoning pipeline orchestrating ASI:One calls.

Stages:
  1. Decompose – break a complex question into sub-questions
  2A. Research – deep-dive each sub-question with domain framing
  2B. Critique – adversarial self-review of each research result
  3. Synthesise – merge findings into a structured decision brief
  4. Challenge – re-evaluate a brief section given user objection
"""

from __future__ import annotations

import json
import logging
import re
import time
from collections.abc import AsyncGenerator
from dataclasses import dataclass
from dataclasses import field as dc_field
from datetime import datetime, timezone

from asi_client import call_asi
from models import (
    BriefSchema,
    ChallengeInput,
    ChallengeRecord,
    ConfidenceOverview,
    CritiqueResult,
    Finding,
    PipelineEvent,
    QueryInput,
    Recommendation,
    ResearchResult,
    SessionState,
    SubQuestion,
    ThoughtRecord,
    TradeOff,
)
from prompts import challenge, critique, decompose, research, synthesise
from session_store import get_session, save_session
from tavily_client import search as tavily_search

logger = logging.getLogger("pipeline")

_JSON_RETRY_SUFFIX = (
    "\nYour previous response could not be parsed as JSON. "
    "Output ONLY the raw JSON object. No preamble, no markdown fences."
)


def now_ms() -> int:
    return int(time.time() * 1000)


def safe_parse_json(raw: str) -> dict:
    cleaned = re.sub(r"```json|```", "", raw).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    raise ValueError(f"Could not parse JSON from ASI:One response: {raw[:200]}")


@dataclass
class _StageResult:
    token_events: list[PipelineEvent] = dc_field(default_factory=list)
    parsed: dict | None = None
    api_error_event: PipelineEvent | None = None
    parse_error: str | None = None

    @property
    def ok(self) -> bool:
        return (
            self.api_error_event is None
            and self.parse_error is None
            and self.parsed is not None
        )


def _error_event(stage: str, message: str) -> PipelineEvent:
    return PipelineEvent(
        event_type="error",
        stage=stage,
        payload=json.dumps({"error": message}),
        timestamp_ms=now_ms(),
    )


def _stage_start(stage: str, label: str) -> PipelineEvent:
    return PipelineEvent(
        event_type="stage_start",
        stage=stage,
        payload=label,
        timestamp_ms=now_ms(),
    )


async def _run_stage(
    stage: str,
    prompt: str,
    session_id: str,
    session: SessionState,
) -> _StageResult:
    result = _StageResult()
    raw_content = ""

    async for event in call_asi(
        stage=stage,
        messages=[{"role": "user", "content": prompt}],
        session_id=session_id,
        stream=True,
    ):
        if event.event_type == "token":
            result.token_events.append(event)
        elif event.event_type == "thought":
            session.thoughts.append(
                ThoughtRecord(
                    stage=event.stage,
                    thought=event.payload,
                    timestamp_ms=event.timestamp_ms,
                )
            )
            await save_session(session_id, session)
        elif event.event_type == "stage_complete":
            raw_content = event.payload
        elif event.event_type == "error":
            result.api_error_event = event
            return result

    try:
        result.parsed = safe_parse_json(raw_content)
        return result
    except ValueError:
        pass

    retry_raw = ""
    async for event in call_asi(
        stage=stage,
        messages=[{"role": "user", "content": prompt + _JSON_RETRY_SUFFIX}],
        session_id=session_id,
        stream=False,
    ):
        if event.event_type == "thought":
            session.thoughts.append(
                ThoughtRecord(
                    stage=event.stage,
                    thought=event.payload,
                    timestamp_ms=event.timestamp_ms,
                )
            )
            await save_session(session_id, session)
        elif event.event_type == "stage_complete":
            retry_raw = event.payload
        elif event.event_type == "error":
            result.api_error_event = event
            return result

    try:
        result.parsed = safe_parse_json(retry_raw)
    except ValueError as exc:
        result.parse_error = str(exc)

    return result


def _default_critique(sq_id: str, fallback_confidence: int) -> CritiqueResult:
    return CritiqueResult(
        sq_id=sq_id,
        logical_weaknesses=[],
        potential_biases=[],
        evidence_that_would_change_answer="",
        revised_confidence=fallback_confidence,
        critique_summary="Critique unavailable.",
    )


def _apply_section_update(
    brief: BriefSchema,
    section_name: str,
    parsed: dict,
) -> None:
    if section_name == "key_findings":
        brief.key_findings = [Finding.model_validate(f) for f in parsed["key_findings"]]
    elif section_name == "trade_offs":
        brief.trade_offs = [TradeOff.model_validate(t) for t in parsed["trade_offs"]]
    elif section_name == "recommendation":
        brief.recommendation = Recommendation.model_validate(parsed)
    elif section_name == "confidence_overview":
        brief.confidence_overview = ConfidenceOverview.model_validate(parsed)
    elif section_name == "executive_summary":
        brief.executive_summary = str(parsed.get("executive_summary", ""))


async def run_pipeline(
    query: QueryInput,
    session_id: str,
) -> AsyncGenerator[PipelineEvent, None]:
    """Execute the full decompose → research → critique → synthesise pipeline.

    Yields PipelineEvent objects for each token, thought, stage transition,
    and the final brief. Events are also persisted to the session store.
    """
    logger.info("pipeline_start session_id=%s depth=%d", session_id, query.depth)

    session = await get_session(session_id)
    if session is None:
        session = SessionState(
            session_id=session_id,
            query=query,
            created_at=datetime.now(timezone.utc),
        )

    try:
        # ── STAGE 1: DECOMPOSITION ─────────────────────────────────────────
        yield _stage_start("1", "decomposition")
        session.stage = "1"

        prompt_1 = decompose.build_prompt(
            question=query.question,
            domain=query.domain,
            depth=query.depth,
        )
        result_1 = await _run_stage("1", prompt_1, session_id, session)

        for event in result_1.token_events:
            yield event

        if result_1.api_error_event:
            yield result_1.api_error_event
            return

        if not result_1.ok:
            yield _error_event("1", f"Stage 1 JSON parse failed: {result_1.parse_error}")
            return

        try:
            session.sub_questions = [
                SubQuestion.model_validate(sq)
                for sq in result_1.parsed.get("sub_questions", [])
            ]
        except Exception as exc:
            yield _error_event("1", f"Stage 1 validation failed: {exc}")
            return

        yield PipelineEvent(
            event_type="stage_complete",
            stage="1",
            payload=json.dumps([sq.model_dump() for sq in session.sub_questions]),
            timestamp_ms=now_ms(),
        )

        # ── STAGE 2: RESEARCH + CRITIQUE LOOP ─────────────────────────────
        session.stage = "2"
        remaining: list[SubQuestion] = list(session.sub_questions)
        completed_sq_ids: set[str] = set()
        failed_sq_ids: set[str] = set()

        while remaining:
            resolved = completed_sq_ids | failed_sq_ids
            ready = [
                sq for sq in remaining
                if set(sq.depends_on).issubset(resolved)
            ]
            if not ready:
                for sq in remaining:
                    failed_sq_ids.add(sq.id)
                    logger.warning(
                        "stage=2 sq_id=%s reason=unresolvable_dependency", sq.id
                    )
                break

            for sq in ready:
                remaining.remove(sq)
                web_context = ""
                web_search_failed = False

                # ── STAGE 2A: RESEARCH ──────────────────────────────────
                yield _stage_start(f"2A-{sq.id}", f"research:{sq.id}")

                if query.web_enabled:
                    result_str = await tavily_search(sq.question)
                    if result_str:
                        web_context = result_str
                    else:
                        web_search_failed = True

                prompt_2a = research.build_prompt(
                    sq_id=sq.id,
                    question=sq.question,
                    parent_question=query.question,
                    domain=query.domain,
                    web_context=web_context,
                )
                result_2a = await _run_stage(f"2A-{sq.id}", prompt_2a, session_id, session)

                for event in result_2a.token_events:
                    yield event

                if result_2a.api_error_event:
                    logger.warning("stage=2A sq_id=%s reason=api_error", sq.id)
                    yield result_2a.api_error_event
                    failed_sq_ids.add(sq.id)
                    continue

                if not result_2a.ok:
                    logger.warning(
                        "stage=2A sq_id=%s reason=parse_failed error=%s",
                        sq.id,
                        result_2a.parse_error,
                    )
                    yield _error_event(
                        f"2A-{sq.id}",
                        f"Research parse failed for {sq.id}: {result_2a.parse_error}",
                    )
                    failed_sq_ids.add(sq.id)
                    continue

                try:
                    research_result = ResearchResult.model_validate(
                        {
                            **result_2a.parsed,
                            "sq_id": sq.id,
                            "web_search_failed": web_search_failed,
                        }
                    )
                    session.research[sq.id] = research_result
                except Exception as exc:
                    logger.warning(
                        "stage=2A sq_id=%s reason=validation_failed error=%s", sq.id, exc
                    )
                    yield _error_event(f"2A-{sq.id}", f"Research validation failed: {exc}")
                    failed_sq_ids.add(sq.id)
                    continue

                yield PipelineEvent(
                    event_type="stage_complete",
                    stage=f"2A-{sq.id}",
                    payload=json.dumps(session.research[sq.id].model_dump()),
                    timestamp_ms=now_ms(),
                )

                # ── STAGE 2B: CRITIQUE ────────────────────────────────────
                yield _stage_start(f"2B-{sq.id}", f"critique:{sq.id}")

                prompt_2b = critique.build_prompt(
                    research_json=json.dumps(session.research[sq.id].model_dump())
                )
                result_2b = await _run_stage(f"2B-{sq.id}", prompt_2b, session_id, session)

                for event in result_2b.token_events:
                    yield event

                if result_2b.api_error_event or not result_2b.ok:
                    if result_2b.api_error_event:
                        logger.warning("stage=2B sq_id=%s reason=api_error", sq.id)
                    else:
                        logger.warning(
                            "stage=2B sq_id=%s reason=parse_failed error=%s",
                            sq.id,
                            result_2b.parse_error,
                        )
                    session.critiques[sq.id] = _default_critique(
                        sq.id, session.research[sq.id].confidence_raw
                    )
                else:
                    try:
                        session.critiques[sq.id] = CritiqueResult.model_validate(
                            {**result_2b.parsed, "sq_id": sq.id}
                        )
                    except Exception as exc:
                        logger.warning(
                            "stage=2B sq_id=%s reason=validation_failed error=%s", sq.id, exc
                        )
                        session.critiques[sq.id] = _default_critique(
                            sq.id, session.research[sq.id].confidence_raw
                        )

                yield PipelineEvent(
                    event_type="stage_complete",
                    stage=f"2B-{sq.id}",
                    payload=json.dumps(session.critiques[sq.id].model_dump()),
                    timestamp_ms=now_ms(),
                )

                completed_sq_ids.add(sq.id)

        # ── STAGE 3: SYNTHESIS ─────────────────────────────────────────────
        yield _stage_start("3", "synthesis")
        session.stage = "3"

        coverage_gaps = list(failed_sq_ids)
        findings = [
            {
                "sq_id": sq_id,
                "answer": session.research[sq_id].answer,
                "critique_summary": (
                    session.critiques[sq_id].critique_summary
                    if sq_id in session.critiques
                    else ""
                ),
                "final_confidence": (
                    session.final_confidence(sq_id)
                    or session.research[sq_id].confidence_raw
                ),
            }
            for sq_id in session.research
        ]

        prompt_3 = synthesise.build_prompt(
            question=query.question,
            findings=findings,
            coverage_gaps=coverage_gaps,
        )
        result_3 = await _run_stage("3", prompt_3, session_id, session)

        for event in result_3.token_events:
            yield event

        if result_3.api_error_event:
            yield result_3.api_error_event
            return

        if not result_3.ok:
            yield _error_event("3", f"Synthesis parse failed: {result_3.parse_error}")
            return

        try:
            brief = BriefSchema.model_validate(result_3.parsed)
            brief.coverage_gaps = coverage_gaps
            session.brief = brief
        except Exception as exc:
            yield _error_event("3", f"Synthesis validation failed: {exc}")
            return

        yield PipelineEvent(
            event_type="brief_ready",
            stage="3",
            payload=json.dumps(session.brief.model_dump()),
            timestamp_ms=now_ms(),
        )
        yield PipelineEvent(
            event_type="done",
            stage="3",
            payload="",
            timestamp_ms=now_ms(),
        )

        session.stage = "complete"
        await save_session(session_id, session)
        logger.info("pipeline_complete session_id=%s", session_id)

    except Exception as exc:
        logger.error(
            "pipeline_unhandled_exception session_id=%s error=%s", session_id, exc
        )
        yield _error_event("pipeline", str(exc))


async def run_challenge(
    challenge_input: ChallengeInput,
    session_id: str,
) -> AsyncGenerator[PipelineEvent, None]:
    """Re-evaluate a brief section in response to a user challenge.

    Sends the current section, the user's objection, and supporting research
    to ASI:One, then updates the brief with the revised output.
    """
    try:
        state = await get_session(session_id)
        if state is None:
            yield _error_event("4", "Session not found")
            return

        if state.brief is None:
            yield _error_event("4", "No brief found in session")
            return

        supporting_research = "".join(
            f"sq_id: {sq_id}\nanswer: {res.answer}\n\n"
            for sq_id, res in state.research.items()
        )

        prompt_4 = challenge.build_prompt(
            question=state.query.question,
            section_name=challenge_input.section_name,
            current_section_json=challenge_input.current_section_json,
            challenge_text=challenge_input.challenge_text,
            supporting_research=supporting_research,
        )

        yield _stage_start("4", "challenge")

        result_4 = await _run_stage("4", prompt_4, session_id, state)

        for event in result_4.token_events:
            yield event

        if result_4.api_error_event:
            yield result_4.api_error_event
            return

        if not result_4.ok:
            yield _error_event("4", f"Challenge parse failed: {result_4.parse_error}")
            return

        parsed_4 = result_4.parsed
        challenge_response = parsed_4.pop("challenge_response", "")

        if challenge_input.section_name == "open_questions":
            state.brief.open_questions = parsed_4.get("open_questions", [])
        else:
            try:
                _apply_section_update(state.brief, challenge_input.section_name, parsed_4)
            except Exception as exc:
                yield _error_event("4", f"Section update validation failed: {exc}")
                return

        state.challenges.append(
            ChallengeRecord(
                section_name=challenge_input.section_name,
                challenge_text=challenge_input.challenge_text,
                challenge_response=challenge_response,
                previous_section_json=challenge_input.current_section_json,
                timestamp_ms=now_ms(),
            )
        )

        yield PipelineEvent(
            event_type="brief_ready",
            stage="4",
            payload=json.dumps(state.brief.model_dump()),
            timestamp_ms=now_ms(),
        )
        yield PipelineEvent(
            event_type="done",
            stage="4",
            payload="",
            timestamp_ms=now_ms(),
        )

        await save_session(session_id, state)

    except Exception as exc:
        logger.error(
            "challenge_unhandled_exception session_id=%s error=%s", session_id, exc
        )
        yield _error_event("4", str(exc))
