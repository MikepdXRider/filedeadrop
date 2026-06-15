# IAM — execution roles and policies for all four Lambda functions, following
# least-privilege: each function gets only the specific S3 and DynamoDB actions
# it actually calls. A shared local (lambda_trust_policy) avoids repeating the
# assume-role boilerplate. The API Gateway CloudWatch role is account-scoped —
# applying it overwrites the CloudWatch Logs role for all API Gateway APIs in
# the region, not just this one. Verify no existing role is in use before the
# first apply: aws apigateway get-account --region us-west-2

# NOTE: aws_api_gateway_account is account-scoped, not per-API.
# Applying this resource sets the CloudWatch Logs role for ALL API Gateway
# APIs in this AWS account and region. If a role is already configured,
# this will overwrite it. Coordinate before applying in a shared account.
# Check current setting: aws apigateway get-account --region us-west-2

locals {
  lambda_trust_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# --- Upload ---

resource "aws_iam_role" "upload_exec" {
  name               = "${var.env}-filedeadrop-upload-exec"
  assume_role_policy = local.lambda_trust_policy
}

resource "aws_iam_role_policy_attachment" "upload_basic" {
  role       = aws_iam_role.upload_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "upload_resources" {
  name = "${var.env}-filedeadrop-upload-resources"
  role = aws_iam_role.upload_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.files.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem"]
        Resource = aws_dynamodb_table.metadata.arn
      }
    ]
  })
}

# --- View ---

resource "aws_iam_role" "view_exec" {
  name               = "${var.env}-filedeadrop-view-exec"
  assume_role_policy = local.lambda_trust_policy
}

resource "aws_iam_role_policy_attachment" "view_basic" {
  role       = aws_iam_role.view_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "view_resources" {
  name = "${var.env}-filedeadrop-view-resources"
  role = aws_iam_role.view_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.files.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:DeleteItem"]
        Resource = aws_dynamodb_table.metadata.arn
      }
    ]
  })
}

# --- Delete ---

resource "aws_iam_role" "delete_exec" {
  name               = "${var.env}-filedeadrop-delete-exec"
  assume_role_policy = local.lambda_trust_policy
}

resource "aws_iam_role_policy_attachment" "delete_basic" {
  role       = aws_iam_role.delete_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "delete_resources" {
  name = "${var.env}-filedeadrop-delete-resources"
  role = aws_iam_role.delete_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:DeleteObject"]
        Resource = "${aws_s3_bucket.files.arn}/*"
      }
    ]
  })
}

# --- Authorizer ---

resource "aws_iam_role" "authorizer_exec" {
  name               = "${var.env}-filedeadrop-authorizer-exec"
  assume_role_policy = local.lambda_trust_policy
}

resource "aws_iam_role_policy_attachment" "authorizer_basic" {
  role       = aws_iam_role.authorizer_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- API Gateway CloudWatch Logs (account-scoped) ---

resource "aws_iam_role" "apigw_cloudwatch" {
  name = "${var.env}-filedeadrop-apigw-logs"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apigw_cloudwatch" {
  role       = aws_iam_role.apigw_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.apigw_cloudwatch.arn
}
