output "api_url" {
  description = "Base URL for the API (custom domain)"
  value       = "https://${aws_apigatewayv2_domain_name.api.domain_name}"
}

output "api_gateway_id" {
  description = "HTTP API ID"
  value       = aws_apigatewayv2_api.main.id
}

output "s3_bucket_name" {
  description = "S3 bucket for encrypted file storage"
  value       = aws_s3_bucket.files.id
}

output "dynamodb_table_name" {
  description = "DynamoDB table for file metadata"
  value       = aws_dynamodb_table.metadata.id
}

output "lambda_upload_arn" {
  description = "ARN of the upload Lambda function"
  value       = aws_lambda_function.upload.arn
}

output "lambda_view_arn" {
  description = "ARN of the view Lambda function"
  value       = aws_lambda_function.view.arn
}

output "lambda_delete_arn" {
  description = "ARN of the delete Lambda function"
  value       = aws_lambda_function.delete.arn
}

output "lambda_authorizer_arn" {
  description = "ARN of the authorizer Lambda function"
  value       = aws_lambda_function.authorizer.arn
}
