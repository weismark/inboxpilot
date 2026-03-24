import styles from './AgentProgress.module.css'

export type AgentStatusType = 'waiting' | 'running' | 'done'

export interface AgentStatus {
  id: string
  label: string
  status: AgentStatusType
  duration_ms?: number
  parallel?: boolean
}

interface AgentProgressProps {
  statuses: AgentStatus[]
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`
}

export default function AgentProgress({ statuses }: AgentProgressProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.spinner} />
        <span className={styles.headerText}>Analyysi käynnissä...</span>
      </div>
      <div className={styles.list}>
        {statuses.map(s => (
          <div key={s.id} className={styles.row}>
            <div className={`${styles.icon} ${
              s.status === 'done' ? styles.iconDone :
              s.status === 'running' ? styles.iconRunning :
              styles.iconWaiting
            }`}>
              {s.status === 'done' ? '✓' : s.status === 'waiting' ? '○' : ''}
            </div>
            <span className={`${styles.label} ${
              s.status === 'done' ? styles.labelDone :
              s.status === 'running' ? styles.labelRunning :
              styles.labelWaiting
            }`}>
              {s.label}
            </span>
            {s.parallel && s.status !== 'done' && (
              <span className={styles.parallelTag}>rinnakkain</span>
            )}
            {s.status === 'done' && s.duration_ms != null && (
              <span className={styles.duration}>{formatDuration(s.duration_ms)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
