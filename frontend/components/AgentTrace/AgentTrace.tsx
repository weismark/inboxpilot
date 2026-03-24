'use client'

import { useState } from 'react'
import type { AgentTraceEntry } from '@/lib/api'
import styles from './AgentTrace.module.css'

interface AgentTraceProps {
  entries: AgentTraceEntry[]
}

function summarizeOutput(agent: string, output: Record<string, unknown>): string {
  switch (agent) {
    case 'CategoryAgent':
      return `kategoria: "${output.category}", kieli: ${output.language ?? '?'}`
    case 'UrgencyAgent':
      return `kiireellisyys: "${output.urgency}", pisteet: ${output.urgency_score}/10`
    case 'RoutingAgent':
      return `tiimi: "${output.team}"${output.escalate ? ' · ohjataan johdolle' : ''}`
    case 'DraftAgent':
      return `sävy: "${output.tone}", luonnos: ${String(output.draft ?? '').slice(0, 60)}…`
    case 'ReviewAgent':
      return `hyväksytty: ${output.approved ? 'kyllä' : 'ei'}, muutoksia: ${(output.changes as unknown[])?.length ?? 0} kpl`
    default:
      return JSON.stringify(output).slice(0, 80)
  }
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`
}

export default function AgentTrace({ entries }: AgentTraceProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.toggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>Agenttiloki</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▼</span>
      </button>

      {open && (
        <div className={styles.content}>
          {entries.map((entry, i) => (
            <div key={i} className={styles.entry}>
              <div
                className={`${styles.statusIcon} ${
                  entry.skipped ? styles.iconSkipped : styles.iconSuccess
                }`}
              >
                {entry.skipped ? '⊘' : '✓'}
              </div>
              <div className={styles.entryBody}>
                <div className={styles.entryHeader}>
                  <span className={styles.agentName}>{entry.agent}</span>
                  {entry.duration_ms != null && (
                    <span className={styles.duration}>{formatDuration(entry.duration_ms)}</span>
                  )}
                </div>
                {entry.skipped ? (
                  <div className={styles.skippedReason}>ohitettu</div>
                ) : (
                  <div className={styles.entryDetail}>
                    {summarizeOutput(entry.agent, entry.output)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
