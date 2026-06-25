# Production environment entry point — provisions all production regional stacks.
# Add a module block per region as each is brought online. State is stored
# separately from dev so a merge to main never touches dev infrastructure.
# US production and EU (data residency) both live here — merging to main
# deploys all production regions simultaneously.

terraform {
  required_version = "~> 1.14"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket       = "filedeadrop-terraform-state"
    key          = "prod/terraform.tfstate"
    region       = "us-west-2"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region = "us-west-2"
}

provider "aws" {
  alias  = "eu_central_1"
  region = "eu-central-1"
}

module "prod" {
  source = "../../modules/regional"

  env               = "us"
  region            = "us-west-2"
  lambda_source_dir = "${path.module}/../../../api/lambda"
  api_domain        = "us.api.filedeadrop.com"
  frontend_origins  = var.frontend_origins
  route53_zone_id   = var.route53_zone_id

  upload_rate_limit   = 100
  upload_burst_limit  = 200
  default_rate_limit  = 100
  default_burst_limit = 200
}

module "eu" {
  source    = "../../modules/regional"
  providers = { aws = aws.eu_central_1 }

  env               = "eu"
  region            = "eu-central-1"
  lambda_source_dir = "${path.module}/../../../api/lambda"
  api_domain        = "eu.api.filedeadrop.com"
  frontend_origins  = var.frontend_origins
  route53_zone_id   = var.route53_zone_id

  upload_rate_limit   = 100
  upload_burst_limit  = 200
  default_rate_limit  = 100
  default_burst_limit = 200
}

# Account-scoped: API Gateway CloudWatch Logs role.
# aws_api_gateway_account is account+region scoped — one per AWS account per
# region. Managed here (prod) rather than in the shared module to avoid dev
# and prod competing to own the same setting on every apply.
# IAM roles are global — one role covers both US and EU API Gateway accounts.
resource "aws_iam_role" "apigw_cloudwatch" {
  name = "prod-filedeadrop-apigw-logs"
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

resource "aws_api_gateway_account" "us" {
  cloudwatch_role_arn = aws_iam_role.apigw_cloudwatch.arn
}

resource "aws_api_gateway_account" "eu" {
  provider            = aws.eu_central_1
  cloudwatch_role_arn = aws_iam_role.apigw_cloudwatch.arn
}
