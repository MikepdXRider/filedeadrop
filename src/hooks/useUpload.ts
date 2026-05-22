import { useState } from 'react'
import type { UploadStatus } from '../types'
import { DEFAULT_REGION } from '../utils/constants'
import { generateKey, encryptFile, exportKeyToBase64 } from '../utils/crypto'
import { requestUpload, uploadToS3 } from '../utils/api'

interface UploadState {
  status: UploadStatus
  shareUrl: string | null
  error: string | null
}

const initialState: UploadState = { status: 'idle', shareUrl: null, error: null }

export function useUpload() {
  const [state, setState] = useState<UploadState>(initialState)

  const handleFileSelect = async (file: File) => {
    if (state.status !== 'idle') return
    setState({ status: 'encrypting', shareUrl: null, error: null })
    try {
      const key = await generateKey()
      const encryptedBytes = await encryptFile(file, key)
      const { presignedUrl, sharePath } = await requestUpload(file.size, DEFAULT_REGION)
      const keyB64 = await exportKeyToBase64(key)
      const finalUrl = `${window.location.origin}${sharePath}#${keyB64}:${encodeURIComponent(file.name)}`
      console.log(finalUrl)
      setState({ status: 'uploading', shareUrl: null, error: null })
      await uploadToS3(presignedUrl, encryptedBytes)
      setState({ status: 'done', shareUrl: finalUrl, error: null })
    } catch (err) {
      setState({
        status: 'error',
        shareUrl: null,
        error: err instanceof Error ? err.message : 'Upload failed',
      })
    }
  }

  const reset = () => setState(initialState)

  return { ...state, handleFileSelect, reset }
}
