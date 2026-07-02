import { useParams } from 'react-router-dom'
import { useReceipt } from '../hooks/useReceipt'
import ReceiptCard from '../components/receipt/ReceiptCard'

export default function Receipt() {
  const { token } = useParams<{ token: string }>()
  const { status, uploadedAt, accessedAt, deletedAt, fileExpiresAt, error } = useReceipt(token ?? '')

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <main>
        <ReceiptCard
          status={status}
          uploadedAt={uploadedAt}
          accessedAt={accessedAt}
          deletedAt={deletedAt}
          fileExpiresAt={fileExpiresAt}
          error={error}
        />
      </main>
    </>
  )
}
