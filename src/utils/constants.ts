export const DEFAULT_REGION = 'us-west-2'
export const AES_KEY_LENGTH = 128       // bits
export const AES_IV_LENGTH = 12         // bytes, standard for AES-GCM
export const AES_GCM_TAG_LENGTH = 16   // bytes, appended by crypto.subtle.encrypt
export const MAX_FILE_SIZE_MB = 25
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
