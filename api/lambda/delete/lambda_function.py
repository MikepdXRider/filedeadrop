# boto3 is AWS's official Python SDK — the Python equivalent of the JavaScript @aws-sdk/* packages.
# Key difference: boto3 comes pre-installed in every Lambda Python runtime.
# In JS, @aws-sdk packages are either bundled by you or provided by the runtime.
# In Python, you never need to install or zip boto3 — it's just there.
import boto3
import json


# Module-level constants and clients are defined outside the handler function.
# This is important for Lambda performance: Lambda reuses the same execution
# environment ("warm starts") across invocations. Anything defined at module level
# is initialized once and reused, rather than re-created on every request.
# This is the same reason the JS version defined s3 and BUCKET outside the handler.
BUCKET = "ephemeral-uploads"

# boto3.client('s3') creates a low-level S3 client.
# This is the Python equivalent of: new S3Client({}) in JavaScript.
# The empty {} in JS meant "use default config" — boto3 does the same here with no arguments.
# boto3 automatically reads credentials and region from the Lambda execution role,
# exactly like the JS SDK did.
s3 = boto3.client('s3')


def lambda_handler(event, context):
    # event.get('pathParameters') returns None if the key doesn't exist (safe access).
    # Chaining a second .get('id') on the result would fail if the first returned None,
    # so we use a fallback empty dict {} as the default for the first .get().
    # This is Python's equivalent of JS optional chaining: event.pathParameters?.id
    key = event.get('pathParameters', {}).get('id')

    # Python uses 'not' instead of '!' for boolean negation.
    # 'not key' is True if key is None or an empty string.
    if not key:
        # json.dumps() serializes a Python dict to a JSON string.
        # This is the direct equivalent of JSON.stringify() in JavaScript.
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Share key is required'})
        }

    # Python uses try/except instead of try/catch.
    # 'Exception' is the base class for most runtime errors in Python —
    # equivalent to catching a generic Error in JavaScript.
    # 'as e' binds the exception to the variable e, like 'catch (error)' in JS.
    try:
        # boto3 uses a method-call style rather than the command/send pattern in JS.
        # JS: await s3.send(new DeleteObjectCommand({ Bucket, Key }))
        # Python: s3.delete_object(Bucket=BUCKET, Key=key)
        #
        # Python uses keyword arguments (Bucket=, Key=) rather than passing an object.
        # boto3 S3 delete_object returns 204 even if the key doesn't exist —
        # same behaviour as the JS SDK's DeleteObjectCommand.
        s3.delete_object(Bucket=BUCKET, Key=key)

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'OK'})
        }

    except Exception as e:
        # str(e) converts the exception to its string message.
        # In JS this was error.message — Python exceptions don't have a .message
        # attribute by convention; str() is the idiomatic way to get the description.
        print(f"Error deleting object: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
