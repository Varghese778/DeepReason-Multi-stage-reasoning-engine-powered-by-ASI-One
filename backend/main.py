"""DeepReason API – FastAPI server powering the multi-stage reasoning pipeline.

Endpoints:
  POST /api/analyze          – Start a new analysis pipeline
  GET  /api/stream/:id       – SSE stream of pipeline events
  POST /api/challenge        – Challenge a brief section
  GET  /api/session/:id      – Retrieve full session state
  GET  /api/health           – Health check
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from models import ChallengeInput, PipelineEvent, QueryInput, SessionState
from pipeline import run_challenge, run_pipeline
from session_store import cleanup_expired, get_session, save_session

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger("main")

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
SESSION_TTL_MINUTES = int(os.getenv("SESSION_TTL_MINUTES", "60"))
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", "10"))

semaphore = asyncio.Semaphore(MAX_CONCURRENT)


def _now_ms() -> int:
    return int(time.time() * 1000)


def _sse_payload(event: PipelineEvent) -> dict:
    return {"data": json.dumps(event.model_dump())}


@asynccontextmanager
async def lifespan(app: FastAPI):
    async def _cleanup_loop() -> None:
        while True:
            await asyncio.sleep(300)
            try:
                count = await cleanup_expired(SESSION_TTL_MINUTES)
                if count > 0:
                    logger.info("Cleaned %d expired sessions", count)
            except Exception as exc:
                logger.error("cleanup_loop_error error=%s", exc)

    task = asyncio.create_task(_cleanup_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="DeepReason API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)


async def _consume_pipeline(session_id: str, query: QueryInput) -> None:
    try:
        async for _ in run_pipeline(query, session_id):
            pass
    except Exception as exc:
        logger.error("consume_pipeline_error session_id=%s error=%s", session_id, exc)
        state = await get_session(session_id)
        if state is not None:
            state.stage = "error"
            state.error = str(exc)
            await save_session(session_id, state)
    finally:
        semaphore.release()


@app.post("/api/analyze")
async def analyze(query: QueryInput) -> dict:
    try:
        await asyncio.wait_for(semaphore.acquire(), timeout=5.0)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=503,
            detail="Server busy. Please retry in a moment.",
        )

    session_id = str(uuid.uuid4())
    state = SessionState(
        session_id=session_id,
        query=query,
        created_at=datetime.now(timezone.utc),
        stage="running",
    )
    await save_session(session_id, state)
    asyncio.create_task(_consume_pipeline(session_id, query))
    return {"session_id": session_id}


@app.get("/api/stream/{session_id}")
async def stream(session_id: str) -> EventSourceResponse:
    async def event_generator():
        last_thought_count = 0
        last_stage = ""
        brief_sent = False
        poll_interval = 0.1
        timeout = 300.0
        elapsed = 0.0

        while elapsed < timeout:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

            session = await get_session(session_id)
            if session is None:
                yield _sse_payload(
                    PipelineEvent(
                        event_type="error",
                        stage="stream",
                        payload=json.dumps({"error": "Session not found"}),
                        timestamp_ms=_now_ms(),
                    )
                )
                return

            if len(session.thoughts) > last_thought_count:
                for record in session.thoughts[last_thought_count:]:
                    yield _sse_payload(
                        PipelineEvent(
                            event_type="thought",
                            stage=record.stage,
                            payload=record.thought,
                            timestamp_ms=record.timestamp_ms,
                        )
                    )
                last_thought_count = len(session.thoughts)

            if session.stage != last_stage:
                yield _sse_payload(
                    PipelineEvent(
                        event_type="stage_start",
                        stage=session.stage,
                        payload=session.stage,
                        timestamp_ms=_now_ms(),
                    )
                )
                last_stage = session.stage

            if session.brief is not None and not brief_sent:
                # Final flush: catch any thoughts appended after the top-of-loop check
                if len(session.thoughts) > last_thought_count:
                    for record in session.thoughts[last_thought_count:]:
                        yield _sse_payload(
                            PipelineEvent(
                                event_type="thought",
                                stage=record.stage,
                                payload=record.thought,
                                timestamp_ms=record.timestamp_ms,
                            )
                        )
                    last_thought_count = len(session.thoughts)
                yield _sse_payload(
                    PipelineEvent(
                        event_type="brief_ready",
                        stage="3",
                        payload=json.dumps(session.brief.model_dump()),
                        timestamp_ms=_now_ms(),
                    )
                )
                yield _sse_payload(
                    PipelineEvent(
                        event_type="done",
                        stage="3",
                        payload="",
                        timestamp_ms=_now_ms(),
                    )
                )
                brief_sent = True
                return

            if session.stage == "error":
                yield _sse_payload(
                    PipelineEvent(
                        event_type="error",
                        stage="pipeline",
                        payload=json.dumps(
                            {"error": session.error or "Pipeline failed"}
                        ),
                        timestamp_ms=_now_ms(),
                    )
                )
                return

        yield _sse_payload(
            PipelineEvent(
                event_type="error",
                stage="stream",
                payload=json.dumps({"error": "Stream timeout after 300 seconds"}),
                timestamp_ms=_now_ms(),
            )
        )

    return EventSourceResponse(event_generator())


@app.post("/api/challenge")
async def challenge_section(body: ChallengeInput) -> StreamingResponse:
    async def challenge_generator():
        async for event in run_challenge(body, body.session_id):
            data = json.dumps(event.model_dump())
            yield f"data: {data}\n\n"

    return StreamingResponse(
        challenge_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/session/{session_id}")
async def get_session_state(session_id: str) -> dict:
    state = await get_session(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return state.model_dump()


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "service": "DeepReason API"}
