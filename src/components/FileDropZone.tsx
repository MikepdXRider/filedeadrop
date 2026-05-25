import styles from './FileDropZone.module.css'

interface FileDropZoneProps {
  onFileSelect: (file: File) => void
  disabled: boolean
  selectedFile?: File | null
}

export default function FileDropZone({ onFileSelect, disabled, selectedFile }: FileDropZoneProps) {
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) onFileSelect(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
  }

  return (
    <label className={styles.dropzone} onDragOver={handleDragOver} onDrop={handleDrop}>
      <input type="file" disabled={disabled} onChange={handleChange} style={{ display: 'none' }} />
      {selectedFile ? (
        <>
          <span className={styles.primary}>{selectedFile.name}</span>
          <span className={styles.secondary}>click or drop to change</span>
        </>
      ) : (
        <>
          <span className={styles.primary}>Drop a file here</span>
          <span className={styles.secondary}>or click to browse</span>
          <span className={styles.limit}>25MB maximum · Any file type</span>
        </>
      )}
    </label>
  )
}
