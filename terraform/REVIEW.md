# Terraform Review — Issues & Fixes

## Bugs / Will Break Things

- [x] **1. Dual deployment paths conflict** — `lambda.tf`
  `data "archive_file"` deploys Lambda code on every `terraform apply`, silently overwriting anything deployed by the GitHub Actions workflow (and vice versa). Reconcile: either let Terraform own Lambda code entirely (drop the GH Actions Lambda workflow), or remove `archive_file` and manage code via CI only, leaving Terraform to own function config.

- [x] **2. CORS `allow_headers` missing `x-api-key`** — `api_gateway.tf:8`
  The dev authorizer checks for `x-api-key`, but it's not in the API Gateway CORS `allow_headers` list. Browsers will block the preflight before the request reaches the authorizer.
  ```hcl
  allow_headers = ["Content-Type", "Content-Length", "x-api-key"]
  ```

- [x] **3. S3 lifecycle `days = 1` doesn't guarantee 24-hour expiry** — `storage.tf:36`
  AWS processes lifecycle rules once per day at a day boundary, so objects can survive anywhere from minutes to ~48 hours. DynamoDB TTL is the more reliable access-control gate — S3 lifecycle is just cleanup. Worth documenting this discrepancy so the "deleted after 24 hours" promise isn't overstated.

---

## Security / Best Practice

- [x] **4. No S3 server-side encryption configured** — `storage.tf`
  ~~Files are already client-side AES-GCM encrypted, but SSE should be declared explicitly as defense-in-depth.~~
  **Accepted:** AWS enables SSE-S3 (AES-256) by default on all new buckets as of Jan 2023. Explicit declaration adds no new security control at this stage. Revisit if a compliance requirement emerges.

- [x] **5. Lambda functions have no `timeout` or `memory_size`** — `lambda.tf`
  Set `timeout = 10` on all four functions. Memory left at 128 MB — functions are I/O-bound with no large in-memory data; default is sufficient.

- [x] **6. Authorizer caching disabled — every request invokes Lambda** — `api_gateway.tf:20`
  **Not applicable:** Each share link is used once — there's no repeat caller pattern for cached auth decisions to benefit. Accepted as-is. Long-term: a REST API with native request validation (OpenAPI/Swagger) may eliminate the need for the Lambda authorizer entirely.

- [ ] **7. `auto_deploy = true` is risky for prod** — `api_gateway.tf:71`
  Fine for dev, but any Terraform change to routes or integrations goes live immediately. When a `prod` module call is added, this should be `false` with an explicit `aws_apigatewayv2_deployment` resource.

- [ ] **8. No API Gateway access logging** — `api_gateway.tf`
  The `$default` stage has no `access_log_settings`. Without it, the only visibility into traffic is Lambda CloudWatch logs. Add a CloudWatch log group and `access_log_settings` block to the stage with a useful log format (`$context.requestId`, `$context.status`, `$context.routeKey`, `$context.integrationErrorMessage`).

---

## Minor / Structural

- [ ] **9. `archive_file` output path is inside the module directory** — `lambda.tf:4`
  Zips land in `terraform/modules/regional/dist/`. If multiple workspaces share the module they clobber each other. Use `${path.root}` or a temp path. Confirm `dist/` is in `.gitignore`.

- [ ] **10. Lambda source path hardcoded relative to `path.root`** — `lambda.tf:3`
  `${path.root}/../api/lambda/upload/index.mjs` assumes the module lives one level below the Lambda source. Breaks if the module is ever moved or reused. A `lambda_source_dir` input variable would make this explicit.

- [ ] **11. Module `region` variable has a default** — `modules/regional/variables.tf:7`
  Defaulting to `us-west-2` means a caller adding a new region (e.g. `eu-west-1`) could forget to pass `region` and silently deploy to the wrong region. Remove the default to force explicit declaration.

- [ ] **12. `terraform.tfvars` has a committed placeholder** — `terraform.tfvars:2`
  `route53_zone_id = "REPLACE_WITH_ZONE_ID"` will cause apply to fail on the Route 53 records after provisioning everything else. Either remove it from the file and require `TF_VAR_route53_zone_id`, or make it a required variable with no default so Terraform prompts interactively.
