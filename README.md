# InboxPilot

**InboxPilot** is a multi-agent AI application that analyses incoming emails for a property management company. It classifies messages, evaluates urgency, routes them to the right team, and drafts a response — all in real time.

Built as a portfolio project to demonstrate practical use of the **Microsoft Agent Framework** in a realistic business scenario.

---

## What it does

When an email is submitted, five AI agents work through it in a structured pipeline:

```
Email input
    │
    ▼
[1] CategoryAgent       — classifies message type (fault report / inquiry / complaint / …)
    │
    ├──────────────────────────────────┐
    ▼                                  ▼
[2a] UrgencyAgent       [2b] RoutingAgent        (run in parallel)
    │  urgency score         │  assigns team
    └──────────────────────────────────┘
                   │
                   ▼
[3] DraftAgent          — writes a draft response
                   │
                   ▼
[4] ReviewAgent         — reviews and approves the draft
         │
         └── if rejected: sends feedback back to DraftAgent (reflection loop)
```

Results stream to the browser in real time via **Server-Sent Events** — the user sees each agent's output as it arrives, including the DraftAgent ↔ ReviewAgent conversation.

---

## Why Microsoft Agent Framework

This project was built specifically to demonstrate **Microsoft Agent Framework** (`agent-framework-core`) as an alternative to LangChain/CrewAI:

- Each agent is built with `OpenAIChatClient.as_agent()` — a single, consistent interface
- The DraftAgent ↔ ReviewAgent **reflection loop** shows dynamic multi-turn agent dialogue, not just sequential task execution
- Agent knowledge (domain rules, tone guidelines, routing criteria) is stored in **per-agent Markdown files** under `backend/knowledge/`, separating configuration from code
- Structured JSON output enforced via `response_format: json_object` + Pydantic validation

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| AI agents | Microsoft Agent Framework (`agent-framework-core`) + OpenAI `gpt-5-nano` |
| Backend | Python 3.12, FastAPI, Pydantic v2, slowapi |
| Streaming | Server-Sent Events (`StreamingResponse`) |
| Frontend | Next.js 15 (App Router), TypeScript, CSS Modules |
| State | React Context (persists across navigation) |

---

## Project structure

```
inboxpilot/
├── backend/
│   ├── agents/
│   │   ├── base.py              # MAF agent builder + shared run_agent()
│   │   ├── orchestrator.py      # Pipeline coordinator + SSE streaming
│   │   ├── category_agent.py
│   │   ├── urgency_agent.py
│   │   ├── routing_agent.py
│   │   ├── draft_agent.py
│   │   ├── review_agent.py
│   │   └── response_models.py   # Pydantic models for agent JSON output
│   ├── knowledge/               # Per-agent domain knowledge (Markdown)
│   │   ├── category_agent.md
│   │   ├── urgency_agent.md
│   │   ├── routing_agent.md
│   │   ├── draft_agent.md
│   │   └── review_agent.md
│   ├── models/
│   │   └── schemas.py           # API request/response schemas
│   ├── routers/
│   │   └── analyze.py           # API endpoints
│   ├── main.py
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── page.tsx             # Main analysis page
    │   └── how-it-works/        # Architecture explanation page
    ├── components/
    │   ├── InputPanel/
    │   ├── AgentProgress/       # Real-time agent status indicators
    │   ├── LiveResults/         # Partial results as agents complete
    │   ├── ConversationPanel/   # DraftAgent ↔ ReviewAgent dialogue
    │   ├── ResultPanel/
    │   └── AgentTrace/          # Full execution trace (collapsible)
    └── lib/
        ├── api.ts               # Fetch + SSE stream reader
        ├── AnalysisContext.tsx  # Global state (persists on navigation)
        └── categories.ts        # Finnish label mappings
```

---

## Running locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — add your OPENAI_API_KEY

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# .env.local is pre-configured for local development
npm run dev
```

Open [http://localhost:3000/inboxpilot](http://localhost:3000/inboxpilot).

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required) | — |
| `OPENAI_MODEL` | Model to use | `gpt-5-nano` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |
| `DEBUG` | Enable debug logging | — |

---

## Notes

- This is a **demo application** — in a real deployment, emails would be fetched automatically from a mailbox, not submitted manually.
- The `knowledge/` directory is designed to be **customer-configurable**: domain rules, tone guidelines, and routing criteria can be updated without touching code.
- Rate limiting is set to 5 requests/minute on analysis endpoints.
