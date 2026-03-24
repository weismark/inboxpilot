'use client'

import { useState } from 'react'
import type { ConversationMessage } from '@/lib/api'
import styles from './ConversationPanel.module.css'

const DRAFT_PREVIEW_LENGTH = 120

interface ConversationPanelProps {
  messages: ConversationMessage[]
  isLive?: boolean
}

export default function ConversationPanel({ messages, isLive = false }: ConversationPanelProps) {
  const [panelExpanded, setPanelExpanded] = useState(true)
  const [expandedDrafts, setExpandedDrafts] = useState<Set<number>>(new Set())

  if (messages.length === 0) return null

  const turns = Math.max(...messages.map(m => m.turn))
  const approved = messages.find(m => m.agent === 'ReviewAgent' && m.approved === true)

  const toggleDraft = (i: number) => {
    setExpandedDrafts(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className={styles.panel}>
      <button
        className={styles.header}
        onClick={() => setPanelExpanded(e => !e)}
        aria-expanded={panelExpanded}
      >
        <div className={styles.headerLeft}>
          <div className={styles.headerTitles}>
            <div className={styles.headerAgents}>
              <span className={styles.agentChipDraft}>DraftAgent</span>
              <span className={styles.agentArrow}>↔</span>
              <span className={styles.agentChipReview}>ReviewAgent</span>
              {isLive && <span className={styles.liveDot} />}
            </div>
            <span className={styles.headerSub}>Vastauksen kirjoitus ja tarkistus</span>
          </div>
          <span className={styles.meta}>
            {turns} {turns === 1 ? 'kierros' : 'kierrosta'}
            {approved ? ' · ✓ Hyväksytty' : ''}
          </span>
        </div>
        <span className={`${styles.chevron} ${panelExpanded ? styles.chevronUp : ''}`}>▾</span>
      </button>

      {panelExpanded && (
        <div className={styles.body}>
          {messages.map((msg, i) => {
            const isDraft = msg.agent === 'DraftAgent'
            const isReview = msg.agent === 'ReviewAgent'
            const draftExpanded = expandedDrafts.has(i)
            const needsTruncation = msg.content.length > DRAFT_PREVIEW_LENGTH
            const displayContent = needsTruncation && !draftExpanded
              ? msg.content.slice(0, DRAFT_PREVIEW_LENGTH).trimEnd() + '…'
              : msg.content

            return (
              <div key={i} className={`${styles.message} ${isDraft ? styles.draft : styles.review}`}>
                <div className={styles.msgHeader}>
                  <span className={styles.agentName}>{msg.agent}</span>
                  <span className={styles.turnLabel}>Kierros {msg.turn}</span>
                  {isReview && msg.approved !== null && (
                    <span className={msg.approved ? styles.approved : styles.rejected}>
                      {msg.approved ? '✓ Hyväksytty' : '✗ Ei hyväksytty'}
                    </span>
                  )}
                </div>

                {/* ReviewAgent: palaute ensin, näkyvin elementti */}
                {isReview && msg.feedback && (
                  <div className={styles.feedback}>
                    <span className={styles.feedbackLabel}>Palaute DraftAgentille</span>
                    <span className={styles.feedbackText}>{msg.feedback}</span>
                  </div>
                )}

                {/* Luonnosteksti kutistettuna */}
                <div className={styles.draftSection}>
                  <span className={styles.draftLabel}>
                    {isDraft ? 'Luonnos' : 'Tarkistettu versio'}
                  </span>
                  <p className={styles.content}>{displayContent}</p>
                  {needsTruncation && (
                    <button
                      className={styles.expandBtn}
                      onClick={() => toggleDraft(i)}
                      type="button"
                    >
                      {draftExpanded ? '▲ Pienennä' : `▼ Näytä koko (${msg.content.length} merkkiä)`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {isLive && (
            <div className={styles.typingRow}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
