"""API-endpointit sähköpostiviestien analysointiin."""

# request-parametri on pakollinen slowapi-rate-limiter-dekoraattorille,
# mutta ei käytetä suoraan endpoint-funktion rungossa.
# pylint: disable=unused-argument

import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from agents.orchestrator import run_pipeline, stream_pipeline
from limiter import limiter
from models.schemas import AnalyzeRequest, AnalyzeResponse, SampleMessage, SamplesResponse

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Esimerkkiviestit ──────────────────────────────────────────────────────────

SAMPLES: list[SampleMessage] = [
    SampleMessage(
        id="sample_1",
        title="Vikailmoitus — vuotava hana",
        preview="Huoneistossani 14B vuotaa...",
        message=(
            "Hei,\n\nHuoneistossani 14B vuotaa kylpyhuoneen hana jo kolmatta päivää. "
            "Vettä valuu jatkuvasti ja pelkään että vesilasku kasvaa suureksi. "
            "Voitteko lähettää huoltomiehen mahdollisimman pian?\n\n"
            "Ystävällisin terveisin,\nMatti Virtanen"
        ),
        subject="Vuotava hana huoneisto 14B",
    ),
    SampleMessage(
        id="sample_2",
        title="Tiedustelu — parkkipaikka",
        preview="Onko teillä vapaita parkkipaikkoja...",
        message=(
            "Hei,\n\nMuutan ensi kuussa taloon ja haluaisin tiedustella "
            "onko teillä vapaita parkkipaikkoja vuokrattavana. "
            "Mikä on kuukausihinta ja miten varaus tehdään?\n\nTerveisin,\nSaara Korhonen"
        ),
        subject="Parkkipaikan varaus",
    ),
    SampleMessage(
        id="sample_3",
        title="Reklamaatio — korjaus tehty väärin",
        preview="Viime viikolla teetetty korjaus...",
        message=(
            "Hei,\n\nViime viikolla tilaamamme parkettiremontti huoneistossa 7A on tehty "
            "huonosti. Laudat natisevat ja yhdessä kohdassa on selkeä rako. "
            "Vaadin että tämä korjataan viipymättä ja ilman lisäkustannuksia. "
            "Olen erittäin tyytymätön saamaani palveluun.\n\nPetri Leinonen"
        ),
        subject="Reklamaatio parkettiremontti 7A",
    ),
    SampleMessage(
        id="sample_4",
        title="Häiriöilmoitus — meluhaitat naapurista",
        preview="Yläkerran naapuri aiheuttaa jatkuvaa melua...",
        message=(
            "Hei,\n\nYläkerran naapuri huoneistossa 22C aiheuttaa toistuvaa häiriötä öisin. "
            "Ovien paiskominen ja kova musiikki häiritsevät unta lähes joka yö kello 23 jälkeen. "
            "Olen yrittänyt puhua naapurille suoraan kahdesti, mutta tilanne ei ole muuttunut. "
            "Pyydän teitä puuttumaan asiaan virallisesti.\n\n"
            "Ystävällisin terveisin,\nAnna Mäkinen, huoneisto 20C"
        ),
        subject="Häiriöilmoitus — huoneisto 22C",
    ),
    SampleMessage(
        id="sample_5",
        title="Muuttoilmoitus — sopimuksen irtisanominen",
        preview="Haluan irtisanoa vuokrasopimukseni...",
        message=(
            "Hei,\n\nHaluan irtisanoa vuokrasopimukseni huoneistosta 5B. "
            "Suunniteltu muuttopäivä on ensi kuun viimeinen päivä. "
            "Voisitteko kertoa miten irtisanominen tehdään virallisesti, "
            "milloin avaimet tulee palauttaa ja tarvitseeko huoneistosta tehdä "
            "jokin loppukatselmus ennen lähtöä?\n\nTerveisin,\nJuha Nieminen"
        ),
        subject="Vuokrasopimuksen irtisanominen 5B",
    ),
]

# ── Endpointit ────────────────────────────────────────────────────────────────


@router.post("/api/analyze/stream")
@limiter.limit("5/minute")
async def analyze_stream(request: Request, body: AnalyzeRequest) -> StreamingResponse:
    """Analysoi sähköpostiviesti ja streamaa agenttitapahtumat SSE-muodossa."""
    logger.info("analyze_stream: message_len=%d", len(body.message))
    return StreamingResponse(
        stream_pipeline(body.message, body.subject),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/api/analyze", response_model=AnalyzeResponse)
@limiter.limit("5/minute")
async def analyze(request: Request, body: AnalyzeRequest) -> AnalyzeResponse:
    """Analysoi sähköpostiviesti agenttipipelinen läpi (ei-streaming)."""
    logger.info("analyze: message_len=%d", len(body.message))
    try:
        return await run_pipeline(body.message, body.subject)
    except ValidationError as exc:
        logger.error("Pipeline validation error: %s", exc)
        raise HTTPException(
            status_code=422, detail="Pipeline tuotti virheellisen vastauksen."
        ) from exc
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.exception("Pipeline error: %s", exc)
        raise HTTPException(
            status_code=500, detail="Analyysi epäonnistui. Yritä uudelleen."
        ) from exc


@router.get("/api/samples", response_model=SamplesResponse)
@limiter.limit("10/minute")
async def samples(request: Request) -> SamplesResponse:
    """Palauttaa kolme valmista esimerkkiviestiä."""
    return SamplesResponse(samples=SAMPLES)
