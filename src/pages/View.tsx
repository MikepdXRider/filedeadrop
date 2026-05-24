import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useView } from '../hooks/useView'

export default function View() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { status, fileUrl, fileName } = useView(id ?? '')

  useEffect(() => {
    if (status === 'error') navigate('/not-found', { replace: true })
  }, [status, navigate])

  return (
    <main>
      {status === 'loading' && <p>Fetching file...</p>}
      {status === 'decrypting' && <p>Decrypting...</p>}
      {status === 'done' && fileUrl && (
        <a href={fileUrl} download={fileName}>Download {fileName}</a>
      )}
    </main>
  )
}
