import boto3
import json
import time
import uuid    # Python's standard library module for generating UUIDs
import base64  # Python's standard library module for base64 encoding/decoding


BUCKET = "ephemeral-uploads"
TABLE = "ephemeral-uploads"
ITEM_TYPE = "META"
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB in bytes — same arithmetic as JS

# Reusing the same boto3 patterns established in view/lambda_function.py:
# resource for DynamoDB (automatic type marshaling), client for S3.
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE)
s3 = boto3.client('s3')


def lambda_handler(event, context):
    try:
        # event.get('body') returns None if there's no body, e.g. a GET request.
        # The 'or' operator returns the right-hand side when the left is falsy
        # (None, empty string, 0, False, empty list, etc.).
        # So if body is None or '', we fall back to '{}' before parsing.
        # This is Python's idiomatic equivalent of JS's nullish coalescing: event.body ?? '{}'
        #
        # json.loads() parses a JSON string into a Python dict — equivalent to JSON.parse().
        body = json.loads(event.get('body') or '{}')

        # dict.get('key') returns None if the key is absent — no KeyError.
        # Equivalent to destructuring in JS: const { fileSize } = JSON.parse(...)
        file_size = body.get('fileSize')

        # 'not file_size' covers both None (missing) and 0 (falsy number).
        if not file_size or file_size > MAX_FILE_SIZE:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'File must be 25MB or under'})
            }

        # UUID GENERATION
        # JS used: crypto.randomUUID() → strip hyphens → hex bytes → base64url
        # Python can do this more directly.
        #
        # uuid.uuid4() generates a random UUID v4 object (same algorithm as crypto.randomUUID()).
        # .bytes gives us the 16 raw bytes of the UUID directly —
        # no need to go through a hex string and strip hyphens like the JS version did.
        #
        # BASE64URL ENCODING
        # base64.urlsafe_b64encode() encodes bytes using the URL-safe alphabet
        # (uses - and _ instead of + and /), equivalent to JS's .toString('base64url').
        #
        # Standard base64 pads the output with '=' characters to make length a multiple of 4.
        # URL-safe base64 (base64url) strips that padding — .rstrip(b'=') removes it.
        # rstrip() strips characters from the RIGHT end of a bytes object.
        # b'=' is a bytes literal (the b prefix) — rstrip expects the same type as its input.
        #
        # .decode('utf-8') converts the bytes object returned by base64 functions
        # into a plain Python string. base64 functions return bytes, not str —
        # this is a Python distinction JS doesn't have (JS strings are always Unicode).
        file_id = base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip(b'=').decode('utf-8')

        # generate_presigned_url for a PUT (upload) operation.
        # 'put_object' is the S3 operation name — lowercase, underscore-separated.
        # This is equivalent to JS's: getSignedUrl(s3, new PutObjectCommand({ Bucket, Key }), { expiresIn: 30 })
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET,
                'Key': file_id
            },
            ExpiresIn=30
        )

        # table.put_item() writes a new item to DynamoDB.
        # Equivalent to JS's: docClient.send(new PutCommand({ TableName, Item }))
        # Because we're using boto3.resource (the high-level interface), we pass
        # plain Python types — strings and ints — and boto3 handles the DynamoDB
        # type annotations automatically. With boto3.client we'd need to write:
        # {'documentId': {'S': file_id}, 'expiresAt': {'N': str(...)}} etc.
        table.put_item(Item={
            'documentId': file_id,
            'itemType': ITEM_TYPE,
            'fileKey': file_id,
            # int(time.time()) + (24 * 60 * 60) is identical in intent to:
            # Math.floor(Date.now() / 1000) + (24 * 60 * 60)
            # Both produce a Unix timestamp 24 hours from now.
            'expiresAt': int(time.time()) + (24 * 60 * 60)
        })

        return {
            'statusCode': 200,
            'body': json.dumps({
                'presignedUrl': presigned_url,
                'sharePath': f'/view/{file_id}'
                # f'/view/{file_id}' is a Python f-string —
                # equivalent to JS template literal: `/view/${fileId}`
            })
        }

    except Exception as e:
        print(f"Error processing upload request: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
