import { AES_KEY_LENGTH, AES_IV_LENGTH } from './constants'

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function encryptFile(file: File, key: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const fileBytes = await file.arrayBuffer()
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fileBytes)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return combined
}

export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  const bytes = new Uint8Array(raw)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function decryptFile(encryptedBytes: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = new Uint8Array(encryptedBytes, 0, AES_IV_LENGTH)
  const ciphertext = encryptedBytes.slice(AES_IV_LENGTH)
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
}

export async function importKeyFromBase64(b64: string): Promise<CryptoKey> {
  const binary = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['decrypt']
  )
}

export async function encryptFilename(filename: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH))
  const encoded = new TextEncoder().encode(filename)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  let binary = ''
  for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function decryptFilename(encryptedB64: string, key: CryptoKey): Promise<string> {
  const binary = atob(encryptedB64.replace(/-/g, '+').replace(/_/g, '/'))
  const combined = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) combined[i] = binary.charCodeAt(i)
  const iv = combined.slice(0, AES_IV_LENGTH)
  const ciphertext = combined.slice(AES_IV_LENGTH)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}
