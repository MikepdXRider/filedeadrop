export interface UploadRequest {
  fileSize: number
  ttl: number
  receiptRequested: boolean
}

export interface UploadResponse {
  presignedUrl: string
  sharePath: string
  receiptPath?: string
}

export interface ReceiptResponse {
  status: 'pending' | 'accessed' | 'expired'
  uploadedAt: number
  accessedAt: number | null
  deletedAt: number | null
  fileExpiresAt: number
}

export type UploadStatus = 'idle' | 'ready' | 'encrypting' | 'uploading' | 'done' | 'error'
export type ViewStatus = 'loading' | 'decrypting' | 'done' | 'downloaded' | 'error'
export type ReceiptStatus = 'loading' | 'pending' | 'accessed' | 'expired' | 'error'
