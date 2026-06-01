# Python's standard library is imported with 'import' statements at the top of the file.
# Unlike JavaScript's ES module 'import ... from', Python imports the whole module
# and you reference its contents with dot notation (e.g. os.environ).
# 'os' gives access to the operating system interface, including environment variables.
import os


# In Python, Lambda's entry point is a plain function — not async.
# Python Lambdas are synchronous by default. You can use asyncio if needed,
# but it adds complexity and is uncommon for simple request/response handlers.
#
# The handler MUST accept two arguments:
#   event   — a plain Python dict containing the incoming request data
#              (headers, body, path params, etc.) — equivalent to the JS 'event' object
#   context — a Lambda-provided object with runtime metadata (function name,
#              remaining time, etc.). We don't use it here but it must be declared.
#
# In AWS, this file's handler is configured as: lambda_function.lambda_handler
# That means: "in the file lambda_function.py, call the function named lambda_handler"
# This mirrors how the JS version used index.mjs with an exported 'handler' function.
def lambda_handler(event, context):

    # os.environ is a dict-like object holding all environment variables.
    # .get('KEY') returns None if the key is missing — it never raises an error.
    # This is safer than os.environ['KEY'], which would raise a KeyError if missing.
    # Equivalent to JS: process.env.CLOUDFRONT_SECRET
    cloudfront_secret = os.environ.get('CLOUDFRONT_SECRET')

    if not cloudfront_secret:
        # In Python, print() writes to stdout, which Lambda automatically streams
        # to CloudWatch Logs — the same behaviour as JS console.error().
        # There is no built-in console object in Python.
        print("Missing CLOUDFRONT_SECRET environment variable")
        return {"isAuthorized": False}

    # In Python, event is a plain dict — not a JS object with dot-access.
    # Dict values are accessed with square brackets: event['key']
    # .get() is the safe version: returns None if the key doesn't exist
    # instead of raising a KeyError.
    #
    # API Gateway HTTP API lowercases all header names before passing them to Lambda,
    # so 'x-cloudfront-secret' is always lowercase here — same behaviour as in JS.
    #
    # Equivalent to JS: event.headers['x-cloudfront-secret']
    secret = event.get('headers', {}).get('x-cloudfront-secret')

    # 'not secret' is True if secret is None or an empty string — covers both cases.
    # Python uses 'or' instead of JS '||' for logical OR.
    # String comparison with '!=' works identically to JS.
    if not secret or secret != cloudfront_secret:
        print("Unauthorized request — invalid or missing CloudFront secret")
        return {"isAuthorized": False}

    # Python dicts use the same key: value syntax as JS objects,
    # but with double-quoted strings for keys (single quotes also valid).
    # There is no JSON.stringify needed here — API Gateway HTTP API
    # accepts a raw dict as the authorizer response and handles serialization itself.
    return {"isAuthorized": True}
