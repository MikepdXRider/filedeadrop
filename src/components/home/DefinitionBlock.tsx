import styles from './DefinitionBlock.module.css'

export default function DefinitionBlock() {
  return (
    <div className={styles.block}>
      <div className={styles.word}>dead drop</div>
      <div className={styles.pronunciation}>/ded drɒp/</div>
      <div className={styles.pos}>noun</div>
      <p className={styles.definition}>
        A prearranged location used to pass items or information between two
        parties without direct contact. Once retrieved, no record of the
        exchange remains.
      </p>
    </div>
  )
}
