import { useParams } from 'react-router-dom'
import { useView } from '../hooks/useView'

export default function View() {
  const { id } = useParams<{ id: string }>()
  const { status, fileUrl, fileName, error } = useView(id ?? '')

  return (
    <main>
      <h1>filedeadrop</h1>
      {status === 'loading' && <p>Fetching file...</p>}
      {status === 'decrypting' && <p>Decrypting...</p>}
      {status === 'error' && <p>{error}</p>}
      {status === 'done' && fileUrl && (
        <a href={fileUrl} download={fileName}>Download {fileName}</a>
      )}
    </main>
  )
}
