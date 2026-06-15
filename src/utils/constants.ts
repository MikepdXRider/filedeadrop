export const DEFAULT_REGION = 'us-west-2'
export const AES_KEY_LENGTH = 128       // bits
export const AES_IV_LENGTH = 12         // bytes, standard for AES-GCM
export const AES_GCM_TAG_LENGTH = 16   // bytes, appended by crypto.subtle.encrypt
export const MAX_FILE_SIZE_MB = 25
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export const SUPPORTED_REGIONS = [
  { value: 'us-west-2',    label: 'United States' },
  { value: 'eu-central-1', label: 'European Union' },
] as const

export const REGION_API_URLS: Record<string, string> = {
  'us-west-2':    'https://us.api.filedeadrop.com',
  'eu-central-1': 'https://eu.api.filedeadrop.com',
}

export const HOSTNAME_API_URLS: Record<string, string> = {
  'us.filedeadrop.com':  'https://us.api.filedeadrop.com',
  'filedeadrop.com':     'https://us.api.filedeadrop.com',
  'www.filedeadrop.com': 'https://us.api.filedeadrop.com',
  'eu.filedeadrop.com':  'https://eu.api.filedeadrop.com',
}

export const REGION_FRONTEND_ORIGINS: Record<string, string> = {
  'us-west-2':    'https://us.filedeadrop.com',
  'eu-central-1': 'https://eu.filedeadrop.com',
}
