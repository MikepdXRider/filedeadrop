import { Link } from 'react-router-dom'
import type { ReceiptStatus } from '../../types'
import styles from './ReceiptCard.module.css'

interface ReceiptCardProps {
  status: ReceiptStatus
  uploadedAt: number | null
  accessedAt: number | null
  deletedAt: number | null
  fileExpiresAt: number | null
  error: string | null
}

function formatTimestamp(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString()
}

const STATUS_TITLE: Record<'pending' | 'accessed' | 'expired', string> = {
  pending: 'Pending',
  accessed: 'Accessed',
  expired: 'Expired',
}

function getAccessedRow(status: 'pending' | 'accessed' | 'expired', accessedAt: number | null): string {
  if (accessedAt !== null) return formatTimestamp(accessedAt)
  return status === 'expired' ? 'Never' : 'Not yet'
}

function getDeletedRow(status: 'pending' | 'accessed' | 'expired', deletedAt: number | null, fileExpiresAt: number | null): string {
  if (deletedAt !== null) return formatTimestamp(deletedAt)
  if (status === 'expired') {
    return fileExpiresAt !== null
      ? `Not confirmed — expected around ${formatTimestamp(fileExpiresAt)}`
      : 'Not confirmed'
  }
  return 'Not yet'
}

export default function ReceiptCard({ status, uploadedAt, accessedAt, deletedAt, fileExpiresAt, error }: ReceiptCardProps) {
  if (status === 'loading') {
    return (
      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.terminal}>
            <div className={styles.terminalTitle}>Checking status...</div>
          </div>
        </div>
      </section>
    )
  }

  if (status === 'error' || uploadedAt === null) {
    return (
      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.terminal}>
            <div className={styles.terminalTitle}>Nothing here.</div>
            <p className={styles.terminalDesc}>
              {error ?? 'This receipt link is invalid or has expired.'}
            </p>
            <Link to="/" className={styles.buttonSecondary}>Send your own file →</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.terminal}>
          <div className={styles.terminalTitle}>{STATUS_TITLE[status]}</div>
          <ul className={styles.timeline}>
            <li className={styles.timelineRow}>
              <span className={styles.timelineLabel}>Uploaded</span>
              <span className={styles.timelineValue}>{formatTimestamp(uploadedAt)}</span>
            </li>
            <li className={styles.timelineRow}>
              <span className={styles.timelineLabel}>Accessed</span>
              <span className={styles.timelineValue}>{getAccessedRow(status, accessedAt)}</span>
            </li>
            <li className={styles.timelineRow}>
              <span className={styles.timelineLabel}>Deleted</span>
              <span className={styles.timelineValue}>{getDeletedRow(status, deletedAt, fileExpiresAt)}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
