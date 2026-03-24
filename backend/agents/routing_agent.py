"""RoutingAgent — ohjaa viestin oikealle tiimille kiinteistöyhtiössä."""

import logging

from pydantic import ValidationError

from .base import build_agent, load_knowledge, parse_json, run_agent
from .response_models import RoutingAgentResponse

logger = logging.getLogger(__name__)

_INSTRUCTIONS = f"""{load_knowledge("routing_agent")}

Palauta VAIN JSON ilman muita selityksiä:
{{
  "team": "...",
  "reason": "lyhyt perustelu suomeksi",
  "escalate": false,
  "escalation_reason": null
}}"""

_agent = build_agent("RoutingAgent", _INSTRUCTIONS)


async def run_routing_agent(
    message: str,
    subject: str | None,
    category: str,
    urgency: str,
) -> RoutingAgentResponse:
    """Reittaa viestin oikealle tiimille ja palauttaa validoidun RoutingAgentResponse-olion."""
    subject_line = f"Aihe: {subject}\n\n" if subject else ""
    prompt = (
        f"Kategoria: {category}\n"
        f"Kiireellisyys: {urgency}\n\n"
        f"{subject_line}Viesti:\n{message}"
    )

    raw = await run_agent(_agent, prompt, max_tokens=300)
    data = parse_json(raw)

    try:
        return RoutingAgentResponse.model_validate(data)
    except ValidationError as exc:
        logger.warning("RoutingAgent validation error: %s | raw=%.200s", exc, raw)
        return RoutingAgentResponse()
