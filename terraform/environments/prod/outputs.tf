output "prod_api_url" {
  description = "Production API base URL"
  value       = module.prod.api_url
}

output "prod_s3_bucket" {
  description = "Production S3 bucket name"
  value       = module.prod.s3_bucket_name
}

output "prod_dynamodb_table" {
  description = "Production DynamoDB table name"
  value       = module.prod.dynamodb_table_name
}
