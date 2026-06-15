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

  env               = "prod"
  region            = "us-west-2"
  lambda_source_dir = "${path.module}/../../../api/lambda"
  api_domain        = "api.filedeadrop.com"
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
