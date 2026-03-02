"""Pydantic data models for the DeepReason pipeline.

Defines schemas for API inputs/outputs, pipeline events, session state,
and all intermediate reasoning artefacts (sub-questions, research results,
critique results, decision briefs, challenges).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class QueryInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    question: str = Field(..., max_length=1000)
    domain: Literal["startup", "tech", "research", "general"]
    depth: Literal[3, 5, 7]
    web_enabled: bool = False

    @field_validator("question", mode="before")
    @classmethod
    def strip_question(cls, v: str) -> str:
        return v.strip()


class SubQuestion(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    question: str
    depends_on: list[str] = []
    domain_tags: list[str] = []


class UncertainAssumption(BaseModel):
    model_config = ConfigDict(extra="ignore")

    assumption: str
    why_uncertain: str


class ResearchResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sq_id: str
    answer: str
    chain_of_thought: list[str]
    top_3_uncertain_assumptions: list[UncertainAssumption]
    confidence_raw: int = Field(..., ge=1, le=10)
    web_sources: list[str] = []
    web_search_failed: bool = False


class CritiqueResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sq_id: str
    logical_weaknesses: list[str]
    potential_biases: list[str]
    evidence_that_would_change_answer: str
    revised_confidence: int = Field(..., ge=1, le=10)
    critique_summary: str


class Finding(BaseModel):
    model_config = ConfigDict(extra="ignore")

    finding: str
    source_sq_ids: list[str]
    confidence: int = Field(..., ge=1, le=10)


class TradeOff(BaseModel):
    model_config = ConfigDict(extra="ignore")

    option: str
    pros: list[str]
    cons: list[str]


class Recommendation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    primary: str
    rationale: str
    conditions: str


class ConfidenceOverview(BaseModel):
    model_config = ConfigDict(extra="ignore")

    overall: int = Field(..., ge=1, le=10)
    narrative: str


class BriefSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")

    key_findings: list[Finding]
    trade_offs: list[TradeOff]
    recommendation: Recommendation
    open_questions: list[str]
    confidence_overview: ConfidenceOverview
    executive_summary: str
    coverage_gaps: list[str] = []


class ThoughtRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    stage: str
    thought: str
    timestamp_ms: int


class ChallengeRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    section_name: str
    challenge_text: str
    challenge_response: str
    previous_section_json: str
    timestamp_ms: int


class LogEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    stage: str
    latency_ms: int
    prompt_tokens: int
    completion_tokens: int
    error: str | None = None


class PipelineEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    event_type: Literal[
        "stage_start",
        "token",
        "thought",
        "stage_complete",
        "brief_ready",
        "error",
        "done",
    ]
    stage: str
    payload: str
    timestamp_ms: int


class ChallengeInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str
    section_name: Literal[
        "key_findings",
        "trade_offs",
        "recommendation",
        "open_questions",
        "confidence_overview",
        "executive_summary",
    ]
    challenge_text: str = Field(..., max_length=500)
    current_section_json: str


class SessionState(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str
    query: QueryInput
    sub_questions: list[SubQuestion] = []
    research: dict[str, ResearchResult] = {}
    critiques: dict[str, CritiqueResult] = {}
    brief: BriefSchema | None = None
    thoughts: list[ThoughtRecord] = []
    challenges: list[ChallengeRecord] = []
    pipeline_log: list[LogEntry] = []
    created_at: datetime
    stage: str = "idle"
    error: str | None = None

    def final_confidence(self, sq_id: str) -> float | None:
        research = self.research.get(sq_id)
        critique = self.critiques.get(sq_id)
        if research is None or critique is None:
            return None
        return (research.confidence_raw + critique.revised_confidence) / 2


__all__ = [
    "QueryInput",
    "SubQuestion",
    "UncertainAssumption",
    "ResearchResult",
    "CritiqueResult",
    "Finding",
    "TradeOff",
    "Recommendation",
    "ConfidenceOverview",
    "BriefSchema",
    "ThoughtRecord",
    "ChallengeRecord",
    "LogEntry",
    "PipelineEvent",
    "ChallengeInput",
    "SessionState",
]
