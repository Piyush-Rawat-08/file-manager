import path from 'node:path';
import 'dotenv/config';

const MB = 1024 * 1024;
const num = (key, fallback) => (process.env[key] ? Number(process.env[key]) : fallback);

export const config = {
  port: num('PORT', 4000),
  trustProxy: num('TRUST_PROXY', 0),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/filemanager',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  apiUrl: process.env.API_URL || `http://localhost:${num('PORT', 4000)}`,
  adminApiKey: process.env.ADMIN_API_KEY || 'dev-admin-key',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-file-manager-local-1234567890',
  localStorageDir: process.env.LOCAL_STORAGE_DIR || path.resolve(process.cwd(), 'data', 'uploads'),
  // Limits from PRD v2, section 5.2. All are overridable by env var.
  limits: {
    maxFileBytes: num('MAX_FILE_MB', 10) * MB,
    userQuotaBytes: num('USER_QUOTA_MB', 100) * MB,
    maxFilesPerUser: num('MAX_FILES_PER_USER', 200),
    uploadsPerDay: num('UPLOADS_PER_DAY', 30),
    shareDownloadsPerLinkPerDay: num('SHARE_DL_PER_LINK_PER_DAY', 20),
    shareBytesPerAccountPerDay: num('SHARE_MB_PER_ACCOUNT_PER_DAY', 200) * MB,
    globalStorageBytes: num('GLOBAL_STORAGE_GB', 10) * 1024 * MB,
    pauseAtFraction: 0.95,
  },
};

export function assertConfig() {
  if (!config.mongoUri) {
    throw new Error('Missing environment variable: MONGODB_URI');
  }
}
