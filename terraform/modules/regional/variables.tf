variable "env" {
  description = "Environment prefix applied to all resource names (e.g. dev, prod)"
  type        = string
}

variable "region" {
  description = "AWS region for this regional slice"
  type        = string
  default     = "us-west-2"
}

variable "api_domain" {
  description = "Custom API subdomain (e.g. dev-api.filedeadrop.com)"
  type        = string
}

variable "frontend_origins" {
  description = "Allowed CORS origins — exact frontend URLs, no trailing slash"
  type        = list(string)
}

variable "route53_zone_id" {
  description = "Hosted zone ID for filedeadrop.com (pre-existing, not managed here)"
  type        = string
}

variable "upload_rate_limit" {
  description = "Requests per second throttle on PUT /upload"
  type        = number
  default     = 100
}

variable "upload_burst_limit" {
  description = "Burst throttle on PUT /upload"
  type        = number
  default     = 200
}

variable "default_rate_limit" {
  description = "Requests per second throttle on all other routes"
  type        = number
  default     = 100
}

variable "default_burst_limit" {
  description = "Burst throttle on all other routes"
  type        = number
  default     = 200
}

variable "dev_api_key" {
  description = "When set, all requests must include a matching x-api-key header. Leave null for production."
  type        = string
  sensitive   = true
  default     = null
}
