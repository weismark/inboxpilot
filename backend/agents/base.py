"""
Agent-abstraktio Microsoft Agent Frameworkin virallisella API:lla.

Käyttää:
  from agent_framework import Agent
  from agent_framework.openai import OpenAIChatClient, OpenAIChatOptions
"""
import json
import logging
import os
import re
from pathlib import Path

from agent_framework import Agent
from agent_framework.openai import OpenAIChatClient, OpenAIChatOptions

logger = logging.getLogger(__name__)

_KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"


def load_knowledge(agent_name: str) -> str:
    """Lataa agentin knowledge-tiedoston (knowledge/<agent_name>.md).

    Palauttaa tiedoston sisällön merkkijonona tai tyhjän merkkijonon
    jos tiedostoa ei löydy. Knowledge-tiedostot sisältävät domain-
    spesifisen logiikan ja ovat asiakaskohtaisesti muokattavissa.
    """
    path = _KNOWLEDGE_DIR / f"{agent_name}.md"
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    logger.warning("load_knowledge: tiedostoa ei löydy: %s", path)
    return ""


def build_agent(name: str, instructions: str) -> Agent:
    """Rakentaa Agent Frameworkin Agent-olion OpenAI-providerilla."""
    client = OpenAIChatClient(
        model_id=os.environ.get("OPENAI_MODEL", "gpt-5-nano"),
        api_key=os.environ["OPENAI_API_KEY"],
    )
    return client.as_agent(
        name=name,
        instructions=instructions,
    )


# Luokittelu- ja analyysitehtävät eivät tarvitse luovuutta — matala temperature
# tuottaa johdonmukaisemman ja nopeamman vastauksen.
_analysis_options = OpenAIChatOptions(  # pylint: disable=invalid-name
    temperature=0.1,
    response_format={"type": "json_object"},
)

# RewriteAgent tarvitsee hieman enemmän vaihtelua luontevampaa tekstiä varten.
_creative_options = OpenAIChatOptions(  # pylint: disable=invalid-name
    temperature=0.4,
    response_format={"type": "json_object"},
)

# Oletusrajat turhan generoinnin estämiseksi. max_tokens ei ole options-objektissa
# koska se pitää voida yliajaa per-agentti ilman duplikaattiargumenttivirheitä.
_DEFAULT_MAX_TOKENS = {
    "analysis": 2000,
    "creative": 3000,
}


async def run_agent(
    agent: Agent,
    prompt: str,
    *,
    creative: bool = False,
    max_tokens: int | None = None,
) -> str:
    """Suorittaa agentin ja palauttaa tekstimuotoisen JSON-vastauksen.

    Args:
        creative:   True käyttää korkeampaa temperaturea (RewriteAgent).
        max_tokens: Yliajaa oletusrajan. Käytä pienempää arvoa lyhyttä vastausta
                    tuottaville agenteille (Classifier, Summary).
    """
    opts = _creative_options if creative else _analysis_options
    key = "creative" if creative else "analysis"
    tokens = max_tokens if max_tokens is not None else _DEFAULT_MAX_TOKENS[key]

    logger.debug(
        "\n┌─ %s → agent.run() ─────────────────────────────\n"
        "│ temperature: %s  max_tokens: %d\n"
        "│ prompt:\n%s\n"
        "└────────────────────────────────────────────────",
        getattr(agent, "name", "agent"),
        0.4 if creative else 0.1,
        tokens,
        "\n".join(f"│   {line}" for line in prompt.splitlines()),
    )

    response = await agent.run(prompt, **opts, max_tokens=tokens)
    raw = response.text or "{}"

    logger.debug(
        "\n┌─ %s ← vastaus ──────────────────────────────────\n│ %s\n"
        "└────────────────────────────────────────────────",
        getattr(agent, "name", "agent"),
        raw[:500] + ("…" if len(raw) > 500 else ""),
    )

    return raw


def parse_json(raw: str) -> dict:
    """
    Parsii agentin palauttaman JSON-merkkijonon.

    Yrittää ensin suoraa json.loads-kutsua. Jos epäonnistuu, etsii
    markdown-koodilohkon (```json ... ```) ja yrittää sen sisältöä.
    Molempien epäonnistuessa palauttaa tyhjän dictin ja kirjaa varoituksen.
    """
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"```(?:json)?\s*([\s\S]+?)```", raw)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        logger.warning("parse_json: could not parse agent response: %.200s", raw)
        return {}
