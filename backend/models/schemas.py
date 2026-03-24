"""Pydantic-skeemat InboxPilot API:n request- ja response-rakenteille."""

from typing import Any

from pydantic import BaseModel, Field


# ── Request ───────────────────────────────────────────────────────────────────


class AnalyzeRequest(BaseModel):
    """Sähköpostiviestin analyysipyyntö."""

    message: str = Field(..., min_length=10, max_length=10_000)
    subject: str | None = Field(default=None, max_length=500)


# ── Agent-tulokset ────────────────────────────────────────────────────────────


class CategoryResult(BaseModel):
    """CategoryAgentin tulos."""

    category: str
    category_notes: str
    language: str


class UrgencyResult(BaseModel):
    """UrgencyAgentin tulos."""

    urgency: str
    urgency_score: int
    reasoning: str
    suggested_response_time: str


class RoutingResult(BaseModel):
    """RoutingAgentin tulos."""

    team: str
    reason: str
    escalate: bool
    escalation_reason: str | None


class DraftResult(BaseModel):
    """DraftAgentin tulos."""

    draft: str
    tone: str
    key_points_addressed: list[str]


class ReviewResult(BaseModel):
    """ReviewAgentin tulos."""

    approved: bool
    revised_draft: str
    changes: list[str]
    warnings: list[str]


# ── Agent trace ───────────────────────────────────────────────────────────────


class AgentTraceEntry(BaseModel):
    """Yhden agentin suoritustiedot."""

    agent: str
    output: dict[str, Any]
    duration_ms: int
    skipped: bool = False


# ── Agenttikeskustelu ─────────────────────────────────────────────────────────


class ConversationTurn(BaseModel):
    """Yksi vuoro DraftAgent–ReviewAgent-dialogissa."""

    agent: str
    content: str
    turn: int
    approved: bool | None = None
    feedback: str | None = None


# ── Response ──────────────────────────────────────────────────────────────────


class AnalyzeResponse(BaseModel):
    """Koko pipeline-analyysin vastaus."""

    category: CategoryResult
    urgency: UrgencyResult
    routing: RoutingResult
    draft: DraftResult
    review: ReviewResult
    conversation: list[ConversationTurn] = Field(default_factory=list)
    agent_trace: list[AgentTraceEntry]
    processing_time_ms: int


# ── Esimerkkiviestit ──────────────────────────────────────────────────────────


class SampleMessage(BaseModel):
    """Yksi esimerkkiviesti."""

    id: str
    title: str
    preview: str
    message: str
    subject: str


class SamplesResponse(BaseModel):
    """Esimerkkiviestilista."""

    samples: list[SampleMessage]
