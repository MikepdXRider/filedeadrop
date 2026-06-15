# Terraform — FileDeadrop Infrastructure

Manages the FileDeadrop AWS infrastructure as reusable regional modules. Each call to `modules/regional/` provisions a complete, isolated stack: S3, DynamoDB, Lambda functions, API Gateway, ACM certificate, and Route 53 records.

Each environment has its own directory under `environments/` with separate Terraform state. A merge to the `dev` branch only touches dev infrastructure; a merge to `main` only touches production.

```
terraform/
  modules/regional/    # shared module — one stack per call
  environments/
    dev/               # dev environment (us-west-2)
    prod/              # production + EU data residency (added when ready)
```

---

## One-Time: Bootstrap State Backend

The S3 bucket that stores Terraform state must exist before anything else. Create it once with the AWS CLI — it is shared across all environments:

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
```

State locking uses S3 native locking (`use_lockfile = true`) — no DynamoDB table required.

---

## One-Time: Check API Gateway CloudWatch Role

This configuration includes `aws_api_gateway_account`, which sets the CloudWatch Logs IAM role for **all API Gateway APIs in the AWS account and region** — not just the ones managed here. Applying will overwrite any existing configuration.

Before the first `terraform apply`, check whether a role is already set:

```bash
aws apigateway get-account --region us-west-2
```

If `cloudwatchRoleArn` is populated, verify the new role (`${env}-filedeadrop-apigw-logs`) has equivalent or broader permissions before proceeding.

---

## Part 1: Running Locally

Use this to apply and test the dev environment from your machine before CI is wired up.

### Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) `~> 1.14`
- AWS CLI configured with credentials that can create: S3, DynamoDB, Lambda, API Gateway, IAM roles/policies, ACM certificates, Route 53 records, and read/write access to the state bucket

### Step 1 — Create secrets.tfvars

`route53_zone_id` and `dev_api_key` are account-specific and must never be committed. Both go in `terraform/environments/dev/secrets.tfvars` (already in `.gitignore`):

```bash
cat > terraform/environments/dev/secrets.tfvars <<'EOF'
route53_zone_id = "Z..."        # Route 53 console → Hosted zones → filedeadrop.com
dev_api_key     = "your-key"    # any strong random string — must match VITE_DEV_API_KEY
EOF
```

### Step 2 — Initialize

Run from the `environments/dev/` directory:

```bash
cd terraform/environments/dev
terraform init
```

### Step 3 — Plan and apply

```bash
terraform plan -var-file=secrets.tfvars
terraform apply -var-file=secrets.tfvars
```

`terraform apply` will pause up to 30 minutes at the ACM certificate validation step while Route 53 DNS propagates. This is expected.

When complete:

```bash
terraform output  # shows dev_api_url, dev_s3_bucket, dev_dynamodb_table
```

### Step 4 — Configure the frontend

Add both values to `.env.local` in the repo root (gitignored by Vite):

```
VITE_API_URL=https://dev.api.filedeadrop.com
VITE_DEV_API_KEY=your-key
```

`VITE_DEV_API_KEY` must match the value in `secrets.tfvars`. The frontend includes it as an `x-api-key` header on every API request — the authorizer Lambda validates it. When unset (production build), the authorizer skips the key check.

Run the frontend normally: `npm run dev`

---

## Part 2: Dev Auto-Deploy on Merge

The `deploy-terraform.yml` workflow runs `terraform apply` automatically on every push to the `dev` branch that touches `terraform/**` or `api/lambda/**`. The workflow runs from `terraform/environments/dev/` so only dev infrastructure is affected.

### How it works

1. Push to `dev` triggers the workflow
2. GitHub Actions assumes the IAM role via OIDC — no stored credentials
3. Secrets are passed as `TF_VAR_*` environment variables from GitHub Secrets
4. `terraform init` pulls state from S3
5. `terraform apply -auto-approve` applies any changes

### One-time CI setup

**A. Create the OIDC identity provider in AWS** (if not already done for the frontend workflow):

In the IAM console → Identity providers → Add provider:
- Provider type: OpenID Connect
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

**B. Create an IAM role for GitHub Actions** with a trust policy scoped to this repository:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:michaelxrider/filedeadrop:*"
      }
    }
  }]
}
```

The role needs permission to create and manage: Lambda, API Gateway, S3, DynamoDB, IAM roles/policies, ACM certificates, Route 53 records, CloudWatch log groups, and read/write access to the Terraform state bucket.

**C. Create a GitHub Environment** (Settings → Environments → New environment):

- Name: `dev`
- Deployment branch rule: `dev` branch only
- Add secrets:

| Secret | Value |
|---|---|
| `AWS_ROLE_ARN` | ARN of the role created above |
| `TF_VAR_ROUTE53_ZONE_ID` | Hosted zone ID for `filedeadrop.com` |
| `TF_VAR_DEV_API_KEY` | Dev API key — must match what you test locally |

---

## Part 3: Production

Production is not yet configured. When ready, uncomment the module blocks in `environments/prod/main.tf` and add production secrets to a `production` GitHub Environment.

### What changes for production

| Setting | Dev | Prod |
|---|---|---|
| `env` | `"dev"` | `"prod"` |
| `api_domain` | `"dev.api.filedeadrop.com"` | `"api.filedeadrop.com"` |
| `dev_api_key` | set — required | omitted |
| `upload_rate_limit` | `50` | `100` |
| `upload_burst_limit` | `100` | `200` |
| `default_rate_limit` | `50` | `100` |
| `default_burst_limit` | `100` | `200` |
| `frontend_origins` | includes `localhost:5173` | production domains only |

### Adding EU data residency

EU is a production deployment in a different region — add a `module "eu"` block to `environments/prod/main.tf` alongside `module "prod"`. Both deploy together on every merge to `main`. See issue #16.

---

## Destroy

```bash
cd terraform/environments/dev
terraform destroy -var-file=secrets.tfvars
```

This removes all resources managed by the dev environment. Run from the environment directory you want to tear down.

---

## Module Reference: `modules/regional/`

A fully parameterized module that provisions one complete regional API stack. Required inputs:

| Variable | Description |
|---|---|
| `env` | Environment prefix for all resource names (`dev`, `prod`, `eu`, etc.) |
| `region` | AWS region for this stack |
| `lambda_source_dir` | Absolute path to `api/lambda/` — pass `"${path.module}/../../../api/lambda"` from an environment directory |
| `api_domain` | Custom subdomain for the API Gateway (`dev.api.filedeadrop.com`, etc.) |
| `route53_zone_id` | Pre-existing hosted zone — not managed by this module |
| `frontend_origins` | CORS allow-list for S3 and API Gateway |

Rate limit variables (`upload_rate_limit`, `upload_burst_limit`, `default_rate_limit`, `default_burst_limit`) default to production values (100 req/s, 200 burst) and should be lowered for dev/staging environments.
