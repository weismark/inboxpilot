import type { AnalyzeResponse, ConversationMessage } from '@/lib/api'
import { categoryLabel, urgencyLabel, teamLabel, toneLabel } from '@/lib/categories'
import AgentTrace from '@/components/AgentTrace/AgentTrace'
import CopyButton from '@/components/CopyButton/CopyButton'
import ConversationPanel from '@/components/ConversationPanel/ConversationPanel'
import styles from './ResultPanel.module.css'

interface ResultPanelProps {
  result: AnalyzeResponse | null
  originalMessage?: string
  originalSubject?: string
  conversation?: ConversationMessage[]
}

function urgencyBadgeClass(urgency: string): string {
  if (urgency === 'kiireellinen') return styles.badgeKiireellinen
  if (urgency === 'ei_kiireellinen') return styles.badgeEiKiireellinen
  return styles.badgeNormaali
}

function formatProcessingTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export default function ResultPanel({ result, originalMessage, originalSubject, conversation = [] }: ResultPanelProps) {
  if (!result) {
    return (
      <div className={styles.placeholder}>
        Analyysin tulos näkyy tässä
      </div>
    )
  }

  const { category, urgency, routing, draft, review, agent_trace, processing_time_ms } = result
  const hasChanges = review.changes.length > 0
  const hasWarnings = review.warnings.length > 0

  return (
    <div className={styles.panel}>

      {/* 0. Alkuperäinen viesti */}
      {originalMessage && (
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Analysoitu viesti</div>
          {originalSubject && (
            <p className={styles.originalSubject}>Aihe: {originalSubject}</p>
          )}
          <p className={styles.originalMessage}>{originalMessage}</p>
        </div>
      )}


      {/* 1. Luokittelu */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Luokittelu</div>
        <div className={styles.row}>
          <span className={`${styles.badge} ${styles.badgeCategory}`}>
            {categoryLabel(category.category)}
          </span>
          <span className={styles.confidence}>
            {category.language.toUpperCase()}
          </span>
        </div>
        {category.category_notes && (
          <p className={styles.notes}>{category.category_notes}</p>
        )}
      </div>

      {/* 2. Kiireellisyys */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Kiireellisyys</div>
        <div className={styles.row}>
          <span className={`${styles.badge} ${urgencyBadgeClass(urgency.urgency)}`}>
            {urgencyLabel(urgency.urgency)}
          </span>
          <span className={styles.score}>{urgency.urgency_score}/10</span>
        </div>
        <p className={styles.notes}>{urgency.reasoning}</p>
        <p className={styles.responseTime}>
          <span className={styles.responseTimeLabel}>Ehdotettu vasteaika: </span>
          {urgency.suggested_response_time}
        </p>
      </div>

      {/* 3. Tiimiohjaus */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Tiimiohjaus</div>
        <div className={styles.row}>
          <span className={`${styles.badge} ${styles.badgeTeam}`}>
            {teamLabel(routing.team)}
          </span>
          {routing.escalate && (
            <span className={`${styles.badge} ${styles.badgeEscalate}`}>
              Ohjataan johdolle
            </span>
          )}
        </div>
        <p className={styles.notes}>{routing.reason}</p>
        {routing.escalate && routing.escalation_reason && (
          <p className={styles.notes}>{routing.escalation_reason}</p>
        )}
      </div>

      {/* 4. Vastausluonnos */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Vastausluonnos</div>
        <p className={styles.draft}>{review.revised_draft}</p>
        <div className={styles.draftMeta}>
          <span className={styles.tone}>Sävy: {toneLabel(draft.tone)}</span>
        </div>
      </div>

      {/* 5. Muutokset ja varoitukset */}
      {(hasChanges || hasWarnings) && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Tarkistushuomiot</div>
          {hasChanges && (
            <>
              <div className={styles.cardTitle} style={{ marginTop: 0 }}>Muutokset</div>
              <ul className={styles.list}>
                {review.changes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </>
          )}
          {hasWarnings && (
            <>
              <div className={styles.cardTitle} style={{ marginTop: hasChanges ? '0.75rem' : 0 }}>Varoitukset</div>
              <ul className={styles.warningList}>
                {review.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {/* 6. Agenttidialogi */}
      {conversation.length > 0 && (
        <ConversationPanel messages={conversation} />
      )}

      {/* 7. AgentTrace */}
      <AgentTrace entries={agent_trace} />

      {/* 8. Toiminnot */}
      <div className={styles.actions}>
        <CopyButton result={result} />
      </div>

      <p className={styles.processingTime}>
        Käsittelyaika: {formatProcessingTime(processing_time_ms)}
      </p>
    </div>
  )
}
