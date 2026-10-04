# File Manager

React + Vite frontend, Node/Express REST API, MongoDB (metadata & local auth), Local disk storage with cryptographic signed download URLs.

## Quick Start (Terminal)

### 1. Start Backend (API)
```powershell
cd backend
npm.cmd run dev
```
Runs at `http://localhost:4000`.

### 2. Start Frontend (Web)
```powershell
cd frontend
npm.cmd run dev
```
Runs at `http://localhost:5173`.

### 3. Run Tests
```powershell
cd backend
npm.cmd test
```

## Architecture

- **Auth**: Built-in HMAC-SHA256 authenticated sessions with auto-confirmed accounts in local development mode.
- **Storage**: Local filesystem storage in `backend/data/uploads` with signed, expiring download URLs (`/api/download`).
- **Database**: MongoDB storing user accounts, file metadata, quotas, daily rate counters, and moderation reports.
- **Frontend**: React 19 SPA with Vite, instant search, drag-and-drop file upload, duplicate auto-renaming, and share link management.
