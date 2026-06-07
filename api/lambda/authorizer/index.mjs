const MAX_PAYLOAD_BYTES = 10 * 1024; // 10KB

export const handler = async (event) => {
  const contentLength = event.headers?.['content-length'];

  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    console.warn(`Request denied — content-length ${contentLength} exceeds ${MAX_PAYLOAD_BYTES} bytes`);
    return { isAuthorized: false };
  }

  return { isAuthorized: true };
};
