# FileDeadrop

Repository contains only the React frontend.

One time end-to-end encrypted file sharing service. Users upload a file, 
receive a share link, and the file is deleted after first access 
or 24 hours, whichever comes first.

## Stack
- React 19 with Vite
- TypeScript ~6.0
- React Router DOM v7
- Fetch API for all HTTP requests

## Structure
src/
  components/  # FileDropZone.tsx, ShareUrlDisplay.tsx, UploadStatus.tsx
  pages/       # Home.tsx, View.tsx, NotFound.tsx
  hooks/       # useUpload.ts, useView.ts
  utils/       # api.ts, crypto.ts, constants.ts
  types/       # index.ts
architecture/  # draw.io sequence and systems architecture diagrams in PNG format

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

## Environment Variables
VITE_API_URL= # base API URL e.g. https://api.filedeadrop.com

Never hardcode these values. Always reference via import.meta.env

## Conventions
- TypeScript strict mode
- Functional components only, no class components
- Custom hooks for all stateful logic
- All API calls in src/utils/api.ts, never inline in components
- All encryption/decryption logic lives in src/utils/crypto.ts
- View page extracts :id from the URL path param and passes it to GET /view/{id}
- Share URL format: {origin}/view/{id}?name={filename}#{base64url-key} — key in fragment, filename in query param
- Use Uint8Array<ArrayBuffer> (not ArrayBufferLike) for BodyInit compatibility with TypeScript 6

## Key Architecture Decisions
- Encryption key passed in URL fragment (#) never query params
- AES-GCM-256 encryption; IV (12 bytes) prepended to ciphertext — first 12 bytes are always the IV
- Key exported as base64url (URL-safe, no padding) for the fragment
- Original filename passed as ?name= query param so view page can name the download correctly
- File bytes never touch Lambda, go direct to S3 via presigned URL
- DynamoDB conditional delete with ReturnValues ALL_OLD handles race conditions on view
- S3 lifecycle policy handles post access file cleanup, DynamoDB conditional delete is the access control gate
- MVP user is anonymous, no account required

## Design
- Functional first, design TBD

## Do Not
- Do not write inline fetch calls in components
- Do not store encryption keys in state or localStorage
- Do not add dependencies without flagging for review
- Do not use any or unknown TypeScript types without justification
- Do not hardcode API URLs, secrets, or environment specific values
- Do not add Content-Type header to S3 presigned URL PUT requests — causes signature mismatch 403

## Current Status
Completed:
- AWS infrastructure (Route 53, ACM, API Gateway, Lambda, DynamoDB, S3)
- Upload and view Lambda functions
- CORS configuration
- Custom domain api.filedeadrop.com
- React frontend scaffold
- Home page upload sequence (browser verified)
- View shared link page — /view/:id with client-side decryption (browser verified)

In Progress:
- CloudFront setup

Up Next:
- Design / polish pass
- Remove debug console.log from useUpload.ts before production