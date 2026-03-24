"""Orchestrator — koordinoi InboxPilot-agenttipipelinen suorituksen.

Pipeline:
  1. CategoryAgent
  2. UrgencyAgent + RoutingAgent (asyncio.gather — rinnakkain)
  3. DraftAgent ↔ ReviewAgent (reflection loop, max 2 kierrosta)
"""

import asyncio
import json
import logging
import time
from collections.abc import AsyncGenerator

from models.schemas import (
    AgentTraceEntry,
    AnalyzeResponse,
    CategoryResult,
    ConversationTurn,
    DraftResult,
    ReviewResult,
    RoutingResult,
    UrgencyResult,
)

from .category_agent import run_category_agent
from .draft_agent import run_draft_agent
from .response_models import (
    CategoryAgentResponse,
    DraftAgentResponse,
    ReviewAgentResponse,
    RoutingAgentResponse,
    UrgencyAgentResponse,
)
from .review_agent import run_review_agent
from .routing_agent import run_routing_agent
from .urgency_agent import run_urgency_agent

logger = logging.getLogger(__name__)

MAX_CONVERSATION_TURNS = 2


def _sse(data: dict) -> str:
    """Muotoilee dict-olion SSE-tapahtumaksi."""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _build_response(  # pylint: disable=too-many-positional-arguments
    category_result: CategoryAgentResponse,
    urgency_result: UrgencyAgentResponse,
    routing_result: RoutingAgentResponse,
    draft_result: DraftAgentResponse,
    review_result: ReviewAgentResponse,
    conversation: list[ConversationTurn],
    trace: list[AgentTraceEntry],
    pipeline_start: float,
) -> AnalyzeResponse:
    """Kokoaa agenttien tulokset yhdeksi AnalyzeResponse-olioksi."""
    review_data = {k: v for k, v in review_result.model_dump().items() if k != "feedback_for_draft"}
    return AnalyzeResponse(
        category=CategoryResult(**category_result.model_dump()),
        urgency=UrgencyResult(**urgency_result.model_dump()),
        routing=RoutingResult(**routing_result.model_dump()),
        draft=DraftResult(**draft_result.model_dump()),
        review=ReviewResult(**review_data),
        conversation=conversation,
        agent_trace=trace,
        processing_time_ms=int((time.perf_counter() - pipeline_start) * 1000),
    )


async def stream_pipeline(message: str, subject: str | None) -> AsyncGenerator[str, None]:
    """Suorittaa pipelinen ja yieldaa SSE-tapahtumat reaaliajassa."""
    pipeline_start = time.perf_counter()
    trace: list[AgentTraceEntry] = []
    conversation: list[ConversationTurn] = []

    try:
        # 1. CategoryAgent
        yield _sse({"type": "agent_start", "agent": "CategoryAgent"})
        t0 = time.perf_counter()
        category_result: CategoryAgentResponse = await run_category_agent(message, subject)
        duration = int((time.perf_counter() - t0) * 1000)
        trace.append(AgentTraceEntry(
            agent="CategoryAgent", output=category_result.model_dump(), duration_ms=duration
        ))
        yield _sse({"type": "agent_done", "agent": "CategoryAgent", "duration_ms": duration,
                    "agent_result": category_result.model_dump()})

        # 2. UrgencyAgent + RoutingAgent rinnakkain
        yield _sse({"type": "agent_start", "agent": "UrgencyAgent"})
        yield _sse({"type": "agent_start", "agent": "RoutingAgent"})
        t0 = time.perf_counter()
        urgency_result: UrgencyAgentResponse
        routing_result: RoutingAgentResponse
        urgency_result, routing_result = await asyncio.gather(
            run_urgency_agent(message, subject, category_result.category),
            run_routing_agent(message, subject, category_result.category, "normaali"),
        )
        duration = int((time.perf_counter() - t0) * 1000)
        trace.append(AgentTraceEntry(
            agent="UrgencyAgent", output=urgency_result.model_dump(), duration_ms=duration
        ))
        trace.append(AgentTraceEntry(
            agent="RoutingAgent", output=routing_result.model_dump(), duration_ms=duration
        ))
        yield _sse({"type": "agent_done", "agent": "UrgencyAgent", "duration_ms": duration,
                    "agent_result": urgency_result.model_dump()})
        yield _sse({"type": "agent_done", "agent": "RoutingAgent", "duration_ms": duration,
                    "agent_result": routing_result.model_dump()})

        # 3. DraftAgent ↔ ReviewAgent — reflection loop
        yield _sse({"type": "agent_start", "agent": "DraftAgent"})

        draft_result: DraftAgentResponse = DraftAgentResponse()
        review_result: ReviewAgentResponse = ReviewAgentResponse()
        previous_draft: str | None = None
        review_feedback: str | None = None
        draft_total_ms = 0
        review_total_ms = 0

        for turn_num in range(1, MAX_CONVERSATION_TURNS + 1):
            # DraftAgent kirjoittaa tai korjaa
            t0 = time.perf_counter()
            draft_result = await run_draft_agent(
                message, subject,
                category_result.category, urgency_result.urgency, routing_result.team,
                previous_draft=previous_draft,
                review_feedback=review_feedback,
            )
            draft_ms = int((time.perf_counter() - t0) * 1000)
            draft_total_ms += draft_ms

            conv_draft = ConversationTurn(
                agent="DraftAgent",
                content=draft_result.draft,
                turn=turn_num,
            )
            conversation.append(conv_draft)
            yield _sse({
                "type": "conversation_message",
                "agent": "DraftAgent",
                "content": draft_result.draft,
                "turn": turn_num,
                "approved": None,
                "feedback": None,
            })

            # ReviewAgent tarkistaa
            yield _sse({"type": "agent_start", "agent": "ReviewAgent"})
            t0 = time.perf_counter()
            review_result = await run_review_agent(
                draft_result.draft,
                category_result.category,
                urgency_result.urgency,
                turn=turn_num,
            )
            review_ms = int((time.perf_counter() - t0) * 1000)
            review_total_ms += review_ms

            conv_review = ConversationTurn(
                agent="ReviewAgent",
                content=review_result.revised_draft,
                turn=turn_num,
                approved=review_result.approved,
                feedback=review_result.feedback_for_draft,
            )
            conversation.append(conv_review)
            yield _sse({
                "type": "conversation_message",
                "agent": "ReviewAgent",
                "content": review_result.revised_draft,
                "turn": turn_num,
                "approved": review_result.approved,
                "feedback": review_result.feedback_for_draft,
            })

            no_feedback = not review_result.feedback_for_draft
            if review_result.approved or no_feedback or turn_num == MAX_CONVERSATION_TURNS:
                break

            # Valmistele seuraava kierros
            previous_draft = draft_result.draft
            review_feedback = review_result.feedback_for_draft
            yield _sse({"type": "agent_start", "agent": "DraftAgent"})

        trace.append(AgentTraceEntry(
            agent="DraftAgent", output=draft_result.model_dump(), duration_ms=draft_total_ms
        ))
        trace.append(AgentTraceEntry(
            agent="ReviewAgent", output=review_result.model_dump(), duration_ms=review_total_ms
        ))
        yield _sse({"type": "agent_done", "agent": "DraftAgent", "duration_ms": draft_total_ms})
        yield _sse({"type": "agent_done", "agent": "ReviewAgent", "duration_ms": review_total_ms})

        response = _build_response(
            category_result, urgency_result, routing_result, draft_result, review_result,
            conversation, trace, pipeline_start,
        )
        yield _sse({"type": "done", "result": response.model_dump()})

    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.exception("stream_pipeline error: %s", exc)
        yield _sse({"type": "error", "message": str(exc)})


async def run_pipeline(message: str, subject: str | None) -> AnalyzeResponse:
    """Suorittaa koko agenttipipelinen (ei-streaming) ja palauttaa AnalyzeResponse-olion."""
    pipeline_start = time.perf_counter()
    trace: list[AgentTraceEntry] = []
    conversation: list[ConversationTurn] = []

    t0 = time.perf_counter()
    category_result: CategoryAgentResponse = await run_category_agent(message, subject)
    trace.append(AgentTraceEntry(agent="CategoryAgent", output=category_result.model_dump(),
                                 duration_ms=int((time.perf_counter() - t0) * 1000)))

    t0 = time.perf_counter()
    urgency_result: UrgencyAgentResponse
    routing_result: RoutingAgentResponse
    urgency_result, routing_result = await asyncio.gather(
        run_urgency_agent(message, subject, category_result.category),
        run_routing_agent(message, subject, category_result.category, "normaali"),
    )
    parallel_ms = int((time.perf_counter() - t0) * 1000)
    trace.append(AgentTraceEntry(
        agent="UrgencyAgent", output=urgency_result.model_dump(), duration_ms=parallel_ms
    ))
    trace.append(AgentTraceEntry(
        agent="RoutingAgent", output=routing_result.model_dump(), duration_ms=parallel_ms
    ))

    draft_result: DraftAgentResponse = DraftAgentResponse()
    review_result: ReviewAgentResponse = ReviewAgentResponse()
    previous_draft: str | None = None
    review_feedback: str | None = None

    for turn_num in range(1, MAX_CONVERSATION_TURNS + 1):
        t0 = time.perf_counter()
        draft_result = await run_draft_agent(
            message, subject, category_result.category, urgency_result.urgency, routing_result.team,
            previous_draft=previous_draft, review_feedback=review_feedback,
        )
        conversation.append(ConversationTurn(
            agent="DraftAgent", content=draft_result.draft, turn=turn_num
        ))

        review_result = await run_review_agent(
            draft_result.draft, category_result.category, urgency_result.urgency, turn=turn_num,
        )
        conversation.append(ConversationTurn(
            agent="ReviewAgent", content=review_result.revised_draft, turn=turn_num,
            approved=review_result.approved, feedback=review_result.feedback_for_draft,
        ))
        turn_ms = int((time.perf_counter() - t0) * 1000)

        no_feedback = not review_result.feedback_for_draft
        if review_result.approved or no_feedback or turn_num == MAX_CONVERSATION_TURNS:
            trace.append(AgentTraceEntry(
                agent="DraftAgent", output=draft_result.model_dump(), duration_ms=turn_ms
            ))
            trace.append(AgentTraceEntry(
                agent="ReviewAgent", output=review_result.model_dump(), duration_ms=turn_ms
            ))
            break

        previous_draft = draft_result.draft
        review_feedback = review_result.feedback_for_draft

    return _build_response(
        category_result, urgency_result, routing_result, draft_result, review_result,
        conversation, trace, pipeline_start,
    )
