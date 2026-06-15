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

output "eu_api_url" {
  description = "EU (Frankfurt) API base URL"
  value       = module.eu.api_url
}

output "eu_s3_bucket" {
  description = "EU S3 bucket name"
  value       = module.eu.s3_bucket_name
}

output "eu_dynamodb_table" {
  description = "EU DynamoDB table name"
  value       = module.eu.dynamodb_table_name
}
