const MAX_PAYLOAD_BYTES = 10 * 1024; // 10KB
const DEV_API_KEY = process.env.DEV_API_KEY;

export const handler = async (event) => {
  const contentLength = event.headers?.['content-length'];

  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    console.warn(`Request denied — content-length ${contentLength} exceeds ${MAX_PAYLOAD_BYTES} bytes`);
    return { isAuthorized: false };
  }

  if (DEV_API_KEY && event.headers?.['x-api-key'] !== DEV_API_KEY) {
    console.warn('Request denied — invalid or missing API key');
    return { isAuthorized: false };
  }

  return { isAuthorized: true };
};
