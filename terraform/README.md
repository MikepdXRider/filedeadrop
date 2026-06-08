# Terraform — FileDeadrop Infrastructure

Manages the FileDeadrop AWS infrastructure as reusable regional modules. Each call to `modules/regional/` provisions a complete, isolated stack: S3, DynamoDB, Lambda functions, API Gateway, ACM certificate, and Route 53 records.

`main.tf` currently deploys a single `dev` environment at `dev-api.filedeadrop.com`.

---

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) `~> 1.14`
- AWS CLI configured with credentials that have permission to create: Lambda, API Gateway, S3, DynamoDB, IAM roles/policies, ACM certificates, and Route 53 records
- The state backend resources (created once — see below)

---

## One-Time: Bootstrap State Backend

The S3 bucket and DynamoDB table that store Terraform state must exist before `terraform init` can run. Create them once via the AWS CLI:

```bash
# State bucket — versioning and encryption required
aws s3api create-bucket \
  --bucket filedeadrop-terraform-state \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

aws s3api put-bucket-versioning \
  --bucket filedeadrop-terraform-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket filedeadrop-terraform-state \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# State lock table — LockID is the required primary key name
aws dynamodb create-table \
  --table-name filedeadrop-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-west-2
```

---

## Configuration

Edit `terraform.tfvars` before running:

| Variable | Description |
|---|---|
| `route53_zone_id` | Hosted zone ID for `filedeadrop.com` — find in the Route 53 console |
| `frontend_origins` | List of allowed CORS origins (defaults to production + www + `http://localhost:5173`) |

`frontend_origins` is used in two places: the S3 bucket CORS policy and the API Gateway CORS configuration. Both are kept in sync automatically — edit the list once in `terraform.tfvars`.

---

## Dev API Key

The dev environment is protected by a shared API key enforced in the authorizer Lambda. This prevents unauthorized use of the dev backend.

### Terraform side

`dev_api_key` must be provided at apply time. **Never put it in `terraform.tfvars`** — that file is committed to git. Two options:

**Option A — shell env var** (clears when the terminal closes):
```bash
export TF_VAR_dev_api_key="your-secret-key"
terraform apply
```

**Option B — gitignored secrets file** (persists across sessions):
```bash
# Create terraform/secrets.tfvars (already in .gitignore)
echo 'dev_api_key = "your-secret-key"' > secrets.tfvars

terraform apply -var-file=secrets.tfvars
```

When `dev_api_key` is null (the default), the authorizer skips the key check entirely — this is the expected production behavior.

### Frontend side

Add `VITE_DEV_API_KEY` to `.env` in the repo root (also gitignored):

```
VITE_DEV_API_KEY=your-secret-key
```

The value must match the key provided to Terraform. When set, all API Gateway requests include an `x-api-key` header. When unset, requests go through without the header — matching production behavior.

---

## Frontend Local Development

To run the frontend locally against the dev API, add both vars to `.env` in the repo root:

```
VITE_API_URL=https://dev-api.filedeadrop.com
VITE_DEV_API_KEY=your-secret-key
```

Then run `npm run dev` as normal. The frontend will route all API requests to the dev environment and include the API key header on every call.

---

## Deploy

All Terraform commands must be run from the `terraform/` directory — the module uses a relative path to locate Lambda source files.

```bash
cd terraform

# Initialize — downloads providers, configures backend
terraform init

# Preview changes
terraform plan

# Apply — provisions all infrastructure and deploys Lambda code
terraform apply
```

`terraform apply` will pause for up to 30 minutes at the ACM certificate validation step while Route 53 DNS propagates. This is expected — Terraform is waiting for AWS to confirm the cert before proceeding.

When complete, `terraform output` shows the dev API URL and resource names.

---

## Destroy

```bash
terraform destroy
```

This removes all dev resources. Production resources are unaffected — they are not managed by this Terraform config.

---

## GitHub Secrets

The `deploy-terraform.yml` CI workflow requires these secrets in addition to those used by the frontend workflow:

| Secret | Description |
|---|---|
| `AWS_ROLE_ARN` | IAM role assumed via OIDC (shared with frontend workflow) |
| `TF_VAR_ROUTE53_ZONE_ID` | Hosted zone ID — passed to Terraform as `var.route53_zone_id` |
| `TF_VAR_DEV_API_KEY` | Dev API key — passed to Terraform as `var.dev_api_key` |

The IAM role behind `AWS_ROLE_ARN` must have permission to create and manage: Lambda, API Gateway, S3, DynamoDB, IAM roles/policies, ACM certificates, Route 53 records, and read/write access to the Terraform state bucket and lock table.

---

## Module: `modules/regional/`

A fully parameterized module that provisions one complete regional API stack. Pass `env`, `region`, `api_domain`, `frontend_origins`, and `route53_zone_id` to stamp out an isolated environment. Rate limits default to production values (100 req/s, 200 burst) and can be overridden per environment.

To add a new region (once Terraform CI is in place per #24), add a second module call to `main.tf`:

```hcl
module "eu" {
  source           = "./modules/regional"
  env              = "eu"
  region           = "eu-west-1"
  api_domain       = "eu-api.filedeadrop.com"
  frontend_origins = ["https://filedeadrop.com", "https://www.filedeadrop.com"]
  route53_zone_id  = var.route53_zone_id
}
```
