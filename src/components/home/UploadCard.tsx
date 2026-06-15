import type { UploadStatus as UploadStatusType } from '../../types'
import { SUPPORTED_REGIONS } from '../../utils/constants'
import FileDropZone from '../FileDropZone'
import TrustStrip from './TrustStrip'
import styles from './UploadCard.module.css'

interface UploadCardProps {
  status: UploadStatusType
  file: File | null
  shareUrl: string | null
  error: string | null
  selectedRegion: string
  onFileSelect: (file: File) => void
  onUpload: () => void
  onReset: () => void
  onRegionChange: (region: string) => void
}

export default function UploadCard({ status, file, shareUrl, error, selectedRegion, onFileSelect, onUpload, onReset, onRegionChange }: UploadCardProps) {
  const handleCopy = () => {
    if (shareUrl) navigator.clipboard.writeText(shareUrl)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>

        {(status === 'idle' || status === 'ready') && (
          <FileDropZone onFileSelect={onFileSelect} disabled={false} selectedFile={file} />
        )}

        {(status === 'encrypting' || status === 'uploading') && (
          <div className={styles.panel}>
            <span className={styles.panelPrimary}>{file?.name}</span>
            <span className={styles.panelSecondary}>
              {status === 'encrypting' ? 'Encrypting...' : 'Uploading...'}
            </span>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.panel}>
            <span className={styles.panelPrimary}>{file?.name}</span>
            <span className={styles.panelSecondary}>{error ?? 'Upload failed'}</span>
          </div>
        )}

        {status === 'done' && shareUrl && (
          <div
            className={`${styles.panel} ${styles.panelClickable}`}
            onClick={handleCopy}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && handleCopy()}
          >
            <span className={styles.panelUrl}>{shareUrl}</span>
            <span className={styles.panelSecondary}>click to copy link</span>
          </div>
        )}

        <p className={styles.disclaimer}>
          Did you know your file may contain hidden personal information in its metadata?
          <br />
          <a href="#faq">Learn more in our FAQ.</a>
        </p>

        <div className={styles.controls}>
          {(status === 'idle' || status === 'ready') && (
            <div className={styles.regionGroup}>
              <span className={styles.regionLabel}>Region</span>
              <select
                className={styles.regionSelect}
                value={selectedRegion}
                onChange={e => onRegionChange(e.target.value)}
              >
                {SUPPORTED_REGIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {(status === 'idle' || status === 'ready') && (
            <button className={styles.button} onClick={onUpload} disabled={status === 'idle'}>
              Generate link →
            </button>
          )}
          {(status === 'encrypting' || status === 'uploading') && (
            <button className={styles.button} disabled>Generate link →</button>
          )}
          {status === 'error' && (
            <button className={styles.button} onClick={onUpload}>Try again →</button>
          )}
          {status === 'done' && (
            <button className={styles.button} onClick={onReset}>Upload another →</button>
          )}
        </div>

      </div>
      <TrustStrip />
    </div>
  )
}
