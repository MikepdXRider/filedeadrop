export const handler = async (event) => {
  if (!process.env.CLOUDFRONT_SECRET) {
    console.error("Missing CLOUDFRONT_SECRET var")
    return { isAuthorized: false }
  }

  const secret = event.headers['x-cloudfront-secret'];

  if (!secret || secret !== process.env.CLOUDFRONT_SECRET) {
    console.warn('Unauthorized request - invalid or missing CloudFront secret')
    return { isAuthorized: false };
  }
  
  return { isAuthorized: true };
};
