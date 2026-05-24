import styles from './SectionLabel.module.css'

interface SectionLabelProps {
  children: React.ReactNode
}

export default function SectionLabel({ children }: SectionLabelProps) {
  return <div className={styles.label}>{children}</div>
}
