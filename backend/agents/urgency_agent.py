"""UrgencyAgent — arvioi kiinteistöyhtiön sähköpostiviestin kiireellisyyden."""

import logging

from pydantic import ValidationError

from .base import build_agent, load_knowledge, parse_json, run_agent
from .response_models import UrgencyAgentResponse

logger = logging.getLogger(__name__)

_INSTRUCTIONS = f"""{load_knowledge("urgency_agent")}

Palauta VAIN JSON ilman muita selityksiä:
{{
  "urgency": "...",
  "urgency_score": 0,
  "reasoning": "...",
  "suggested_response_time": "..."
}}"""

_agent = build_agent("UrgencyAgent", _INSTRUCTIONS)


async def run_urgency_agent(
    message: str,
    subject: str | None,
    category: str,
) -> UrgencyAgentResponse:
    """Arvioi viestin kiireellisyyden ja palauttaa validoidun UrgencyAgentResponse-olion."""
    subject_line = f"Aihe: {subject}\n\n" if subject else ""
    prompt = (
        f"Kategoria: {category}\n\n"
        f"{subject_line}Viesti:\n{message}"
    )

    raw = await run_agent(_agent, prompt, max_tokens=400)
    data = parse_json(raw)

    try:
        return UrgencyAgentResponse.model_validate(data)
    except ValidationError as exc:
        logger.warning("UrgencyAgent validation error: %s | raw=%.200s", exc, raw)
        return UrgencyAgentResponse()
