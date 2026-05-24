import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <span className={styles.wordmark}>filedeadrop</span>
      <span className={styles.note}>the digital dead drop</span>
    </header>
  )
}
