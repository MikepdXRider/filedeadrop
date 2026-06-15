export interface UploadRequest {
  fileSize: number
}

export interface UploadResponse {
  presignedUrl: string
  sharePath: string
}

export type UploadStatus = 'idle' | 'ready' | 'encrypting' | 'uploading' | 'done' | 'error'
export type ViewStatus = 'loading' | 'decrypting' | 'done' | 'downloaded' | 'error'
