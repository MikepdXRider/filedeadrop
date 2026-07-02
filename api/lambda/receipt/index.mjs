import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const dynamo = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamo);
const TABLE = process.env.TABLE_NAME;
const ITEM_TYPE = 'META'
const RECEIPT_ITEM_TYPE = 'RECEIPT'

export const handler = async (event) => {
  try {
    const token = event.pathParameters?.id

    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Receipt token is required' })
      }
    }

    const { Item: receipt } = await docClient.send(new GetCommand({
      TableName: TABLE,
      Key: { documentId: token, itemType: RECEIPT_ITEM_TYPE },
    }))

    const now = Math.floor(Date.now() / 1000)
    if (!receipt || receipt.expiresAt < now) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Receipt not found' })
      }
    }

    if (receipt.status !== 'pending') {
      // 'accessed' or 'expired' — both are confirmed, real writes from view/expiry
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: receipt.status,
          uploadedAt: receipt.uploadedAt,
          accessedAt: receipt.accessedAt,
          deletedAt: receipt.deletedAt,
          fileExpiresAt: receipt.fileExpiresAt,
        })
      }
    }

    // status still 'pending' — derive expired vs pending from whether the file record still exists.
    // If gone without ever being marked accessed, this is the rare double-failure fallback
    // (scheduler never fired, nobody hit the dead link): report expired with deletedAt: null
    // ("presumed, not confirmed") rather than guessing a timestamp.
    const { Item: file } = await docClient.send(new GetCommand({
      TableName: TABLE,
      Key: { documentId: receipt.fileId, itemType: ITEM_TYPE },
    }))

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: (file && file.expiresAt >= now) ? 'pending' : 'expired',
        uploadedAt: receipt.uploadedAt,
        accessedAt: null,
        deletedAt: null,
        fileExpiresAt: receipt.fileExpiresAt,
      })
    }
  } catch (error) {
    console.error(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' })
    }
  }
}
