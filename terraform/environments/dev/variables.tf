# Dev environment input variables — sensitive values (route53_zone_id, dev_api_key)
# are supplied at apply time via secrets.tfvars or TF_VAR_* env vars and are
# never committed to the repository. frontend_origins is safe to commit and
# lives in terraform.tfvars.

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
  default     = ["http://localhost:5173"]
}
