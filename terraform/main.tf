terraform {
  required_version = "~> 1.14"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "filedeadrop-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "filedeadrop-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-west-2"
}

module "dev" {
  source = "./modules/regional"

  env             = "dev"
  region          = "us-west-2"
  api_domain      = "dev-api.filedeadrop.com"
  frontend_origins = var.frontend_origins
  route53_zone_id = var.route53_zone_id

  upload_rate_limit   = 50
  upload_burst_limit  = 100
  default_rate_limit  = 50
  default_burst_limit = 100
  dev_api_key         = var.dev_api_key
}
