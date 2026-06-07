import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});
const dynamo = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamo);

const BUCKET = "ephemeral-uploads";
const TABLE = "ephemeral-uploads";
const ITEM_TYPE = "META";
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const handler = async (event) => {
  try {
    const { fileSize } = JSON.parse(event.body ?? '{}');

    if (!fileSize || fileSize > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'File must be 25MB or under' })
      };
    }

    const fileId = Buffer.from(crypto.randomUUID().replace(/-/g, ''), 'hex').toString('base64url');

    const presignedUrl = await getSignedUrl(s3, new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileId,
      ContentLength: fileSize,
    }), { expiresIn: 30 });

    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: {
        documentId: fileId,
        itemType: ITEM_TYPE,
        fileKey: fileId,
        expiresAt: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      }
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        presignedUrl,
        sharePath: `/view/${fileId}`
      })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
