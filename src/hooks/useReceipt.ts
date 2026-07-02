import { useState, useEffect } from 'react'
import type { ReceiptStatus } from '../types'
import { getApiUrlForView, requestReceipt } from '../utils/api'

interface ReceiptState {
  status: ReceiptStatus
  uploadedAt: number | null
  accessedAt: number | null
  deletedAt: number | null
  fileExpiresAt: number | null
  error: string | null
}

const initialState: ReceiptState = { status: 'loading', uploadedAt: null, accessedAt: null, deletedAt: null, fileExpiresAt: null, error: null }

export function useReceipt(token: string) {
  const [state, setState] = useState<ReceiptState>(initialState)

  useEffect(() => {
    const controller = new AbortController()

    const run = async () => {
      const apiUrl = getApiUrlForView()
      const { status, uploadedAt, accessedAt, deletedAt, fileExpiresAt } = await requestReceipt(token, apiUrl, controller.signal)
      setState({ status, uploadedAt, accessedAt, deletedAt, fileExpiresAt, error: null })
    }

    run().catch(err => {
      if (err instanceof Error && err.name === 'AbortError') return
      const msg = err instanceof Error && err.message === 'Receipt not found'
        ? 'This receipt link is invalid or has expired'
        : err instanceof Error ? err.message : 'Failed to load receipt'
      setState({ status: 'error', uploadedAt: null, accessedAt: null, deletedAt: null, fileExpiresAt: null, error: msg })
    })

    return () => controller.abort()
  }, [token])

  return state
}
