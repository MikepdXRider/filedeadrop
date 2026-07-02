export const DEFAULT_REGION = 'us-west-2'
export const AES_KEY_LENGTH = 128       // bits
export const AES_IV_LENGTH = 12         // bytes, standard for AES-GCM
export const AES_GCM_TAG_LENGTH = 16   // bytes, appended by crypto.subtle.encrypt
export const MAX_FILE_SIZE_MB = 250
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export const DEFAULT_TTL = 86400

// Keep in sync with VALID_TTLS in api/lambda/upload/index.mjs
export const TTL_OPTIONS = [
  { label: '5 minutes', seconds: 300 },
  { label: '1 hour',    seconds: 3600 },
  { label: '6 hours',   seconds: 21600 },
  { label: '24 hours',  seconds: 86400 },
] as const

interface RegionConfig {
  region: string
  label: string
  apiUrl: string
  frontendOrigin: string
  hostnames: string[]
}

const REGIONS: RegionConfig[] = [
  {
    region: 'us-west-2',
    label: 'United States',
    apiUrl: 'https://us.api.filedeadrop.com',
    frontendOrigin: 'https://us.filedeadrop.com',
    hostnames: ['filedeadrop.com', 'www.filedeadrop.com', 'us.filedeadrop.com'],
  },
  {
    region: 'eu-central-1',
    label: 'European Union',
    apiUrl: 'https://eu.api.filedeadrop.com',
    frontendOrigin: 'https://eu.filedeadrop.com',
    hostnames: ['eu.filedeadrop.com'],
  },
]

// Derived — do not edit by hand; add/edit entries in REGIONS above.
export const SUPPORTED_REGIONS = REGIONS.map(r => ({ value: r.region, label: r.label }))

export const REGION_API_URLS: Record<string, string> =
  Object.fromEntries(REGIONS.map(r => [r.region, r.apiUrl]))

export const REGION_FRONTEND_ORIGINS: Record<string, string> =
  Object.fromEntries(REGIONS.map(r => [r.region, r.frontendOrigin]))

export const HOSTNAME_API_URLS: Record<string, string> =
  Object.fromEntries(REGIONS.flatMap(r => r.hostnames.map(h => [h, r.apiUrl])))
