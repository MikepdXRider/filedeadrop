import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});
const dynamo = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamo);

const ITEM_TYPE = "META"
const RECEIPT_ITEM_TYPE = "RECEIPT"
const BUCKET = process.env.BUCKET_NAME;
const TABLE = process.env.TABLE_NAME;
const PRESIGNED_URL_EXPIRY = 30;

async function markReceiptStatus(receiptId, updateExpression, values, condition = 'attribute_exists(documentId)') {
  try {
    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { documentId: receiptId, itemType: RECEIPT_ITEM_TYPE },
      UpdateExpression: updateExpression,
      ConditionExpression: condition,
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: values,
    }))
  } catch (err) {
    console.error('Failed to update receipt status:', err)
    // non-fatal — the file access/cleanup itself already succeeded
  }
}

export const handler = async (event) => {
  try {
    const key = event.pathParameters?.id

    if (!key) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Share key is required' })
      }
    }

    const { Attributes: item } = await docClient.send(new DeleteCommand({
      TableName: TABLE,
      Key: {
        documentId: key,
        itemType: ITEM_TYPE
      },
      ReturnValues: "ALL_OLD"
    }))

    if (!item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Share link not found' })
      }
    }

    if (item.expiresAt < Math.floor(Date.now() / 1000)) {
      // cleanup orphaned S3 object
      await s3.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: item.fileKey
      }))

      if (item.receiptId) {
        const now = Math.floor(Date.now() / 1000)
        await markReceiptStatus(
          item.receiptId,
          'SET #status = :expired, deletedAt = :now',
          { ':expired': 'expired', ':now': now, ':pending': 'pending' },
          '#status = :pending'
        )
      }

      return {
        statusCode: 410,
        body: JSON.stringify({ error: 'Share link has expired' })
      }
    }

    const presignedUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: BUCKET,
      Key: item.fileKey,
    }), { expiresIn: PRESIGNED_URL_EXPIRY })

    if (item.receiptId) {
      const now = Math.floor(Date.now() / 1000)
      await markReceiptStatus(
        item.receiptId,
        'SET #status = :accessed, accessedAt = :now, deletedAt = :now',
        { ':accessed': 'accessed', ':now': now }
      )
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ presignedUrl })
    }

  } catch (error) {
    console.error(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' })
    }
  }
}