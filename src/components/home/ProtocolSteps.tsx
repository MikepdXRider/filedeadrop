import styles from './ProtocolSteps.module.css'
import SectionLabel from './SectionLabel'

const steps = [
  {
    n: '01',
    title: 'Upload',
    desc: 'Your file is encrypted in your browser before upload. The encryption key never touches our servers — it exists only in your share link.',
  },
  {
    n: '02',
    title: 'Transmit',
    desc: 'Copy your one-time link and deliver it to your recipient through any channel you choose.',
  },
  {
    n: '03',
    title: 'Destroy',
    desc: 'The moment your recipient opens the link the file is downloaded and permanently deleted. No recovery. No second access. No trace.',
  },
]

export default function ProtocolSteps() {
  return (
    <section className={styles.section}>
      <SectionLabel>Protocol</SectionLabel>
      <div className={styles.steps}>
        {steps.map(({ n, title, desc }) => (
          <div key={n} className={styles.step}>
            <div className={styles.number}>{n}</div>
            <div className={styles.body}>
              <div className={styles.title}>{title}</div>
              <p className={styles.desc}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
