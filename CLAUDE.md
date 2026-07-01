# FileDeadrop

Repository contains the React frontend and AWS Lambda function code.

One time end-to-end encrypted file sharing service. Users upload a file, 
receive a share link, and the file is deleted after first access 
or 24 hours, whichever comes first.

## Stack
- React 19 with Vite
- TypeScript ~6.0
- React Router DOM v7
- Fetch API for all HTTP requests

## Structure
api/
  lambda/
    upload/     # index.mjs — upload Lambda handler; index.test.mjs — unit tests
    view/       # index.mjs — view Lambda handler; index.test.mjs — unit tests
    delete/     # index.mjs — delete Lambda handler; index.test.mjs — unit tests
    authorizer/ # index.mjs — API Gateway authorizer Lambda handler; index.test.mjs — unit tests
    expiry/     # index.mjs — EventBridge Scheduler-invoked Lambda; index.test.mjs — unit tests
    receipt/    # index.mjs — GET /receipt/{id} handler, serves opt-in receipt status; index.test.mjs — unit tests
    test.setup.mjs  # Vitest global setup — mocks console.log/error/warn across all Lambda tests
src/
  components/
    layout/  # Header.tsx, Footer.tsx — shared layout, rendered in App.tsx
    home/    # DefinitionBlock.tsx, UploadCard.tsx, TrustStrip.tsx,
             # ProtocolSteps.tsx, CapabilitiesSection.tsx, SecurityCard.tsx, FaqSection.tsx
    receipt/ # ReceiptCard.tsx — presentational, drives the /receipt/:token page
    # FileDropZone.tsx, UploadStatus.tsx
    # Each component has a co-located .module.css file
  pages/       # Home.tsx, View.tsx, Receipt.tsx, NotFound.tsx
  hooks/       # useUpload.ts, useView.ts, useReceipt.ts
  utils/       # api.ts, crypto.ts, constants.ts
  types/       # index.ts
DESIGN.md      # visual design spec — colors, typography, spacing rules
docs/
  architecture/  # draw.io system architecture and sequence diagrams (PNG)
  filedeadrop_home_mockup.html   # HTML mockup of the home page design
  filedeadrop_view_mockup.html   # HTML mockup of the view/download page design
terraform/
  README.md            # bootstrap instructions and manual workflow
  modules/
    regional/          # parameterized per-region module (S3, DynamoDB, Lambda, API GW, ACM, Route 53, EventBridge Scheduler)
  environments/
    dev/               # dev environment — main.tf, variables.tf, outputs.tf, terraform.tfvars, secrets.tfvars (gitignored)
    prod/              # production + EU data residency — main.tf, variables.tf (module blocks added when ready)
.claude/
  skills/
    create-pr/   # SKILL.md — /create-pr skill for opening pull requests; includes pre-PR doc check
    manage-docs/ # SKILL.md — /manage-docs skill for creating and updating skills and CLAUDE.md
vitest.config.ts   # Vitest config — node environment, targets api/lambda/**/*.test.mjs
.github/
  workflows/   # deploy-frontend.yml — frontend to S3 + CloudFront on src/** changes
               # deploy-terraform.yml — Lambda tests then Terraform apply on terraform/** or api/lambda/** changes; dev job on dev branch, prod job on main

## API
Base URL: derived at runtime — not a single env var.
- Upload: `getApiUrlForUpload(region)` in `api.ts` maps AWS region → API URL via `REGION_API_URLS` in `constants.ts`
- View: `getApiUrlForView()` in `api.ts` maps `window.location.hostname` → API URL via `HOSTNAME_API_URLS` in `constants.ts`
- `VITE_API_URL` is the local dev fallback when no hostname/region mapping exists

All API calls live in src/utils/api.ts
All requests use fetch with async/await
All requests include header: Content-Type: application/json

Endpoints:
PUT /upload
  body: { fileSize: number, ttl: number, receiptRequested?: boolean }  # fileSize is encryptedBytes.byteLength; ttl is seconds — must be one of [300, 3600, 21600, 86400]; receiptRequested opts into a receipt record, defaults to false/omitted
  returns: { presignedUrl: string, sharePath: string, receiptPath?: string }  # receiptPath present only when receiptRequested was true

GET /view/{id}
  returns: { presignedUrl: string }

DELETE /delete/{id}
  triggers Lambda to delete the S3 object; called client-side after encrypted bytes are in memory
  note: DynamoDB access gate is handled on view — this endpoint is S3 cleanup only, best-effort

GET /receipt/{id}
  opt-in endpoint — {id} is the receipt token from receiptPath, a separate token from the file's fileId, never exposed to the recipient
  returns: { status: 'pending' | 'accessed' | 'expired', uploadedAt: number, accessedAt: number | null, deletedAt: number | null, fileExpiresAt: number }

## Environment Variables
VITE_API_URL= # local dev fallback only — e.g. https://dev.api.filedeadrop.com; production routing is hostname/region-based

Never hardcode these values. Always reference via import.meta.env

## Deployment
Workflows trigger on push to their respective branches, filtered by path. Authentication uses OIDC via `aws-actions/configure-aws-credentials@v4` — no long-lived credentials stored in GitHub.

### Frontend — `deploy-frontend.yml`
Triggers on changes to: `src/**`, `public/**`, `index.html`, `vite.config.*`, `package*.json`

Steps: `npm ci` → `npm run build` → S3 sync (`--delete`) → CloudFront invalidation (`/*`)

### Terraform — `deploy-terraform.yml`
Triggers on changes to: `terraform/**`, `api/lambda/**`

Two jobs, each gated by branch:
- `deploy-dev` — runs on push to `dev`, uses GitHub Environment `dev`, working dir `terraform/environments/dev/`
- `deploy-prod` — runs on push to `main`, uses GitHub Environment `production`, working dir `terraform/environments/prod/`

Runs `terraform apply` — provisions all infrastructure and packages/deploys Lambda code in a single step. Lambda function names follow the pattern `${env}-filedeadrop-{function}` (e.g. `dev-filedeadrop-upload`).

### Required GitHub secrets
Secrets are scoped to GitHub Environments (`dev` and `production`) — not repository-level secrets.

Frontend workflow secrets (repository-level):
- `AWS_ROLE_ARN` — IAM role assumed via OIDC
- `S3_BUCKET_NAME` — destination S3 bucket
- `CLOUDFRONT_DISTRIBUTION_ID` — distribution invalidated after deploy
- `VITE_API_URL` — API base URL injected at build time

Terraform workflow secrets (per GitHub Environment):
- `AWS_ROLE_ARN` — IAM role assumed via OIDC
- `TF_VAR_ROUTE53_ZONE_ID` — hosted zone ID passed to Terraform
- `TF_VAR_DEV_API_KEY` — dev API key (`dev` environment only)

## Reference Material
The `docs/` directory contains reference artifacts — consult them for context when needed:
- `docs/architecture/` — system architecture and sequence diagrams; useful for understanding data flow, Lambda interactions, and the upload/view lifecycle
- `docs/filedeadrop_home_mockup.html` — HTML mockup of the home page; reference for component structure, copy, and intended visual layout
- `docs/filedeadrop_view_mockup.html` — HTML mockup of the view/download page; 5 states: fetching, decrypting, ready, downloaded, not found
- `DESIGN.md` — color palette, typography, spacing rules, and CSS constraints

## Documentation
After completing any task, update CLAUDE.md and README.md if the work affects the accuracy or completeness of either document — this includes API changes, new files or directories, architectural decisions, changed conventions, or updated project status.

When saving memory, surface the change to the user. Prefer CLAUDE.md or checked-in skill files over memory for any rule, convention, or preference that should apply across sessions, Claude instances, or contributors. Memory is scoped to the individual — it is invisible to other developers. If a rule matters to the project, it belongs here or in `.claude/skills/`, not only in memory. Use `/manage-docs` skill when creating or updating CLAUDE.md or skills.

## Conventions
- TypeScript strict mode
- Functional components only, no class components
- Custom hooks for all stateful logic
- All API calls in src/utils/api.ts, never inline in components
- All encryption/decryption logic lives in src/utils/crypto.ts
- View page extracts :id from the URL path param and passes it to GET /view/{id}
- Share URL format: {regional-origin}/view/{id}#{base64url-key}:{base64url-encrypted-filename} — host encodes the storage region (e.g. eu.filedeadrop.com for EU uploads); key and encrypted filename in fragment, nothing sensitive in query params
- Use Uint8Array<ArrayBuffer> (not ArrayBufferLike) for BodyInit compatibility with TypeScript 6
- Default AWS region: us-west-2
- CSS Modules only for component styles — each component has a co-located .module.css file
- Global index.css for base styles only (variables, reset, body, typography, layout)
- Fonts: Inter (body) and JetBrains Mono (labels, code, step numbers) — self-hosted from `public/fonts/` (no third-party font CDN)

## Key Architecture Decisions
- Encryption key passed in URL fragment (#) never query params
- AES-GCM-128 encryption; IV (12 bytes) prepended to ciphertext, 16-byte auth tag appended by crypto.subtle.encrypt — encrypted payload is always file.size + 28 bytes
- Key exported as base64url (URL-safe, no padding) for the fragment
- Original filename AES-GCM encrypted (same key, fresh IV) and base64url-encoded in the URL fragment after the key, separated by `:` — never sent to any server; only recoverable by the keyholder
- File bytes never touch Lambda, go direct to S3 via presigned URL
- DynamoDB conditional delete with ReturnValues ALL_OLD handles race conditions on view
- File expiry is three-layer: (1) client-side DELETE /delete/{id} after download — primary path; (2) EventBridge Scheduler one-time event at exactly T+{ttl} targeting the expiry Lambda — guaranteed backstop for unaccessed files; (3) S3 lifecycle rule (`days=1`) — tertiary safety net
- EventBridge Scheduler: upload Lambda creates one schedule per upload (`Name: fileId`, group `${env}-filedeadrop`, `ActionAfterCompletion: DELETE`); schedule fires at `expiresAt` and invokes the expiry Lambda with `{ fileId }`; scheduler creation is best-effort — upload succeeds even if it fails
- DELETE /delete/{id} is S3-only cleanup — DynamoDB gate is removed on view; EventBridge Scheduler is the backstop if the client-side delete call fails; S3 lifecycle is the final fallback
- Receipt URL (opt-in, issue #80): a checkbox on upload lets senders request a second, separate link to check later whether their file was accessed, still pending, or expired — off by default, no effect on the upload flow when not requested
- Receipt token is generated the same way as fileId (crypto.randomUUID() → base64url) but is a fully separate value — never derivable from the share link's fragment, and never exposed to the recipient (the delete Lambda, which the recipient's browser calls, has no access to it)
- Receipt data lives in the same DynamoDB table as file records, under itemType: "RECEIPT" (no schema change) — fields: status (pending/accessed/expired), uploadedAt, accessedAt, deletedAt, fileExpiresAt (the file's own TTL, copied at upload time). Retention is 48 hours via the same table-level TTL attribute (expiresAt) already used for file records — the attribute name is shared across item types but means "file expiry" on META items and "receipt retention" on RECEIPT items
- Confirmed writes only, no inferred timestamps: upload Lambda creates the receipt (status: pending) when opted in; view Lambda writes accessedAt + deletedAt together on a successful access, and also writes a confirmed deletedAt on its existing 410 orphan-cleanup branch; the scheduled expiry Lambda writes a confirmed deletedAt for the dominant never-accessed case, guarded by a conditional update (status = pending) so it can never overwrite a legitimate access
- If neither view nor expiry ever confirms a deletion (double failure: the EventBridge schedule never fired and nobody hit the dead link), the receipt Lambda derives status: 'expired' by checking whether the file's META record still exists, but reports deletedAt: null ("not confirmed") rather than guessing a timestamp — chosen deliberately over inferring a plausible-looking value, since this feature is aimed at compliance-conscious users
- delete Lambda (client-triggered, post-download S3 cleanup) never participates in receipt writes — by the time it runs, view has already deleted the only record holding the receipt token, and the recipient's browser (which calls delete) never has the token in the first place
- API Gateway throttling: 100 req/s rate limit, 200 burst at the stage level
- API Gateway authorizer gates all routes and enforces a 10KB payload limit; CloudFront secret pattern removed (requests reach API Gateway directly) — CloudFront-in-front-of-API-GW to be revisited post-Terraform
- 250MB file size limit: frontend validates file.size ≤ 250MB before encryption; presigned PUT URL is signed with exact ContentLength (encrypted payload); Lambda threshold is 250MB + 28 bytes to account for AES-GCM overhead
- Lambda resource names (BUCKET_NAME, TABLE_NAME) are read from environment variables — Terraform sets these per environment; production values must be set manually before deploying Lambda source changes; upload Lambda also receives EXPIRY_LAMBDA_ARN, SCHEDULER_ROLE_ARN, SCHEDULE_GROUP_NAME (all set by Terraform)
- Runtime API URL routing: upload uses `getApiUrlForUpload(region)` → `REGION_API_URLS` lookup; view uses `getApiUrlForView()` → `HOSTNAME_API_URLS` lookup on `window.location.hostname`; `VITE_API_URL` is the localhost fallback only
- Share URL host reflects the upload region: EU upload on any frontend → share link is `eu.filedeadrop.com/view/{id}` so the view page routes to `eu.api.filedeadrop.com`
- Adding a new region requires only new entries in `REGION_API_URLS`, `HOSTNAME_API_URLS`, `REGION_FRONTEND_ORIGINS`, `SUPPORTED_REGIONS` (all in `constants.ts`) plus a new Terraform module block
- MVP user is anonymous, no account required

## Design
- Spec: DESIGN.md — colors, typography, spacing rules, component guidelines
- Fonts: Inter (all text), JetBrains Mono (labels, code, step numbers) — self-hosted woff2 (latin + latin-ext) in `public/fonts/`, declared via `@font-face` in `src/index.css`; no Google Fonts request (privacy)
- Color palette defined as CSS custom properties in `src/index.css`; never hardcode a color value
- `html { font-size: 62.5% }` — 1rem = 10px; all spacing (margin, padding, gap) in rem; borders, border-radius, box-shadow, min-height, max-width, and media query breakpoints stay in px
- Upload flow is two-step: file selection moves to 'ready' state, explicit button press triggers encrypt/upload

## Testing
- `npm run test:lambda` — Vitest unit tests for all Lambda handlers
- Test files are co-located with each handler (`index.test.mjs`); AWS SDK calls are fully mocked — no real service calls in tests
- Run `npm run test:lambda` before committing any changes to `api/lambda/`

## Git
- Never commit directly to `main` — all work happens on feature branches
- Never push to any branch without explicit user direction
- Branch naming: `type/description` (e.g. `refactor/authorizer`, `feat/upload-limit`)
- Run `npm run test:lambda` before committing any changes to `api/lambda/`
- Use `/create-pr` skill when opening pull requests — includes a pre-PR documentation check and commit

## Do Not
- Do not write inline fetch calls in components
- Do not store encryption keys in state or localStorage
- Do not add dependencies without flagging for review
- Do not use any or unknown TypeScript types without justification
- Do not hardcode API URLs, secrets, or environment specific values
- Do not add Content-Type header to S3 presigned URL PUT requests — causes signature mismatch 403
- Do not use global CSS for component styles — use CSS Modules
- Do not use Tailwind, component libraries, or gradients
- Do not use decorative animations (fly-ins, bounces, entrance effects) — functional micro-transitions are permitted (e.g. 150ms opacity fade-in on state swap, hover transitions)
- Do not expose raw `error.message` or stack traces in Lambda response bodies — return a generic `{ error: '...' }` to clients and log full detail server-side via `console.error` (→ CloudWatch)
