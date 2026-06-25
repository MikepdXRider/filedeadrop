import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";

const s3 = new S3Client({});
const dynamo = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamo);
const scheduler = new SchedulerClient({});

const BUCKET = process.env.BUCKET_NAME;
const TABLE = process.env.TABLE_NAME;
const EXPIRY_LAMBDA_ARN = process.env.EXPIRY_LAMBDA_ARN;
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN;
const SCHEDULE_GROUP_NAME = process.env.SCHEDULE_GROUP_NAME;
const ITEM_TYPE = "META";
const AES_GCM_OVERHEAD = 12 + 16; // IV + auth tag prepended/appended by AES-GCM
const MAX_FILE_SIZE = 25 * 1024 * 1024 + AES_GCM_OVERHEAD;

export const handler = async (event) => {
  try {
    const { fileSize } = JSON.parse(event.body ?? '{}');

    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
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

    const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: {
        documentId: fileId,
        itemType: ITEM_TYPE,
        fileKey: fileId,
        expiresAt,
      }
    }));

    try {
      // EventBridge Scheduler one-time format: at(yyyy-MM-ddTHH:mm:ss) UTC, no ms or Z suffix
      const scheduleExpr = `at(${new Date(expiresAt * 1000).toISOString().slice(0, 19)})`;
      await scheduler.send(new CreateScheduleCommand({
        Name: fileId,
        GroupName: SCHEDULE_GROUP_NAME,
        ScheduleExpression: scheduleExpr,
        FlexibleTimeWindow: { Mode: 'OFF' },
        Target: {
          Arn: EXPIRY_LAMBDA_ARN,
          RoleArn: SCHEDULER_ROLE_ARN,
          Input: JSON.stringify({ fileId }),
        },
        ActionAfterCompletion: 'DELETE',
      }));
    } catch (scheduleError) {
      console.error('Failed to create expiry schedule:', scheduleError);
    }

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
