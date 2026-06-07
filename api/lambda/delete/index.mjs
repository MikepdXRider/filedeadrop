import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

const BUCKET = process.env.BUCKET_NAME;

export const handler = async (event) => {
  try {
    const key = event.pathParameters?.id

    if (!key) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Share key is required' })
      }
    }

    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key
    }))
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OK' })
    }
  } catch (error) {
    console.error(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
