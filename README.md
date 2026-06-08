# FileDeadrop

A one-time, end-to-end encrypted file sharing service. Upload a file, receive a share link, and the file is permanently deleted after the first access or 24 hours — whichever comes first.

Files are encrypted entirely in the browser before upload. The encryption key never leaves the client and is never transmitted to any server.

---

## How It Works

### Upload

1. The browser generates an AES-GCM-128 key using the Web Crypto API
2. The file is encrypted client-side; the IV is prepended to the ciphertext
3. The client requests a presigned S3 URL from the API
4. The encrypted bytes are uploaded directly to S3 — they never pass through the application server
5. The encryption key and AES-GCM-encrypted filename are embedded in the share URL fragment (`#key:encrypted-filename`)

### View

1. The recipient opens the share link; the browser extracts the share ID from the URL path and the encryption key from the URL fragment
2. The client calls the API, which atomically deletes the DynamoDB record and returns a presigned S3 GET URL — this is the one-time access gate
3. The encrypted file is fetched directly from S3
4. The browser decrypts the file using the key from the fragment and offers it for download

Because the key lives exclusively in the URL fragment, it is never sent to any server in any request.

---

## Architecture

### System

![System Architecture](docs/architecture/filedeadrop-system-architecture.drawio.png)

### Sequences

![Upload and View Sequences](docs/architecture/filedeadrop-sequences.drawio.png)

---

## Key Technical Decisions

**Encryption key in the URL fragment**
URL fragments (`#`) are never included in HTTP requests. Placing the key there means it is invisible to the API, S3, CloudFront, and any server-side logs — even if traffic were intercepted at the network layer.

**Direct S3 transfer via presigned URLs**
File bytes flow directly between the browser and S3. The Lambda function handles only metadata — issuing presigned URLs and writing to DynamoDB — which keeps Lambda costs low and removes it as a bottleneck for large files.

**File size enforcement at the storage layer**
The presigned PUT URL is signed with an exact `ContentLength` matching the encrypted payload size. S3 rejects any upload where the `Content-Length` header doesn't match the signed value, preventing oversized uploads regardless of how the URL was obtained. The Lambda also validates the size before issuing the URL. The 25MB limit applies to the original file; the Lambda threshold adds 28 bytes to accommodate AES-GCM overhead (12-byte IV + 16-byte auth tag).

**DynamoDB conditional delete as the access gate**
The view Lambda performs a conditional `DeleteItem` with `ReturnValues: ALL_OLD`. If the item no longer exists (already accessed or expired), the delete fails and the Lambda returns an error — preventing any race condition where two simultaneous requests could both retrieve the file.

**S3 lifecycle policy for TTL**
A 24-hour S3 lifecycle rule handles object expiry independently of application logic, ensuring files are cleaned up even if the DynamoDB record is deleted before the object is accessed.

**Encrypted filename in the URL fragment**
The original filename is encrypted with the same AES-GCM key (a fresh IV is generated independently) before being embedded in the fragment. The filename is never sent to any server and is only recoverable by someone who holds the key — making the share link the sole source of both file and filename access.

**Anonymous access**
No accounts, sessions, or cookies. The share link is the only credential.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript ~6.0, Vite |
| Routing | React Router DOM v7 |
| Styling | CSS Modules, Inter + JetBrains Mono (Google Fonts) |
| Encryption | Web Crypto API (AES-GCM-128) |
| Backend | AWS Lambda (Node.js) |
| API | AWS API Gateway (HTTP API) |
| Storage | Amazon S3 |
| Database | Amazon DynamoDB |
| CDN / Hosting | Amazon CloudFront |
| DNS / TLS | Route 53, ACM |

---

## Local Development

```bash
# Install dependencies
npm install

# Set the API base URL
cp .env.example .env
# Edit .env and set VITE_API_URL=https://api.filedeadrop.com

# Start the dev server
npm run dev

# Type check and build
npm run build
```

---

## Deployment

Push to `main` triggers path-filtered GitHub Actions workflows. Authentication uses OIDC (`aws-actions/configure-aws-credentials`) — no long-lived AWS credentials are stored in GitHub.

### Frontend (`deploy-frontend.yml`)
Triggers on changes to `src/**`, `public/**`, `index.html`, `vite.config.*`, `package*.json`.

1. `npm ci` + `npm run build` (with `VITE_API_URL` injected at build time)
2. `aws s3 sync dist/ s3://<bucket> --delete`
3. CloudFront invalidation (`/*`) to serve the fresh build immediately

### Lambda (`deploy-lambda.yml`)
Triggers on changes to `api/lambda/**`. Runs a matrix job for each function — zips `index.mjs` from the named subdirectory and deploys via `aws lambda update-function-code`:

| Source | AWS function |
|---|---|
| `api/lambda/upload/index.mjs` | `ephemeral-upload` |
| `api/lambda/view/index.mjs` | `ephemeral-view` |
| `api/lambda/delete/index.mjs` | `filedeadrop-delete` |
| `api/lambda/authorizer/index.mjs` | `filedeadrop-api-gateway-authorizer` |

**Required GitHub secrets**

| Secret | Description |
|---|---|
| `AWS_ROLE_ARN` | IAM role assumed by the workflow via OIDC — must include `lambda:UpdateFunctionCode` on all four function ARNs |
| `S3_BUCKET_NAME` | Destination S3 bucket (frontend) |
| `CLOUDFRONT_DISTRIBUTION_ID` | Distribution invalidated after each frontend deploy |
| `VITE_API_URL` | API base URL injected at build time |
