"""Pydantic-validointimallit agenttien raakavastauksille.

Käytetään parse_json-tuloksen validointiin ennen kuin se siirtyy orchestratorille.
"""

from pydantic import BaseModel, Field


class CategoryAgentResponse(BaseModel):
    """CategoryAgentin JSON-vastauksen validointimalli."""

    category: str = Field(default="muu")
    category_notes: str = Field(default="")
    language: str = Field(default="fi")


class UrgencyAgentResponse(BaseModel):
    """UrgencyAgentin JSON-vastauksen validointimalli."""

    urgency: str = Field(default="normaali")
    urgency_score: int = Field(default=5, ge=0, le=10)
    reasoning: str = Field(default="")
    suggested_response_time: str = Field(default="3 arkipäivää")


class RoutingAgentResponse(BaseModel):
    """RoutingAgentin JSON-vastauksen validointimalli."""

    team: str = Field(default="asiakaspalvelu")
    reason: str = Field(default="")
    escalate: bool = Field(default=False)
    escalation_reason: str | None = Field(default=None)


class DraftAgentResponse(BaseModel):
    """DraftAgentin JSON-vastauksen validointimalli."""

    draft: str = Field(default="")
    tone: str = Field(default="neutraali")
    key_points_addressed: list[str] = Field(default_factory=list)


class ReviewAgentResponse(BaseModel):
    """ReviewAgentin JSON-vastauksen validointimalli."""

    approved: bool = Field(default=True)
    revised_draft: str = Field(default="")
    changes: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    feedback_for_draft: str | None = Field(default=None)
