import { useState, useEffect } from 'react'
import type { ViewStatus } from '../types'
import { importKeyFromBase64, decryptFile } from '../utils/crypto'
import { requestView } from '../utils/api'

interface ViewState {
  status: ViewStatus
  fileUrl: string | null
  fileName: string
  error: string | null
}

export function useView(id: string) {
  const hash = window.location.hash.slice(1)
  const separatorIndex = hash.indexOf(':')
  const keyB64 = separatorIndex !== -1 ? hash.slice(0, separatorIndex) : hash
  const fileName = separatorIndex !== -1 ? decodeURIComponent(hash.slice(separatorIndex + 1)) : 'filedeadrop'

  const [state, setState] = useState<ViewState>({ status: 'loading', fileUrl: null, fileName, error: null })

  useEffect(() => {
    if (!keyB64) {
      setState({ status: 'error', fileUrl: null, fileName, error: 'Invalid link — encryption key missing' })
      return
    }

    let blobUrl: string | null = null

    const run = async () => {
      const { presignedUrl } = await requestView(id)
      const encryptedRes = await fetch(presignedUrl)
      if (!encryptedRes.ok) throw new Error(`${encryptedRes.status}`)
      const encryptedBytes = await encryptedRes.arrayBuffer()
      setState({ status: 'decrypting', fileUrl: null, fileName, error: null })
      const key = await importKeyFromBase64(keyB64)
      const decryptedBytes = await decryptFile(encryptedBytes, key)
      blobUrl = URL.createObjectURL(new Blob([decryptedBytes]))
      setState({ status: 'done', fileUrl: blobUrl, fileName, error: null })
    }

    run().catch(err => {
      const msg =
        err instanceof Error && (err.message.includes('404') || err.message.includes('410'))
          ? 'This link has already been used or has expired'
          : err instanceof Error
            ? err.message
            : 'Failed to load file'
      setState({ status: 'error', fileUrl: null, fileName, error: msg })
    })

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [id])

  return state
}
