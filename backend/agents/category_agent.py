"""CategoryAgent — luokittelee kiinteistöyhtiön sähköpostiviestin tyypin."""

import logging

from pydantic import ValidationError

from .base import build_agent, load_knowledge, parse_json, run_agent
from .response_models import CategoryAgentResponse

logger = logging.getLogger(__name__)

_INSTRUCTIONS = f"""{load_knowledge("category_agent")}

Palauta VAIN JSON ilman muita selityksiä:
{{
  "category": "...",
  "category_notes": "lyhyt perustelu suomeksi",
  "language": "fi"
}}"""

_agent = build_agent("CategoryAgent", _INSTRUCTIONS)


async def run_category_agent(message: str, subject: str | None) -> CategoryAgentResponse:
    """Luokittelee viestin ja palauttaa validoidun CategoryAgentResponse-olion."""
    subject_line = f"Aihe: {subject}\n\n" if subject else ""
    prompt = f"{subject_line}Viesti:\n{message}"

    raw = await run_agent(_agent, prompt, max_tokens=300)
    data = parse_json(raw)

    try:
        return CategoryAgentResponse.model_validate(data)
    except ValidationError as exc:
        logger.warning("CategoryAgent validation error: %s | raw=%.200s", exc, raw)
        return CategoryAgentResponse()
