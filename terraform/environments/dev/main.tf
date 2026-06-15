# Dev environment entry point — provisions the full regional stack for the dev
# environment in us-west-2. State is stored in the shared S3 backend (key is
# unchanged from the original root config to avoid a state migration on a live
# environment). To add production, see environments/prod/main.tf.

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

module "dev" {
  source = "../../modules/regional"

  env               = "dev"
  region            = "us-west-2"
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
