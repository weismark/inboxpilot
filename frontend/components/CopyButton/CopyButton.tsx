'use client'

import { useState } from 'react'
import type { AnalyzeResponse } from '@/lib/api'
import { categoryLabel, urgencyLabel, teamLabel } from '@/lib/categories'
import styles from './CopyButton.module.css'

interface CopyButtonProps {
  result: AnalyzeResponse
}

function formatAnalysis(result: AnalyzeResponse): string {
  const { category, urgency, routing, review, processing_time_ms } = result
  const lines: string[] = []
  const sep = '─'.repeat(40)

  lines.push('INBOXPILOT — ANALYYSI')
  lines.push(sep)

  lines.push(`KATEGORIA: ${categoryLabel(category.category)}`)
  if (category.category_notes) lines.push(category.category_notes)

  lines.push('')
  lines.push(`KIIREELLISYYS: ${urgencyLabel(urgency.urgency)} (${urgency.urgency_score}/10)`)
  lines.push(urgency.reasoning)
  lines.push(`Ehdotettu vasteaika: ${urgency.suggested_response_time}`)

  lines.push('')
  lines.push(`TIIMIOHJAUS: ${teamLabel(routing.team)}`)
  lines.push(routing.reason)
  if (routing.escalate && routing.escalation_reason) {
    lines.push(`JOHDON KÄSITELTÄVÄ: ${routing.escalation_reason}`)
  }

  lines.push('')
  lines.push('VASTAUSLUONNOS')
  lines.push(review.revised_draft)

  if (review.changes.length > 0) {
    lines.push('')
    lines.push('Muutokset:')
    review.changes.forEach(c => lines.push(`› ${c}`))
  }

  if (review.warnings.length > 0) {
    lines.push('')
    lines.push('Varoitukset:')
    review.warnings.forEach(w => lines.push(`⚠ ${w}`))
  }

  lines.push('')
  const timeStr = processing_time_ms < 1000
    ? `${processing_time_ms} ms`
    : `${(processing_time_ms / 1000).toFixed(1)} s`
  lines.push(sep)
  lines.push(`Käsittelyaika: ${timeStr} · Luotu InboxPilotilla`)

  return lines.join('\n')
}

export default function CopyButton({ result }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatAnalysis(result))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      className={`${styles.btn} ${copied ? styles.btnCopied : ''}`}
      onClick={handleCopy}
    >
      {copied ? '✓ Kopioitu' : 'Kopioi analyysi'}
    </button>
  )
}
