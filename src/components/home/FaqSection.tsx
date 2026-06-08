import styles from './FaqSection.module.css'
import SectionLabel from './SectionLabel'
import { MAX_FILE_SIZE_MB } from '../../utils/constants'

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
    a: `Any file type up to ${MAX_FILE_SIZE_MB}MB. We do not inspect, process, or scan file contents.`,
  },
  {
    q: 'What is file metadata?',
    a: "Metadata is information embedded in a file by the device or software that created it. Depending on the file type, it can include GPS coordinates, device make and model, the author's name, organization, revision history, or creation timestamps. These details aren't visible when you open the file but travel with it whenever it's shared.",
  },
  {
    q: 'Does FileDeadrop manage or strip file metadata?',
    a: "No. Your file is encrypted and delivered exactly as-is. Any metadata the file contains is included in the encrypted payload and can be accessed by a recipient who knows how to inspect it. If you're sharing sensitive content, consider removing metadata locally before uploading.",
  },
]

export default function FaqSection() {
  return (
    <section id="faq" className={styles.section}>
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
