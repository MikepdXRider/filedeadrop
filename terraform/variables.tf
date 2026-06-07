variable "route53_zone_id" {
  description = "Hosted zone ID for filedeadrop.com"
  type        = string
}

variable "dev_api_key" {
  description = "Shared API key for dev environment access — pass via TF_VAR_dev_api_key or a gitignored secrets.tfvars"
  type        = string
  sensitive   = true
  default     = null
}

variable "frontend_origins" {
  description = "Allowed CORS origins for the dev API"
  type        = list(string)
  default     = ["https://filedeadrop.com", "https://www.filedeadrop.com", "http://localhost:5173"]
}
