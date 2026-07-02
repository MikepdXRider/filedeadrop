import { useState } from 'react'
import type { UploadStatus } from '../types'
import { DEFAULT_REGION, DEFAULT_TTL, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, REGION_FRONTEND_ORIGINS } from '../utils/constants'
import { generateKey, encryptFile, exportKeyToBase64, encryptFilename } from '../utils/crypto'
import { getApiUrlForUpload, requestUpload, uploadToS3 } from '../utils/api'

interface UploadState {
  status: UploadStatus
  file: File | null
  shareUrl: string | null
  receiptUrl: string | null
  error: string | null
}

const initialState: UploadState = { status: 'idle', file: null, shareUrl: null, receiptUrl: null, error: null }

export function useUpload() {
  const [state, setState] = useState<UploadState>(initialState)
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION)
  const [selectedTtl, setSelectedTtl] = useState(DEFAULT_TTL)
  const [wantsReceipt, setWantsReceipt] = useState(false)

  const handleFileSelect = (file: File) => {
    if (state.status !== 'idle' && state.status !== 'ready') return
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setState({ status: 'error', file: null, shareUrl: null, receiptUrl: null, error: `File exceeds the ${MAX_FILE_SIZE_MB}MB limit` })
      return
    }
    setState({ status: 'ready', file, shareUrl: null, receiptUrl: null, error: null })
  }

  const handleRegionSelect = (region: string) => {
    if (state.status === 'encrypting' || state.status === 'uploading' || state.status === 'done') return
    setSelectedRegion(region)
  }

  const handleTtlSelect = (ttl: number) => {
    if (state.status === 'encrypting' || state.status === 'uploading' || state.status === 'done') return
    setSelectedTtl(ttl)
  }

  const handleWantsReceiptChange = (checked: boolean) => {
    if (state.status === 'encrypting' || state.status === 'uploading' || state.status === 'done') return
    setWantsReceipt(checked)
  }

  const handleUpload = async () => {
    if ((state.status !== 'ready' && state.status !== 'error') || !state.file) return
    const file = state.file
    setState(s => ({ ...s, status: 'encrypting', error: null }))
    try {
      const key = await generateKey()
      const encryptedBytes = await encryptFile(file, key)
      const apiUrl = getApiUrlForUpload(selectedRegion)
      const { presignedUrl, sharePath, receiptPath } = await requestUpload(encryptedBytes.byteLength, selectedTtl, apiUrl, wantsReceipt)
      const keyB64 = await exportKeyToBase64(key)
      const encryptedFilename = await encryptFilename(file.name, key)
      const shareOrigin = window.location.hostname === 'localhost'
        ? window.location.origin
        : (REGION_FRONTEND_ORIGINS[selectedRegion] ?? window.location.origin)
      const finalUrl = `${shareOrigin}${sharePath}#${keyB64}:${encryptedFilename}`
      const receiptUrl = receiptPath ? `${shareOrigin}${receiptPath}` : null
      setState(s => ({ ...s, status: 'uploading' }))
      await uploadToS3(presignedUrl, encryptedBytes)
      setState({ status: 'done', file: null, shareUrl: finalUrl, receiptUrl, error: null })
    } catch (err) {
      setState(s => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed',
      }))
    }
  }

  const reset = () => {
    setState(initialState)
    setSelectedTtl(DEFAULT_TTL)
    setSelectedRegion(DEFAULT_REGION)
    setWantsReceipt(false)
  }

  return { ...state, selectedRegion, selectedTtl, wantsReceipt, handleFileSelect, handleRegionSelect, handleTtlSelect, handleWantsReceiptChange, handleUpload, reset }
}
