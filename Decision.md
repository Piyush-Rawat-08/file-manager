# Architectural Decisions Record (ADR)

This document outlines the core architectural and technical decisions made during the design, development, and refinement of the File Manager application.

---

## 1. Storage Architecture: Local Disk Storage with Signed URLs

### Context
The initial specification relied on Cloudflare R2 (S3-compatible cloud object storage) for hosting user uploads. While cloud object storage offers scalability, it introduces setup overhead, API tokens, third-party dependency, and network latency during local development and self-hosted deployments.

### Decision
Migrate from Cloudflare R2 to **native local filesystem storage** located in `backend/data/uploads`, complemented by **cryptographically signed download URLs** (`/api/download`).

### Rationale & Trade-offs
- **Zero Third-Party Dependency**: Requires no external cloud accounts, credit cards, or API credentials.
- **Security Parity with Cloud Storage**: Rather than exposing raw public directories or static routes, all file downloads require a 60-second time-limited HMAC-SHA256 signature (`exp` + `sig`). This matches the security model of S3 pre-signed URLs.
- **Path Traversal Protection**: File paths are strictly resolved against the canonical storage root (`path.resolve`) to prevent directory traversal attacks (`../`).
- **Clean Fallback & Migration**: Standard abstractions (`putObject`, `deleteObject`, `signedDownloadUrl`) remain intact, allowing a drop-in transition to S3/R2/MinIO if cloud deployment is needed in the future.

---

## 2. Authentication: Built-in Native Auth vs. External Providers

### Context
The project initially targeted Supabase Auth. This required external project configuration, redirect URL setups, and validation overhead for simple local and private installations.

### Decision
Transition to a **self-contained local authentication system**:
- Backend: User credentials and auto-confirmed verification flags stored in MongoDB (`User` collection). Passwords hashed using Node.js's native `crypto.scryptSync`.
- Session Management: Stateless HMAC-SHA256 signed bearer tokens with configurable expiration.
- Frontend: Standalone `authClient.js` utilizing native `fetch` and `localStorage`, removing the `@supabase/supabase-js` SDK dependency.

### Rationale & Trade-offs
- **Zero Configuration**: Users can register and immediately upload files without configuring SMTP servers or verifying emails in external inboxes.
- **Bundle Size & Speed**: Completely eliminating the Supabase SDK stripped 9 packages from the frontend and 35 packages from the backend, shrinking Vite transformation from 74 modules to 31 modules and reducing build time to ~200ms.
- **Maintainability**: Reduced external attack surface and eradicated SDK version deprecation risks.

---

## 3. Database: Local MongoDB for Metadata & Rate Counters

### Context
The application needs persistence for file metadata (owner, filename, storage key, MIME type, size), user records, moderation reports, and daily quota/rate limit counters.

### Decision
Use **MongoDB with Mongoose ODM** running locally (`mongodb://127.0.0.1:27017/filemanager`).

### Rationale & Trade-offs
- **Atomic Operations for Abuse Protection**: Daily upload and download limits use atomic upserts (`findOneAndUpdate`) on a `Counter` collection with MongoDB TTL indexes for automated daily expiration.
- **Quota Aggregation**: User quota checks utilize MongoDB aggregation pipelines (`$group` with `$sum`) to instantly calculate total stored bytes and file counts.
- **Flexible Schema**: Allows easy extension for tags, folders, or moderation flags without complex migrations.

---

## 4. Frontend UX & Design Decisions

### Context
The initial frontend had a basic form-like appearance, used disruptive native browser dialogs (`window.prompt`, `window.confirm`), and alert banners that shifted page content when files were uploaded.

### Decision
1. **Design System**: Built a SaaS-grade modern theme with **Plus Jakarta Sans**, curated slate palettes (`#0f172a` ink, `#f8fafc` canvas), and layered elevation shadows.
2. **Floating Toast System**: Replaced static alert banners with non-intrusive bottom-right toast notifications featuring a **2.5-second auto-dismiss** timer and manual close buttons.
3. **Custom Accessible Modals**: Replaced native browser popups with styled in-app modal dialogs for:
   - File renaming (with auto-focused input).
   - Delete confirmation (with destructive warning badge).
   - Public link sharing (with one-click clipboard copying and link revocation).
4. **File Badges & Empty States**: Color-coded badges for common extensions (PDF, images, code, archives, text) and empty state illustrations.

---

## 5. Dependency Pruning & Repository Hygiene

### Context
The repository contained leftover cloud SDKs, unused `.env.example` files, and temporary build outputs.

### Decision
- Removed `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, and `@supabase/supabase-js`.
- Cleaned root `.gitignore` to prevent committing sensitive keys (`.env`), dependencies (`node_modules`), build directories (`dist`), and user uploads (`data/uploads`).
- Ensured 100% test coverage with 13 automated tests covering health checks, token signing, download signatures, file rules, and API authorization.
