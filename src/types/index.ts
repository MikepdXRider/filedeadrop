export interface UploadRequest {
  fileSize: number
  region: string
}

export interface UploadResponse {
  presignedUrl: string
  sharePath: string
}

export type UploadStatus = 'idle' | 'ready' | 'encrypting' | 'uploading' | 'done' | 'error'
export type ViewStatus = 'loading' | 'decrypting' | 'done' | 'error'
