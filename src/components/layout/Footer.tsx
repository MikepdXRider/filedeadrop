import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.wordmark}>filedeadrop</span>
      <span className={styles.tagline}>the digital dead drop</span>
    </footer>
  )
}
