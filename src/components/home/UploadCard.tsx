import type { UploadStatus as UploadStatusType } from '../../types'
import { SUPPORTED_REGIONS, TTL_OPTIONS } from '../../utils/constants'
import FileDropZone from '../FileDropZone'
import TrustStrip from './TrustStrip'
import styles from './UploadCard.module.css'

interface UploadCardProps {
  status: UploadStatusType
  file: File | null
  shareUrl: string | null
  receiptUrl: string | null
  error: string | null
  selectedRegion: string
  selectedTtl: number
  wantsReceipt: boolean
  onFileSelect: (file: File) => void
  onUpload: () => void
  onReset: () => void
  onRegionChange: (region: string) => void
  onTtlChange: (ttl: number) => void
  onWantsReceiptChange: (wantsReceipt: boolean) => void
}

export default function UploadCard({ status, file, shareUrl, receiptUrl, error, selectedRegion, selectedTtl, wantsReceipt, onFileSelect, onUpload, onReset, onRegionChange, onTtlChange, onWantsReceiptChange }: UploadCardProps) {
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

        {status === 'done' && receiptUrl && (
          <div className={styles.receiptLinkWrap}>
            <a className={styles.receiptLink} href={receiptUrl} target="_blank" rel="noopener noreferrer">
              Track this file →
            </a>
            <span className={styles.receiptLinkHint}>Save this now — it won't be shown again.</span>
          </div>
        )}

        <p className={styles.disclaimer}>
          Did you know your file may contain hidden personal information in its metadata?
          <br />
          <a href="#faq">Learn more in our FAQ.</a>
        </p>

        <div className={`${styles.checkboxRow} ${status === 'done' ? styles.checkboxRowHidden : ''}`}>
          <input
            id="receipt-checkbox"
            type="checkbox"
            className={styles.checkboxInput}
            checked={wantsReceipt}
            onChange={e => onWantsReceiptChange(e.target.checked)}
            disabled={status === 'encrypting' || status === 'uploading'}
          />
          <label htmlFor="receipt-checkbox" className={styles.checkboxLabel}>
            Get a link to track when it's viewed
          </label>
        </div>

        <div className={styles.controls}>
          <div className={`${styles.selectorRow} ${status === 'done' ? styles.selectorRowHidden : ''}`}>
            <div className={styles.selectorGroup}>
              <label htmlFor="region-select" className={styles.selectorLabel}>Region</label>
              <select
                id="region-select"
                className={styles.selectorSelect}
                value={selectedRegion}
                onChange={e => onRegionChange(e.target.value)}
                disabled={status === 'encrypting' || status === 'uploading'}
              >
                {SUPPORTED_REGIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.selectorGroup}>
              <label htmlFor="ttl-select" className={styles.selectorLabel}>Expires</label>
              <select
                id="ttl-select"
                className={styles.selectorSelect}
                value={selectedTtl}
                onChange={e => onTtlChange(Number(e.target.value))}
                disabled={status === 'encrypting' || status === 'uploading'}
              >
                {TTL_OPTIONS.map(o => (
                  <option key={o.seconds} value={o.seconds}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

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
