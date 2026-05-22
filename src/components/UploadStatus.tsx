import type { UploadStatus } from '../types'

interface UploadStatusProps {
  status: UploadStatus
  error: string | null
}

export default function UploadStatus({ status, error }: UploadStatusProps) {
  if (status === 'encrypting') return <p>Encrypting file...</p>
  if (status === 'uploading') return <p>Uploading...</p>
  if (status === 'error') return <p>{error}</p>
  return null
}
