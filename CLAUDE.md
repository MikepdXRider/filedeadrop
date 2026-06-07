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
    upload/     # index.mjs — upload Lambda handler
    view/       # index.mjs — view Lambda handler
    delete/     # index.mjs — delete Lambda handler
    authorizer/ # index.mjs — API Gateway authorizer Lambda handler
src/
  components/
    layout/  # Header.tsx, Footer.tsx — shared layout, rendered in App.tsx
    home/    # DefinitionBlock.tsx, UploadCard.tsx, TrustStrip.tsx,
             # ProtocolSteps.tsx, CapabilitiesSection.tsx, SecurityCard.tsx, FaqSection.tsx
    # FileDropZone.tsx, ShareUrlDisplay.tsx, UploadStatus.tsx
    # Each component has a co-located .module.css file
  pages/       # Home.tsx, View.tsx, NotFound.tsx
  hooks/       # useUpload.ts, useView.ts
  utils/       # api.ts, crypto.ts, constants.ts
  types/       # index.ts
DESIGN.md      # visual design spec — colors, typography, spacing rules
docs/
  architecture/  # draw.io system architecture and sequence diagrams (PNG)
  filedeadrop_home_mockup.html   # HTML mockup of the home page design
  filedeadrop_view_mockup.html   # HTML mockup of the view/download page design
.claude/
  skills/
    create-pr/   # SKILL.md — /create-pr skill for opening pull requests
    manage-docs/ # SKILL.md — /manage-docs skill for creating and updating skills and CLAUDE.md
.github/
  workflows/   # deploy-frontend.yml — frontend to S3 + CloudFront on src/** changes
               # deploy-lambda.yml   — Lambda functions on api/lambda/** changes

## API
Base URL: import.meta.env.VITE_API_URL

All API calls live in src/utils/api.ts
All requests use fetch with async/await
All requests include header: Content-Type: application/json

Endpoints:
PUT /upload
  body: { fileSize: number, region: string }
  returns: { presignedUrl: string, sharePath: string }

GET /view/{id}
  returns: { presignedUrl: string }

DELETE /delete/{id}
  triggers Lambda to delete the S3 object; called client-side after encrypted bytes are in memory
  note: DynamoDB access gate is handled on view — this endpoint is S3 cleanup only, best-effort

## Environment Variables
VITE_API_URL= # base API URL e.g. https://api.filedeadrop.com

Never hardcode these values. Always reference via import.meta.env

## Deployment
Both workflows trigger on push to `main`, filtered by path. Authentication uses OIDC via `aws-actions/configure-aws-credentials@v4` — no long-lived credentials stored in GitHub.

### Frontend — `deploy-frontend.yml`
Triggers on changes to: `src/**`, `public/**`, `index.html`, `vite.config.*`, `package*.json`

Steps: `npm ci` → `npm run build` → S3 sync (`--delete`) → CloudFront invalidation (`/*`)

### Lambda — `deploy-lambda.yml`
Triggers on changes to: `api/lambda/**`

Runs a matrix job for each function — zips `index.mjs` from the named subdirectory and calls `aws lambda update-function-code`:
- `api/lambda/upload/index.mjs` → `ephemeral-upload`
- `api/lambda/view/index.mjs` → `ephemeral-view`
- `api/lambda/delete/index.mjs` → `filedeadrop-delete`
- `api/lambda/authorizer/index.mjs` → `filedeadrop-api-gateway-authorizer`

The IAM role behind `AWS_ROLE_ARN` must have `lambda:UpdateFunctionCode` on all four function ARNs in addition to the S3/CloudFront permissions for the frontend workflow.

### Required GitHub secrets
- `AWS_ROLE_ARN` — IAM role the workflow assumes via OIDC
- `S3_BUCKET_NAME` — destination S3 bucket (frontend)
- `CLOUDFRONT_DISTRIBUTION_ID` — distribution to invalidate after frontend deploy
- `VITE_API_URL` — injected at build time

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
- Share URL format: {origin}/view/{id}#{base64url-key}:{encoded-filename} — both key and filename in fragment, nothing sensitive in query params
- Use Uint8Array<ArrayBuffer> (not ArrayBufferLike) for BodyInit compatibility with TypeScript 6
- Default AWS region: us-west-2
- CSS Modules only for component styles — each component has a co-located .module.css file
- Global index.css for base styles only (variables, reset, body, typography, layout)
- Fonts: Inter (body) and JetBrains Mono (labels, code, step numbers) via Google Fonts

## Key Architecture Decisions
- Encryption key passed in URL fragment (#) never query params
- AES-GCM-128 encryption; IV (12 bytes) prepended to ciphertext — first 12 bytes are always the IV
- Key exported as base64url (URL-safe, no padding) for the fragment
- Original filename encoded in the URL fragment after the key, separated by `:` — never sent to any server
- File bytes never touch Lambda, go direct to S3 via presigned URL
- DynamoDB conditional delete with ReturnValues ALL_OLD handles race conditions on view
- S3 lifecycle policy handles post access file cleanup, DynamoDB conditional delete is the access control gate
- DELETE /delete/{id} is S3-only cleanup — DynamoDB gate is removed on view; S3 lifecycle is the fallback if the delete call fails
- API Gateway throttling: 100 req/s rate limit, 200 burst at the stage level
- API Gateway authorizer gates all routes and enforces a 10KB payload limit; CloudFront secret pattern is defunct (requests reach API Gateway directly, not through CloudFront) — to be revisited post-Terraform if CloudFront is placed in front of API Gateway (#20)
- MVP user is anonymous, no account required

## Design
- Spec: DESIGN.md — colors, typography, spacing rules, component guidelines
- Fonts: Inter (all text), JetBrains Mono (labels, code, step numbers) — loaded via Google Fonts
- Color palette and spacing defined as CSS custom properties in src/index.css
- Upload flow is two-step: file selection moves to 'ready' state, explicit button press triggers encrypt/upload

## Git
- Never commit directly to `main` — all work happens on feature branches
- Never push to any branch without explicit user direction
- Branch naming: `type/description` (e.g. `refactor/authorizer`, `feat/upload-limit`)
- Use `/create-pr` skill when opening pull requests

## Do Not
- Do not write inline fetch calls in components
- Do not store encryption keys in state or localStorage
- Do not add dependencies without flagging for review
- Do not use any or unknown TypeScript types without justification
- Do not hardcode API URLs, secrets, or environment specific values
- Do not add Content-Type header to S3 presigned URL PUT requests — causes signature mismatch 403
- Do not use global CSS for component styles — use CSS Modules
- Do not use Tailwind, component libraries, gradients, or animations

## Current Status
Completed:
- AWS infrastructure (Route 53, ACM, API Gateway, Lambda, DynamoDB, S3)
- Upload and view Lambda functions
- CORS configuration
- Custom domain api.filedeadrop.com
- React frontend scaffold
- Home page upload sequence (browser verified)
- View shared link page — /view/:id with client-side decryption (browser verified)
- GitHub Actions deploy pipeline — separate workflows for frontend (S3 + CloudFront) and Lambda
- Lambda function source in-repo (`api/lambda/{upload,view,delete}/index.mjs`)
- CloudFront setup (custom domain, SPA 404→index.html error page)
- Design system foundation (DESIGN.md, CSS Modules, Google Fonts, CSS custom properties)
- Home page components: Header, Footer, DefinitionBlock, UploadCard, TrustStrip, ProtocolSteps, CapabilitiesSection, SecurityCard, FaqSection
- Two-step upload flow (file select → ready state → explicit upload trigger)
- View page design (fetching, decrypting, ready, downloaded, not-found states)

Up Next:
- Authorizer refactor — remove defunct CloudFront secret, enforce 10KB payload limit (#20)
- S3 presigned URL file size limit — 25MB content-length-range condition (#19)
- Footer attribution — copyright and LinkedIn link (#6)
- Terraform scaffold — dev environment in existing AWS account, prerequisite for data residency (#18)
- Region selector and data residency — blocked on #18; CloudFront Function routes by ?region= param (#16)
- Design / polish pass continued
- Revisit UploadCard panel styles once upload/done/error states are properly mocked up — currently mirrors FileDropZone styles as a placeholder