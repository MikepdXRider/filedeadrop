resource "aws_s3_bucket" "files" {
  bucket = "${var.env}-filedeadrop-files"
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket = aws_s3_bucket.files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  cors_rule {
    allowed_origins = var.frontend_origins
    allowed_methods = ["PUT", "GET"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    id     = "expire-after-24h"
    status = "Enabled"

    filter {}

    expiration {
      days = 1
    }
  }
}

resource "aws_dynamodb_table" "metadata" {
  name         = "${var.env}-filedeadrop-metadata"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "documentId"
  range_key    = "itemType"

  attribute {
    name = "documentId"
    type = "S"
  }

  attribute {
    name = "itemType"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}
