import styles from './FaqSection.module.css'
import SectionLabel from './SectionLabel'

const faqs = [
  {
    q: 'Can I recover a file after the link is accessed?',
    a: 'No. Deletion is immediate and permanent. This is by design.',
  },
  {
    q: 'Can you read my files?',
    a: 'No. Files are encrypted in your browser using a key that only exists in the share link. We never have access to it.',
  },
  {
    q: 'What if the link expires before my recipient opens it?',
    a: 'The file and link are permanently deleted after 24 hours regardless of whether it was accessed.',
  },
  {
    q: 'What if you receive a legal request?',
    a: 'We can produce an encrypted, unreadable file and basic transfer metadata. We have no access to file contents, filenames, or identities.',
  },
  {
    q: 'What file types are supported?',
    a: 'Any file type up to 100MB. We do not inspect, process, or scan file contents.',
  },
]

export default function FaqSection() {
  return (
    <section className={styles.section}>
      <SectionLabel>FAQ</SectionLabel>
      <div className={styles.faq}>
        {faqs.map(({ q, a }) => (
          <div key={q} className={styles.row}>
            <div className={styles.question}>{q}</div>
            <p className={styles.answer}>{a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
