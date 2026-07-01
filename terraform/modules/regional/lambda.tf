# Lambda functions — packages and deploys the five Node.js handlers that form
# the API backend. archive_file zips each handler from source at apply time;
# source_code_hash ensures AWS receives the updated zip whenever the source
# changes. Each function gets its own IAM execution role (defined in iam.tf)
# and the environment variables it needs to locate its S3 bucket and DynamoDB
# table. The authorizer runs on every request before any route handler fires.

data "archive_file" "upload" {
  type        = "zip"
  source_file = "${var.lambda_source_dir}/upload/index.mjs"
  output_path = "${path.root}/dist/${var.env}/upload.zip"
}

data "archive_file" "view" {
  type        = "zip"
  source_file = "${var.lambda_source_dir}/view/index.mjs"
  output_path = "${path.root}/dist/${var.env}/view.zip"
}

data "archive_file" "delete" {
  type        = "zip"
  source_file = "${var.lambda_source_dir}/delete/index.mjs"
  output_path = "${path.root}/dist/${var.env}/delete.zip"
}

data "archive_file" "authorizer" {
  type        = "zip"
  source_file = "${var.lambda_source_dir}/authorizer/index.mjs"
  output_path = "${path.root}/dist/${var.env}/authorizer.zip"
}

data "archive_file" "expiry" {
  type        = "zip"
  source_file = "${var.lambda_source_dir}/expiry/index.mjs"
  output_path = "${path.root}/dist/${var.env}/expiry.zip"
}

data "archive_file" "receipt" {
  type        = "zip"
  source_file = "${var.lambda_source_dir}/receipt/index.mjs"
  output_path = "${path.root}/dist/${var.env}/receipt.zip"
}


# CloudWatch log groups — declared explicitly so retention is capped at 30 days,
# matching the API Gateway access logs. Without these, Lambda auto-creates each
# group on first invocation with no expiry, retaining logs indefinitely. Each
# function depends on its group so the group exists before any invocation.

resource "aws_cloudwatch_log_group" "upload" {
  name              = "/aws/lambda/${var.env}-filedeadrop-upload"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "view" {
  name              = "/aws/lambda/${var.env}-filedeadrop-view"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "delete" {
  name              = "/aws/lambda/${var.env}-filedeadrop-delete"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "authorizer" {
  name              = "/aws/lambda/${var.env}-filedeadrop-authorizer"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "expiry" {
  name              = "/aws/lambda/${var.env}-filedeadrop-expiry"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "receipt" {
  name              = "/aws/lambda/${var.env}-filedeadrop-receipt"
  retention_in_days = 30
}


resource "aws_lambda_function" "upload" {
  function_name    = "${var.env}-filedeadrop-upload"
  role             = aws_iam_role.upload_exec.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.upload.output_path
  source_code_hash = data.archive_file.upload.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      BUCKET_NAME         = aws_s3_bucket.files.id
      TABLE_NAME          = aws_dynamodb_table.metadata.id
      EXPIRY_LAMBDA_ARN   = aws_lambda_function.expiry.arn
      SCHEDULER_ROLE_ARN  = aws_iam_role.scheduler_exec.arn
      SCHEDULE_GROUP_NAME = aws_scheduler_schedule_group.main.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.upload]
}

resource "aws_lambda_function" "view" {
  function_name    = "${var.env}-filedeadrop-view"
  role             = aws_iam_role.view_exec.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.view.output_path
  source_code_hash = data.archive_file.view.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.files.id
      TABLE_NAME  = aws_dynamodb_table.metadata.id
    }
  }

  depends_on = [aws_cloudwatch_log_group.view]
}

resource "aws_lambda_function" "delete" {
  function_name    = "${var.env}-filedeadrop-delete"
  role             = aws_iam_role.delete_exec.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.delete.output_path
  source_code_hash = data.archive_file.delete.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.files.id
    }
  }

  depends_on = [aws_cloudwatch_log_group.delete]
}

resource "aws_lambda_function" "authorizer" {
  function_name    = "${var.env}-filedeadrop-authorizer"
  role             = aws_iam_role.authorizer_exec.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.authorizer.output_path
  source_code_hash = data.archive_file.authorizer.output_base64sha256
  timeout          = 10

  dynamic "environment" {
    for_each = var.dev_api_key != null ? [1] : []
    content {
      variables = {
        DEV_API_KEY = var.dev_api_key
      }
    }
  }

  depends_on = [aws_cloudwatch_log_group.authorizer]
}

resource "aws_lambda_permission" "authorizer" {
  statement_id  = "AllowAPIGatewayInvokeAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/authorizers/${aws_apigatewayv2_authorizer.lambda.id}"
}

resource "aws_lambda_permission" "upload" {
  statement_id  = "AllowAPIGatewayInvokeUpload"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/${aws_apigatewayv2_stage.default.name}/PUT/upload"
}

resource "aws_lambda_permission" "view" {
  statement_id  = "AllowAPIGatewayInvokeView"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.view.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/${aws_apigatewayv2_stage.default.name}/GET/view/*"
}

resource "aws_lambda_permission" "delete" {
  statement_id  = "AllowAPIGatewayInvokeDelete"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/${aws_apigatewayv2_stage.default.name}/DELETE/delete/*"
}

resource "aws_lambda_function" "expiry" {
  function_name    = "${var.env}-filedeadrop-expiry"
  role             = aws_iam_role.expiry_exec.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.expiry.output_path
  source_code_hash = data.archive_file.expiry.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.files.id
      TABLE_NAME  = aws_dynamodb_table.metadata.id
    }
  }

  depends_on = [aws_cloudwatch_log_group.expiry]
}

resource "aws_lambda_function" "receipt" {
  function_name    = "${var.env}-filedeadrop-receipt"
  role             = aws_iam_role.receipt_exec.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.receipt.output_path
  source_code_hash = data.archive_file.receipt.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.metadata.id
    }
  }

  depends_on = [aws_cloudwatch_log_group.receipt]
}

resource "aws_lambda_permission" "receipt" {
  statement_id  = "AllowAPIGatewayInvokeReceipt"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.receipt.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/${aws_apigatewayv2_stage.default.name}/GET/receipt/*"
}

