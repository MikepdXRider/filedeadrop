import styles from './TrustStrip.module.css'

const items = ['E2E encrypted', 'One-time access', 'Expires 24h', 'Zero knowledge']

export default function TrustStrip() {
  return (
    <div className={styles.strip}>
      {items.map((item) => (
        <span key={item} className={styles.item}>{item}</span>
      ))}
    </div>
  )
}
