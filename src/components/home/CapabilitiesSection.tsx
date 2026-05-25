import styles from './CapabilitiesSection.module.css'
import SectionLabel from './SectionLabel'

const features = [
  {
    title: 'End-to-end encrypted',
    desc: 'Encrypted in your browser before upload. The key exists only in the share link. We cannot read your files. Nobody can.',
  },
  {
    title: 'One-time access',
    desc: 'The link works exactly once. After retrieval the file is permanently deleted — not archived, not recoverable.',
  },
  {
    title: 'No account required',
    desc: 'Upload and transmit without an account. Your transfer leaves no trail on our end.',
  },
  // {
  //   title: 'Data residency',
  //   desc: 'Select a storage region before upload. Your file never leaves your chosen jurisdiction.',
  // },
  {
    title: 'Automatic expiry',
    desc: 'Every link is destroyed after 24 hours whether accessed or not. Nothing lingers.',
  },
]

export default function CapabilitiesSection() {
  return (
    <section className={styles.section}>
      <SectionLabel>Capabilities</SectionLabel>
      <div className={styles.features}>
        {features.map(({ title, desc }) => (
          <div key={title}>
            <div className={styles.title}>{title}</div>
            <p className={styles.desc}>{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
