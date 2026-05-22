import type { UploadRequest, UploadResponse } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL

export async function requestUpload(fileSize: number, region: string): Promise<UploadResponse> {
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileSize, region } satisfies UploadRequest),
  })
  if (!res.ok) throw new Error(`Upload request failed: ${res.status}`)
  return res.json() as Promise<UploadResponse>
}

// Content-Type header intentionally omitted — adding it causes S3 signature mismatch 403
export async function uploadToS3(presignedUrl: string, encryptedBytes: Uint8Array<ArrayBuffer>): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    body: encryptedBytes,
  })
  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`)
}

export async function requestView(id: string): Promise<{ presignedUrl: string }> {
  const res = await fetch(`${BASE_URL}/view/${id}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`View request failed: ${res.status}`)
  return res.json() as Promise<{ presignedUrl: string }>
}
