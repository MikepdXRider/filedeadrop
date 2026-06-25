import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const dynamo = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamo);

const BUCKET = process.env.BUCKET_NAME;
const TABLE = process.env.TABLE_NAME;

export const handler = async (event) => {
  const { fileId } = event;
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE,
      Key: { documentId: fileId, itemType: "META" },
    }));

    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: fileId,
    }));

    console.log(`Expired file ${fileId}`);
  } catch (error) {
    console.error(`Failed to expire file ${fileId}:`, error);
    throw error;
  }
};
