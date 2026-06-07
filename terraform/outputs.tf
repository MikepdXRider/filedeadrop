output "dev_api_url" {
  description = "Dev environment API base URL"
  value       = module.dev.api_url
}

output "dev_s3_bucket" {
  description = "Dev S3 bucket name"
  value       = module.dev.s3_bucket_name
}

output "dev_dynamodb_table" {
  description = "Dev DynamoDB table name"
  value       = module.dev.dynamodb_table_name
}
