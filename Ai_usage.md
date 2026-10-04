# AI Collaboration & Usage Record

This document details the usage, workflows, and prompts employed with the AI pair programming assistant (Antigravity) during the development, debugging, refactoring, and styling of this File Manager application.

---

## 1. Overview of AI Role

The AI assistant acted as an autonomous full-stack pair programmer responsible for:
- Root cause diagnosis of runtime and environment errors.
- Architectural refactoring from cloud dependencies to a local-first system.
- Designing and implementing cryptographic utilities for secure download links and sessions.
- Upgrading UI/UX from rudimentary styles to a SaaS-grade modern web interface.
- Dependency pruning, dead code elimination, and repository sanitization.

---

## 2. Key Areas of AI Contribution

### A. Environment Diagnosis & Dependency Resolution
- **Issue**: Initial server start failed with `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'mongoose'` due to missing `node_modules` and Windows PowerShell script execution policy restrictions blocking `npm.ps1`.
- **AI Action**: Identified the policy barrier, installed backend and frontend packages via `npm.cmd`, and verified package resolution using Node's module runner.

### B. Cloud-to-Local Architectural Refactoring
- **Issue**: The original architecture mandated three third-party cloud accounts (MongoDB Atlas, Supabase Auth, and Cloudflare R2).
- **User Prompt**: Transition to a 100% local, self-contained setup without requiring third-party accounts.
- **AI Action**:
  - Detected and verified a local MongoDB service on `mongodb://127.0.0.1:27017`.
  - Replaced Cloudflare R2 with native filesystem storage (`backend/data/uploads`) using Node.js `fs/promises`.
  - Replaced Supabase Auth with a lightweight native authentication service:
    - Built a `User` model with `scrypt` password hashing and salt generation.
    - Implemented HMAC-SHA256 signed session tokens (`tokens.js`).
    - Developed a standalone `authClient.js` for the frontend to eliminate external SDKs.

### C. Security Engineering
- **Signed Download Links**: Designed a cryptographic signature system (`signDownload` & `verifyDownload`) for local file downloads (`/api/download`), ensuring files cannot be accessed without a valid 60-second HMAC signature.
- **Path Traversal Defenses**: Built strict path validation ensuring requested files resolve within `backend/data/uploads` and cannot escape via `../` path exploits.
- **XSS & File Type Safety**: Preserved strict file header inspection, blocked executable extensions/magic bytes, and set `Content-Disposition: attachment` to prevent arbitrary HTML/script execution in browsers.

### D. UI/UX & Frontend Polish
- **User Prompt**: "Make the styling more professional and remove the success message after uploading file after 2-3 seconds."
- **AI Action**:
  - **Auto-Dismissing Notifications**: Created a non-intrusive floating toast notification system in the bottom-right corner with a **2.5-second auto-dismiss** timer and manual close buttons.
  - **Custom Modal Dialogs**: Replaced native browser popups (`window.prompt` and `window.confirm`) with styled in-app modal cards for file renaming, deletion confirmation, and public link sharing.
  - **SaaS Design System**: Integrated **Plus Jakarta Sans**, clean slate color palettes, file type category badges (PDF, image, code, text, zip), an interactive upload dropzone, and responsive action toolbars.

### E. Dependency Pruning & Hygiene
- **AI Action**: Uninstalled `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, and `@supabase/supabase-js`, removing over 40 unused dependencies.
- **Result**: Reduced frontend Vite transformation from 74 modules to 31 modules and dropped build times to ~200ms.
- **Git Cleanup**: Removed accidental nested `.git` folders in `frontend/`, configured comprehensive `.gitignore` rules, and removed redundant `.env.example` templates.

---

## 3. Human Oversight & Feedback Loops

All critical product decisions were directed and validated by the user:
1. **Selecting Option 2 (Local Mode)**: Deciding to run completely offline rather than provisioning cloud services.
2. **Design Feedback**: Directing the visual style toward a clean, professional aesthetic and specifying the 2-3 second auto-dismiss timer for upload success feedback.
3. **Repository Control**: Reviewing git structures and commands prior to pushing to GitHub.

---

## 4. Verification & Testing

Every change was programmatically validated:
- **Unit & Integration Tests**: 13 automated tests (`npm test`) covering API health, authorization barriers, name sanitization, duplicate renaming, and HMAC token validation.
- **End-to-End Flow**: Tested user signup, signin, file upload, duplicate numbering, local download streaming, and public link sharing via API and curl.
- **Production Build**: Verified clean Vite builds with zero warnings or bundle bloat.
