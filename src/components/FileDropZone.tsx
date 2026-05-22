interface FileDropZoneProps {
  onFileSelect: (file: File) => void
  disabled: boolean
}

export default function FileDropZone({ onFileSelect, disabled }: FileDropZoneProps) {
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
    <label onDragOver={handleDragOver} onDrop={handleDrop}>
      <input type="file" disabled={disabled} onChange={handleChange} style={{ display: 'none' }} />
      Drop a file here or click to select
    </label>
  )
}
