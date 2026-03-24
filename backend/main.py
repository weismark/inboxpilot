"""InboxPilot — FastAPI-sovelluksen käynnistyspiste.

Tarkistaa ympäristömuuttujat käynnistyksen yhteydessä, konfiguroi
CORS-politiikan, rate limiting -käsittelyn ja rekisteröi API-reitittimen.
"""

import logging
import os

from dotenv import load_dotenv

# Ladataan .env ennen muita importeja, jotta ympäristömuuttujat ovat käytössä
load_dotenv(override=True)

from fastapi import FastAPI  # noqa: E402  # pylint: disable=wrong-import-position
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402  # pylint: disable=wrong-import-position
from slowapi import _rate_limit_exceeded_handler  # noqa: E402  # pylint: disable=wrong-import-position
from slowapi.errors import RateLimitExceeded  # noqa: E402  # pylint: disable=wrong-import-position

from limiter import limiter  # noqa: E402  # pylint: disable=wrong-import-position
from routers.analyze import router as analyze_router  # noqa: E402  # pylint: disable=wrong-import-position

# ── Käynnistysvalidointi ───────────────────────────────────────────────────────

_REQUIRED_ENV_VARS = ["OPENAI_API_KEY"]

for _var in _REQUIRED_ENV_VARS:
    if not os.environ.get(_var):
        raise RuntimeError(
            f"Pakollinen ympäristömuuttuja '{_var}' puuttuu. "
            "Kopioi backend/.env.example tiedostoksi backend/.env "
            "ja täytä tarvittavat arvot."
        )

logging.basicConfig(
    level=logging.DEBUG if os.environ.get("DEBUG") else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

# ── Sovellus ───────────────────────────────────────────────────────────────────

app = FastAPI(
    title="InboxPilot API",
    description="Kiinteistöyhtiön sähköpostiviestien multi-agent-analyysi",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────

# Sallitut originit luetaan ympäristömuuttujasta pilkulla erotettuna listana.
# Oletuksena sallitaan vain lokaali kehitysympäristö.
_allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# ── Reititys ───────────────────────────────────────────────────────────────────

app.include_router(analyze_router, prefix="/inboxpilot")


@app.get("/inboxpilot/api/health")
async def health() -> dict[str, str]:
    """Terveystarkistuspiste — kertoo että API on käynnissä."""
    return {"status": "ok"}
