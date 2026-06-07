import { useState } from 'react'
import type { UploadStatus } from '../types'
import { DEFAULT_REGION, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../utils/constants'
import { generateKey, encryptFile, exportKeyToBase64 } from '../utils/crypto'
import { requestUpload, uploadToS3 } from '../utils/api'

interface UploadState {
  status: UploadStatus
  file: File | null
  shareUrl: string | null
  error: string | null
}

const initialState: UploadState = { status: 'idle', file: null, shareUrl: null, error: null }

export function useUpload() {
  const [state, setState] = useState<UploadState>(initialState)

  const handleFileSelect = (file: File) => {
    if (state.status !== 'idle' && state.status !== 'ready') return
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setState({ status: 'error', file: null, shareUrl: null, error: `File exceeds the ${MAX_FILE_SIZE_MB}MB limit` })
      return
    }
    setState({ status: 'ready', file, shareUrl: null, error: null })
  }

  const handleUpload = async () => {
    if ((state.status !== 'ready' && state.status !== 'error') || !state.file) return
    const file = state.file
    setState(s => ({ ...s, status: 'encrypting', error: null }))
    try {
      const key = await generateKey()
      const encryptedBytes = await encryptFile(file, key)
      const { presignedUrl, sharePath } = await requestUpload(encryptedBytes.byteLength, DEFAULT_REGION)
      const keyB64 = await exportKeyToBase64(key)
      const finalUrl = `${window.location.origin}${sharePath}#${keyB64}:${encodeURIComponent(file.name)}`
      setState(s => ({ ...s, status: 'uploading' }))
      await uploadToS3(presignedUrl, encryptedBytes)
      setState({ status: 'done', file: null, shareUrl: finalUrl, error: null })
    } catch (err) {
      setState(s => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed',
      }))
    }
  }

  const reset = () => setState(initialState)

  return { ...state, handleFileSelect, handleUpload, reset }
}
