# Production environment input variables — no dev_api_key (production uses a
# different auth scheme). Sensitive values are supplied via TF_VAR_* env vars
# from GitHub Secrets and are never committed to the repository.

variable "route53_zone_id" {
  description = "Hosted zone ID for filedeadrop.com"
  type        = string
}

variable "frontend_origins" {
  description = "Allowed CORS origins for the production API"
  type        = list(string)
  default     = ["https://filedeadrop.com", "https://www.filedeadrop.com"]
}
