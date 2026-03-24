"""ReviewAgent — tarkistaa vastausluonnoksen laadun ja antaa palautteen DraftAgentille."""

import logging

from pydantic import ValidationError

from .base import build_agent, load_knowledge, parse_json, run_agent
from .response_models import ReviewAgentResponse

logger = logging.getLogger(__name__)

_INSTRUCTIONS = f"""{load_knowledge("review_agent")}

Palauta VAIN JSON:
{{
  "approved": true,
  "revised_draft": "tarkistettu tai alkuperäinen luonnos",
  "changes": ["lista muutoksista tai tyhjä lista"],
  "warnings": ["varoitukset tai tyhjä lista"],
  "feedback_for_draft": null
}}"""

_agent = build_agent("ReviewAgent", _INSTRUCTIONS)


async def run_review_agent(
    draft: str,
    category: str,
    urgency: str,
    *,
    turn: int = 1,
) -> ReviewAgentResponse:
    """Tarkistaa luonnoksen ja palauttaa validoidun ReviewAgentResponse-olion.

    Args:
        turn: Kierrosnumero — toisella kierroksella hyväksytään helpommin.
    """
    prompt = (
        f"Kierros: {turn}\n"
        f"Kategoria: {category}\n"
        f"Kiireellisyys: {urgency}\n\n"
        f"Vastausluonnos tarkistettavaksi:\n{draft}"
    )

    raw = await run_agent(_agent, prompt, max_tokens=700)
    data = parse_json(raw)

    try:
        return ReviewAgentResponse.model_validate(data)
    except ValidationError as exc:
        logger.warning("ReviewAgent validation error: %s | raw=%.200s", exc, raw)
        return ReviewAgentResponse(revised_draft=draft)
