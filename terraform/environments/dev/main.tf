# Dev environment entry point — provisions the full regional stack for the dev
# environment in us-west-2. State is stored in the shared S3 backend; the key
# is unchanged from the original root config to avoid a state migration on a
# live environment. To add production, see environments/prod/main.tf.

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
    key          = "terraform.tfstate"
    region       = "us-west-2"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region = "us-west-2"
}

# Shared-account dependency: dev and prod run in the SAME AWS account (us-west-2).
# The regional module's API Gateway stage enables access logging, which requires an
# account-wide CloudWatch Logs role (aws_api_gateway_account) — a single per-account/region
# setting owned by the prod config (see environments/prod/main.tf). So dev's access logging
# relies on prod having been applied. Fine for the current single-account setup; if dev and prod
# are ever split into separate accounts, dev must own its own aws_api_gateway_account + role.
module "dev" {
  source = "../../modules/regional"

  env               = "dev"
  lambda_source_dir = "${path.module}/../../../api/lambda"
  api_domain        = "dev.api.filedeadrop.com"
  frontend_origins  = var.frontend_origins
  route53_zone_id   = var.route53_zone_id

  upload_rate_limit   = 50
  upload_burst_limit  = 100
  default_rate_limit  = 50
  default_burst_limit = 100
  dev_api_key         = var.dev_api_key
}
