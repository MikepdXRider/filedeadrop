import { useUpload } from '../hooks/useUpload'
import FileDropZone from '../components/FileDropZone'
import UploadStatus from '../components/UploadStatus'
import ShareUrlDisplay from '../components/ShareUrlDisplay'
import DefinitionBlock from '../components/home/DefinitionBlock'

export default function Home() {
  const { status, shareUrl, error, handleFileSelect, reset } = useUpload()

  return (
    <main>
      <DefinitionBlock />
      <hr />
      {status === 'idle' && (
        <FileDropZone onFileSelect={handleFileSelect} disabled={false} />
      )}
      {(status === 'encrypting' || status === 'uploading' || status === 'error') && (
        <UploadStatus status={status} error={error} />
      )}
      {status === 'done' && shareUrl && (
        <ShareUrlDisplay shareUrl={shareUrl} onReset={reset} />
      )}
    </main>
  )
}
