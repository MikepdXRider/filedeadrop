import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const dynamo = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamo);

const BUCKET = process.env.BUCKET_NAME;
const TABLE = process.env.TABLE_NAME;
const RECEIPT_ITEM_TYPE = "RECEIPT";

export const handler = async (event) => {
  const { fileId, receiptId } = event;
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE,
      Key: { documentId: fileId, itemType: "META" },
    }));

    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: fileId,
    }));

    if (receiptId) {
      const now = Math.floor(Date.now() / 1000);
      try {
        await docClient.send(new UpdateCommand({
          TableName: TABLE,
          Key: { documentId: receiptId, itemType: RECEIPT_ITEM_TYPE },
          UpdateExpression: 'SET #status = :expired, deletedAt = :now',
          ConditionExpression: '#status = :pending',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':expired': 'expired', ':pending': 'pending', ':now': now },
        }));
      } catch (err) {
        if (err.name !== 'ConditionalCheckFailedException') {
          console.error(`Failed to expire receipt ${receiptId}:`, err);
          throw err;
        }
        // else: view already marked it 'accessed' — expected race, not an error
      }
    }

    console.log(`Expired file ${fileId}`);
  } catch (error) {
    console.error(`Failed to expire file ${fileId}:`, error);
    throw error;
  }
};
