"""DraftAgent — kirjoittaa ja korjaa vastausluonnoksen kiinteistöyhtiön viestiin."""

import logging

from pydantic import ValidationError

from .base import build_agent, load_knowledge, parse_json, run_agent
from .response_models import DraftAgentResponse

logger = logging.getLogger(__name__)

_INSTRUCTIONS = f"""{load_knowledge("draft_agent")}

Palauta VAIN JSON:
{{
  "draft": "vastausluonnos",
  "tone": "muodollinen|ystävällinen|neutraali",
  "key_points_addressed": ["lista vastauksessa käsitellyistä asioista"]
}}"""

_agent = build_agent("DraftAgent", _INSTRUCTIONS)


async def run_draft_agent(
    message: str,
    subject: str | None,
    category: str,
    urgency: str,
    team: str,
    *,
    previous_draft: str | None = None,
    review_feedback: str | None = None,
) -> DraftAgentResponse:
    """Kirjoittaa tai korjaa vastausluonnoksen.

    Args:
        previous_draft: Edellinen luonnos (jos korjauskierros).
        review_feedback: ReviewAgentin palaute edellisestä kierroksesta.
    """
    subject_line = f"Aihe: {subject}\n\n" if subject else ""

    if previous_draft and review_feedback:
        prompt = (
            f"Kategoria: {category}\n"
            f"Kiireellisyys: {urgency}\n"
            f"Ohjaava tiimi: {team}\n\n"
            f"Alkuperäinen viesti:\n{subject_line}{message}\n\n"
            f"Edellinen luonnoksesi:\n{previous_draft}\n\n"
            f"Tarkistajan palaute — korjaa nämä:\n{review_feedback}"
        )
    else:
        prompt = (
            f"Kategoria: {category}\n"
            f"Kiireellisyys: {urgency}\n"
            f"Ohjaava tiimi: {team}\n\n"
            f"Alkuperäinen viesti:\n{subject_line}{message}"
        )

    raw = await run_agent(_agent, prompt, creative=True, max_tokens=800)
    data = parse_json(raw)

    try:
        return DraftAgentResponse.model_validate(data)
    except ValidationError as exc:
        logger.warning("DraftAgent validation error: %s | raw=%.200s", exc, raw)
        return DraftAgentResponse()
