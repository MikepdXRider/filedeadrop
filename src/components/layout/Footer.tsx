import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.wordmark}>filedeadrop</span>
      <div className={styles.center}>
        <span className={styles.copyright}>© 2026 Michael Rider</span>
        <span className={styles.sep}>·</span>
        <a
          href="https://www.linkedin.com/in/mikepdxrider"
          className={styles.externalLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <span className={styles.sep}>·</span>
        <Link to="/privacy" className={styles.link}>Privacy</Link>
      </div>
      <span className={styles.tagline}>the digital dead drop</span>
    </footer>
  )
}
