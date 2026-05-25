import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useView } from '../hooks/useView'
import ViewCard from '../components/view/ViewCard'

export default function View() {
  const { id } = useParams<{ id: string }>()
  const { status, fileUrl, fileName, fileSize } = useView(id ?? '')
  const [downloaded, setDownloaded] = useState(false)

  const handleDownload = () => {
    if (!fileUrl) return
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName
    a.click()
    setDownloaded(true)
  }

  return (
    <main>
      <ViewCard
        status={status}
        fileName={fileName}
        fileSize={fileSize}
        fileUrl={fileUrl}
        downloaded={downloaded}
        onDownload={handleDownload}
      />
    </main>
  )
}
