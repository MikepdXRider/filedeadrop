import boto3
import json
import time  # Python's standard library module for time-related functions


ITEM_TYPE = "META"
BUCKET = "ephemeral-uploads"
TABLE = "ephemeral-uploads"
PRESIGNED_URL_EXPIRY = 30


# boto3 has two interfaces for AWS services: client and resource.
# We used client in delete/lambda_function.py for S3.
# Here we introduce the resource interface for DynamoDB.
#
# boto3.client  — low-level, maps directly to AWS API calls.
#                 Values must be typed explicitly: {'S': 'hello'} or {'N': '42'}
#
# boto3.resource — high-level, object-oriented interface that handles
#                  Python-to-DynamoDB type marshaling automatically.
#                  You pass plain Python values (strings, ints) and boto3
#                  translates them to DynamoDB's wire format behind the scenes.
#                  This is the Python equivalent of JS's DynamoDBDocumentClient.
#
# We use resource for DynamoDB so we can work with plain Python dicts and values,
# and client for S3 because S3 doesn't have the same typing complexity.
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE)  # .Table() returns a Table object bound to this table name
s3 = boto3.client('s3')


def lambda_handler(event, context):
    key = event.get('pathParameters', {}).get('id')

    if not key:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Share key is required'})
        }

    try:
        # table.delete_item() performs a conditional delete and returns the old item.
        # This is the Python equivalent of:
        #   docClient.send(new DeleteCommand({ TableName, Key, ReturnValues: "ALL_OLD" }))
        #
        # Key insight: this is atomic — if two requests arrive simultaneously,
        # only one will find the item and get Attributes back. The other gets an empty
        # response. This is the race-condition protection described in CLAUDE.md.
        #
        # Note: keyword argument style again — Key= is a dict of the primary key fields.
        response = table.delete_item(
            Key={
                'documentId': key,
                'itemType': ITEM_TYPE
            },
            ReturnValues='ALL_OLD'
        )

        # When ReturnValues='ALL_OLD', the deleted item is returned under 'Attributes'.
        # If the item didn't exist, 'Attributes' is absent from the response entirely.
        # .get('Attributes') safely returns None in that case — no KeyError.
        # This is the Python equivalent of: const { Attributes: item } = await docClient.send(...)
        item = response.get('Attributes')

        if not item:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Share link not found'})
            }

        # int(time.time()) returns the current Unix timestamp as an integer (seconds since epoch).
        # This is the Python equivalent of: Math.floor(Date.now() / 1000)
        #
        # Important nuance: boto3's DynamoDB resource interface returns numeric values
        # as Python's Decimal type (from the 'decimal' module), not plain int or float.
        # Decimal is used to avoid floating-point precision loss that can occur with
        # large DynamoDB numbers. Comparing Decimal to int works correctly in Python,
        # so no explicit conversion is needed here — but it's worth knowing Decimal
        # exists if you ever need to serialize the value to JSON (json.dumps doesn't
        # handle Decimal by default and will raise a TypeError).
        if item['expiresAt'] < int(time.time()):
            # Orphaned S3 cleanup — same logic as the JS version.
            s3.delete_object(Bucket=BUCKET, Key=item['fileKey'])
            return {
                'statusCode': 410,
                'body': json.dumps({'error': 'Share link has expired'})
            }

        # generate_presigned_url() is boto3's equivalent of getSignedUrl() from
        # @aws-sdk/s3-request-presigner in JavaScript.
        #
        # The call shape is quite different:
        #   JS:     getSignedUrl(s3Client, new GetObjectCommand({ Bucket, Key }), { expiresIn })
        #   Python: s3.generate_presigned_url('get_object', Params={...}, ExpiresIn=...)
        #
        # The first argument is the S3 operation name as a lowercase string ('get_object',
        # 'put_object', etc.) rather than a Command class instance.
        # Params is a dict of the operation's parameters.
        # ExpiresIn is in seconds, same as JS.
        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': BUCKET,
                'Key': item['fileKey']
            },
            ExpiresIn=PRESIGNED_URL_EXPIRY
        )

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'presignedUrl': presigned_url})
        }

    except Exception as e:
        print(f"Error processing view request: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
