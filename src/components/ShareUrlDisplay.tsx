interface ShareUrlDisplayProps {
  shareUrl: string
  onReset: () => void
}

export default function ShareUrlDisplay({ shareUrl, onReset }: ShareUrlDisplayProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
  }

  return (
    <div>
      <code>{shareUrl}</code>
      <button onClick={handleCopy}>Copy</button>
      <button onClick={onReset}>Upload another file</button>
    </div>
  )
}
