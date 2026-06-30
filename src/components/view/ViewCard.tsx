import { Link } from 'react-router-dom'
import type { ViewStatus } from '../../types'
import TrustStrip from '../home/TrustStrip'
import styles from './ViewCard.module.css'

interface ViewCardProps {
  status: ViewStatus
  fileName: string
  fileSize: number | null
  fileUrl: string | null
  downloaded: boolean
  onDownload: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : ''
}

export default function ViewCard({ status, fileName, fileSize, fileUrl, downloaded, onDownload }: ViewCardProps) {
  const showTerminal = downloaded || status === 'error'

  if (showTerminal) {
    return (
      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.terminal}>
            <div className={styles.terminalTitle}>
              {downloaded ? 'File downloaded and deleted.' : 'Nothing here.'}
            </div>
            <p className={styles.terminalDesc}>
              {downloaded
                ? 'Your file was saved to your device and permanently deleted from our servers. This link is no longer valid.'
                : 'This link is invalid, has already been used, or has expired.'}
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
        <div className={styles.inner}>
          <div className={styles.fileZone}>
            {status === 'done' && fileSize !== null ? (
              <div className={styles.fileBody}>
                <span className={styles.fileName}>{fileName}</span>
                <span className={styles.fileMeta}>
                  {formatFileSize(fileSize)}{fileExtension(fileName) ? ` · ${fileExtension(fileName)}` : ''}
                </span>
              </div>
            ) : (
              <div className={styles.statusLine}>
                {status === 'loading' ? 'Fetching...' : 'Decrypting...'}
              </div>
            )}
          </div>
          <div className={styles.controls}>
            {status === 'done' && fileUrl ? (
              <>
                <span className={styles.notice}>
                  After download the file is <span className={styles.noticeStrong}>permanently deleted</span>.
                </span>
                <button className={styles.buttonPrimary} onClick={onDownload}>Download →</button>
              </>
            ) : (
              <span className={styles.notice}>
                {status === 'loading'
                  ? 'Retrieving your encrypted file.'
                  : 'Decrypting in your browser. Your key never leaves this device.'}
              </span>
            )}
          </div>
        </div>
        <TrustStrip />
      </div>
    </section>
  )
}
