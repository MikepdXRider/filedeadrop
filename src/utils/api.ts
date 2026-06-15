import type { UploadRequest, UploadResponse } from '../types'
import { REGION_API_URLS, HOSTNAME_API_URLS } from './constants'

const DEV_API_KEY = import.meta.env.VITE_DEV_API_KEY

function devHeaders(): Record<string, string> {
  return DEV_API_KEY ? { 'x-api-key': DEV_API_KEY } : {}
}

export function getApiUrlForUpload(region: string): string {
  return REGION_API_URLS[region] ?? import.meta.env.VITE_API_URL
}

export function getApiUrlForView(): string {
  return HOSTNAME_API_URLS[window.location.hostname] ?? import.meta.env.VITE_API_URL
}

export async function requestUpload(fileSize: number, apiUrl: string): Promise<UploadResponse> {
  const res = await fetch(`${apiUrl}/upload`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...devHeaders() },
    body: JSON.stringify({ fileSize } satisfies UploadRequest),
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

export async function requestCleanup(id: string, apiUrl: string): Promise<void> {
  await fetch(`${apiUrl}/delete/${id}`, { method: 'DELETE', headers: { ...devHeaders() } })
}

export async function requestView(id: string, apiUrl: string, signal?: AbortSignal): Promise<{ presignedUrl: string }> {
  const res = await fetch(`${apiUrl}/view/${id}`, {
    headers: { 'Content-Type': 'application/json', ...devHeaders() },
    signal,
  })
  if (!res.ok) throw new Error(`View request failed: ${res.status}`)
  return res.json() as Promise<{ presignedUrl: string }>
}
