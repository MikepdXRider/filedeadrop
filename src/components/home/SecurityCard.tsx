import styles from './SecurityCard.module.css'
import SectionLabel from './SectionLabel'

export default function SecurityCard() {
  return (
    <section className={styles.section}>
      <SectionLabel>Security posture</SectionLabel>
      <div className={styles.card}>
        <div className={styles.label}>Zero-knowledge architecture</div>
        <div className={styles.title}>
          We cannot read your files.<br />Even if asked.
        </div>
        <p className={styles.body}>
          Your encryption key exists only in your share link — never transmitted
          to our servers, never logged, never stored. Under a legal order we can
          produce nothing of value: an encrypted, unreadable blob that expires
          within 24 hours.
        </p>
        <p className={styles.body}>
          We are not a file storage service. We are a one-time delivery
          mechanism. The distinction matters.
        </p>
      </div>
    </section>
  )
}
