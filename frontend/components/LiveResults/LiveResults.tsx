import type { CategoryResult, UrgencyResult, RoutingResult } from '@/lib/api'
import { categoryLabel, urgencyLabel, teamLabel } from '@/lib/categories'
import styles from './LiveResults.module.css'

interface LiveResultsProps {
  category?: CategoryResult
  urgency?: UrgencyResult
  routing?: RoutingResult
}

function UrgencyColor(urgency: string): string {
  if (urgency === 'kiireellinen') return styles.badgeRed
  if (urgency === 'ei_kiireellinen') return styles.badgeGreen
  return styles.badgeYellow
}

export default function LiveResults({ category, urgency, routing }: LiveResultsProps) {
  if (!category && !urgency && !routing) return null

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Tuloksia saapuu...</div>

      {category && (
        <div className={styles.row}>
          <div className={styles.rowHeader}>
            <span className={styles.rowLabel}>Luokittelu</span>
            <span className={`${styles.badge} ${styles.badgePurple}`}>
              {categoryLabel(category.category)}
            </span>
            <span className={styles.lang}>{category.language.toUpperCase()}</span>
          </div>
          {category.category_notes && (
            <p className={styles.note}>{category.category_notes}</p>
          )}
        </div>
      )}

      {urgency && (
        <div className={styles.row}>
          <div className={styles.rowHeader}>
            <span className={styles.rowLabel}>Kiireellisyys</span>
            <span className={`${styles.badge} ${UrgencyColor(urgency.urgency)}`}>
              {urgencyLabel(urgency.urgency)}
            </span>
            <span className={styles.score}>{urgency.urgency_score}/10</span>
          </div>
          {urgency.reasoning && (
            <p className={styles.note}>{urgency.reasoning}</p>
          )}
        </div>
      )}

      {routing && (
        <div className={styles.row}>
          <div className={styles.rowHeader}>
            <span className={styles.rowLabel}>Tiimiohjaus</span>
            <span className={`${styles.badge} ${styles.badgeBlue}`}>
              {teamLabel(routing.team)}
            </span>
            {routing.escalate && (
              <span className={`${styles.badge} ${styles.badgeRed}`}>Eskalaatio</span>
            )}
          </div>
          {routing.reason && (
            <p className={styles.note}>{routing.reason}</p>
          )}
        </div>
      )}
    </div>
  )
}
