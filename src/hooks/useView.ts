import { useState, useEffect } from 'react'
import type { ViewStatus } from '../types'
import { importKeyFromBase64, decryptFile, decryptFilename } from '../utils/crypto'
import { getApiUrlForView, requestView, requestCleanup } from '../utils/api'

interface ViewState {
  status: ViewStatus
  fileUrl: string | null
  fileName: string
  fileSize: number | null
  error: string | null
}

export function useView(id: string) {
  const hash = window.location.hash.slice(1)
  const separatorIndex = hash.indexOf(':')
  const keyB64 = separatorIndex !== -1 ? hash.slice(0, separatorIndex) : hash
  const encryptedFilenameB64 = separatorIndex !== -1 ? hash.slice(separatorIndex + 1) : ''

  const [state, setState] = useState<ViewState>({ status: 'loading', fileUrl: null, fileName: 'filedeadrop', fileSize: null, error: null })

  useEffect(() => {
    if (!keyB64) {
      setState({ status: 'error', fileUrl: null, fileName: 'filedeadrop', fileSize: null, error: 'Invalid link — encryption key missing' })
      return
    }

    let blobUrl: string | null = null
    const controller = new AbortController()

    const run = async () => {
      const apiUrl = getApiUrlForView()
      const { presignedUrl } = await requestView(id, apiUrl, controller.signal)
      const encryptedRes = await fetch(presignedUrl, { signal: controller.signal })
      if (!encryptedRes.ok) throw new Error(`${encryptedRes.status}`)
      const encryptedBytes = await encryptedRes.arrayBuffer()
      requestCleanup(id, apiUrl).catch(() => {})
      const key = await importKeyFromBase64(keyB64)
      const fileName = encryptedFilenameB64
        ? await decryptFilename(encryptedFilenameB64, key)
        : 'filedeadrop'
      setState({ status: 'decrypting', fileUrl: null, fileName, fileSize: null, error: null })
      const decryptedBytes = await decryptFile(encryptedBytes, key)
      blobUrl = URL.createObjectURL(new Blob([decryptedBytes]))
      setState({ status: 'done', fileUrl: blobUrl, fileName, fileSize: decryptedBytes.byteLength, error: null })
    }

    run().catch(err => {
      if (err instanceof Error && err.name === 'AbortError') return
      const msg =
        err instanceof Error && (err.message.includes('404') || err.message.includes('410'))
          ? 'This link has already been used or has expired'
          : err instanceof Error
            ? err.message
            : 'Failed to load file'
      setState({ status: 'error', fileUrl: null, fileName: 'filedeadrop', fileSize: null, error: msg })
    })

    return () => {
      controller.abort()
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [id])

  return state
}
