data "archive_file" "upload" {
  type        = "zip"
  source_file = "${path.root}/../api/lambda/upload/index.mjs"
  output_path = "${path.module}/dist/upload.zip"
}

data "archive_file" "view" {
  type        = "zip"
  source_file = "${path.root}/../api/lambda/view/index.mjs"
  output_path = "${path.module}/dist/view.zip"
}

data "archive_file" "delete" {
  type        = "zip"
  source_file = "${path.root}/../api/lambda/delete/index.mjs"
  output_path = "${path.module}/dist/delete.zip"
}

data "archive_file" "authorizer" {
  type        = "zip"
  source_file = "${path.root}/../api/lambda/authorizer/index.mjs"
  output_path = "${path.module}/dist/authorizer.zip"
}

resource "aws_lambda_function" "upload" {
  function_name    = "${var.env}-filedeadrop-upload"
  role             = aws_iam_role.upload_exec.arn
  runtime          = "nodejs24.x"
  handler          = "index.handler"
  filename         = data.archive_file.upload.output_path
  source_code_hash = data.archive_file.upload.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.files.id
      TABLE_NAME  = aws_dynamodb_table.metadata.id
    }
  }
}

resource "aws_lambda_function" "view" {
  function_name    = "${var.env}-filedeadrop-view"
  role             = aws_iam_role.view_exec.arn
  runtime          = "nodejs24.x"
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
}

resource "aws_lambda_function" "delete" {
  function_name    = "${var.env}-filedeadrop-delete"
  role             = aws_iam_role.delete_exec.arn
  runtime          = "nodejs24.x"
  handler          = "index.handler"
  filename         = data.archive_file.delete.output_path
  source_code_hash = data.archive_file.delete.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.files.id
    }
  }
}

resource "aws_lambda_function" "authorizer" {
  function_name    = "${var.env}-filedeadrop-authorizer"
  role             = aws_iam_role.authorizer_exec.arn
  runtime          = "nodejs24.x"
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
}

resource "aws_lambda_permission" "authorizer" {
  statement_id  = "AllowAPIGatewayInvokeAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*"
}

resource "aws_lambda_permission" "upload" {
  statement_id  = "AllowAPIGatewayInvokeUpload"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "view" {
  statement_id  = "AllowAPIGatewayInvokeView"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.view.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "delete" {
  statement_id  = "AllowAPIGatewayInvokeDelete"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
