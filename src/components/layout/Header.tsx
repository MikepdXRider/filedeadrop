import { Link } from 'react-router-dom'
import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.wordmark}>filedeadrop</Link>
      <span className={styles.note}>the digital dead drop</span>
    </header>
  )
}
