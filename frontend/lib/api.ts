// Dev:  NEXT_PUBLIC_API_URL=http://localhost:8000  → http://localhost:8000/inboxpilot/api
// Prod: NEXT_PUBLIC_API_URL=                       → /inboxpilot/api  (sama domain, reverse proxy)
const API = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/inboxpilot/api`

// ── Tyypit ────────────────────────────────────────────────────────────────────

export interface CategoryResult {
  category: string
  category_notes: string
  language: string
}

export interface UrgencyResult {
  urgency: string
  urgency_score: number
  reasoning: string
  suggested_response_time: string
}

export interface RoutingResult {
  team: string
  reason: string
  escalate: boolean
  escalation_reason: string | null
}

export interface DraftResult {
  draft: string
  tone: string
  key_points_addressed: string[]
}

export interface ReviewResult {
  approved: boolean
  revised_draft: string
  changes: string[]
  warnings: string[]
}

export interface AgentTraceEntry {
  agent: string
  output: Record<string, unknown>
  duration_ms: number
  skipped: boolean
}

export interface ConversationMessage {
  agent: string
  content: string
  turn: number
  approved: boolean | null
  feedback: string | null
}

export interface AnalyzeResponse {
  category: CategoryResult
  urgency: UrgencyResult
  routing: RoutingResult
  draft: DraftResult
  review: ReviewResult
  conversation: ConversationMessage[]
  agent_trace: AgentTraceEntry[]
  processing_time_ms: number
}

export interface SampleMessage {
  id: string
  title: string
  preview: string
  message: string
  subject: string
}

// ── SSE streaming ────────────────────────────────────────────────────────────

export interface AgentEvent {
  type: 'agent_start' | 'agent_done' | 'conversation_message' | 'done' | 'error'
  agent?: string
  duration_ms?: number
  agent_result?: Record<string, unknown>
  content?: string
  turn?: number
  approved?: boolean | null
  feedback?: string | null
  result?: AnalyzeResponse
  message?: string
}

export async function analyzeMessageStream(
  message: string,
  subject: string | undefined,
  onEvent: (event: AgentEvent) => void,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${API}/analyze/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, subject: subject || undefined }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: AnalyzeResponse | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        const line = part.trim()
        if (line.startsWith('data: ')) {
          const event = JSON.parse(line.slice(6)) as AgentEvent
          onEvent(event)
          if (event.type === 'done' && event.result) finalResult = event.result
          if (event.type === 'error') throw new Error(event.message ?? 'Tuntematon virhe')
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (!finalResult) throw new Error('Virta päättyi ilman tulosta')
  return finalResult
}

// ── API-kutsut ────────────────────────────────────────────────────────────────

export async function analyzeMessage(
  message: string,
  subject?: string,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${API}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, subject: subject || undefined }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<AnalyzeResponse>
}

export async function fetchSamples(): Promise<SampleMessage[]> {
  const res = await fetch(`${API}/samples`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as { samples: SampleMessage[] }
  return data.samples
}
