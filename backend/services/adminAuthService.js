import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, isServiceRoleConfigured } from './supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const CREDS_FILE = path.join(DATA_DIR, 'admin_credentials.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'admin_sessions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 24-hour sliding session validity
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// --- PASSWORD CRYPTOGRAPHY ---

export function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password, salt, storedHash) {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    return false;
  }
}

// --- CREDENTIALS STORAGE (PERSISTENT) ---

function readLocalCreds() {
  try {
    if (fs.existsSync(CREDS_FILE)) {
      return JSON.parse(fs.readFileSync(CREDS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading local admin creds:', e.message);
  }
  return null;
}

function writeLocalCreds(creds) {
  try {
    fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing local admin creds:', e.message);
  }
}

// Production persistence diagnostic check
export function checkProductionPersistencePrerequisites() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !isServiceRoleConfigured) {
    const warningMsg = '[SECURITY ADVISORY: PRODUCTION PERSISTENCE LIMITATION] Backend is operating in production without verified database session persistence (Supabase admin_sessions). Container restarts or redeployments on Render will invalidate active sessions. Phase 3 database migration and SUPABASE_SERVICE_ROLE_KEY are required for persistent production sessions.';
    console.warn(warningMsg);
    return { ready: false, warning: warningMsg };
  }
  return { ready: true };
}

export async function ensureAdminProvisioned() {
  // 1. Check if admin credentials already exist in Supabase (if service-role configured)
  if (supabase && isServiceRoleConfigured) {
    try {
      const { data, error } = await supabase
        .from('admin_credentials')
        .select('*')
        .limit(1)
        .single();
      if (!error && data && data.username && data.password_hash) {
        return data;
      }
    } catch (e) {}
  }

  // 2. Check if admin credentials exist in local persistent file
  const existingLocal = readLocalCreds();
  if (existingLocal && existingLocal.username && existingLocal.password_hash) {
    return existingLocal;
  }

  // 3. No existing account found. We must provision an initial account from environment variables.
  const username = process.env.INITIAL_ADMIN_USERNAME || 'Dasaris_Darbar';
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin@dasari1099';

  if (!initialPassword || typeof initialPassword !== 'string' || initialPassword.trim().length < 8) {
    const errorMsg = '[SECURITY ERROR] Cannot provision initial admin account: password is shorter than 8 characters.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(initialPassword.trim(), salt);

  const credsRecord = {
    username: username.trim(),
    salt,
    password_hash: passwordHash,
    iterations: 65536,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  writeLocalCreds(credsRecord);
  console.log(`[AUTH] Initial admin account "${username.trim()}" successfully provisioned from environment variable configuration.`);

  // If Supabase service role is available, sync to admin_credentials table
  if (supabase && isServiceRoleConfigured) {
    try {
      await supabase.from('admin_credentials').upsert({
        username: credsRecord.username,
        salt: credsRecord.salt,
        password_hash: credsRecord.password_hash,
        iterations: credsRecord.iterations,
        updated_at: credsRecord.updated_at
      }, { onConflict: 'username' });
    } catch (e) {
      // Table may not exist yet until SQL migration
    }
  }

  return credsRecord;
}

export async function getAdminRecord(username) {
  // Try Supabase first if service role configured
  if (supabase && isServiceRoleConfigured) {
    try {
      const { data, error } = await supabase
        .from('admin_credentials')
        .select('*')
        .ilike('username', username.trim())
        .single();
      if (!error && data) return data;
    } catch (e) {
      // Fall through to local persistent store
    }
  }

  const local = readLocalCreds();
  if (local && local.username.toLowerCase() === username.trim().toLowerCase()) {
    return local;
  }

  return null;
}

export async function updateAdminCredentials({ currentPassword, newUsername, newPassword }) {
  const current = await ensureAdminProvisioned();

  if (!verifyPassword(currentPassword, current.salt, current.password_hash)) {
    return { success: false, message: 'Current password is incorrect.' };
  }

  if (!newUsername || newUsername.trim().length < 3) {
    return { success: false, message: 'New username must be at least 3 characters long.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'New password must be at least 6 characters long.' };
  }

  const newSalt = generateSalt();
  const newHash = hashPassword(newPassword, newSalt);
  const nowISO = new Date().toISOString();

  const updatedRecord = {
    username: newUsername.trim(),
    salt: newSalt,
    password_hash: newHash,
    iterations: 65536,
    created_at: current.created_at || nowISO,
    updated_at: nowISO
  };

  writeLocalCreds(updatedRecord);

  if (supabase && isServiceRoleConfigured) {
    try {
      await supabase.from('admin_credentials').upsert({
        username: updatedRecord.username,
        salt: updatedRecord.salt,
        password_hash: updatedRecord.password_hash,
        iterations: updatedRecord.iterations,
        updated_at: updatedRecord.updated_at
      }, { onConflict: 'username' });
    } catch (e) {
      console.warn('Supabase admin_credentials update note:', e.message);
    }
  }

  // Revoke all existing sessions upon password rotation
  await revokeAllSessions();

  return { success: true, message: 'Admin credentials successfully updated.' };
}

// --- SESSION MANAGEMENT (PERSISTENT & REVOCABLE) ---

function readLocalSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading local admin sessions:', e.message);
  }
  return [];
}

function writeLocalSessions(sessions) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing local admin sessions:', e.message);
  }
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function createSession(adminUsername, ipAddress = null, userAgent = null) {
  const rawSessionToken = crypto.randomBytes(32).toString('hex');
  const rawCsrfToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawSessionToken);
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();

  const sessionRecord = {
    id: crypto.randomUUID(),
    token_hash: tokenHash,
    csrf_token: rawCsrfToken,
    admin_username: adminUsername,
    created_at: new Date(now).toISOString(),
    last_activity: new Date(now).toISOString(),
    expires_at: expiresAt,
    ip_address: ipAddress || '127.0.0.1',
    user_agent: userAgent || 'unknown'
  };

  // 1. Write to local persistent file
  const localSessions = readLocalSessions().filter(s => new Date(s.expires_at).getTime() > now);
  localSessions.push(sessionRecord);
  writeLocalSessions(localSessions);

  // 2. Write to Supabase if service-role is configured
  if (supabase && isServiceRoleConfigured) {
    try {
      await supabase.from('admin_sessions').insert([sessionRecord]);
    } catch (e) {
      // Table may not exist yet
    }
  }

  return {
    rawSessionToken,
    rawCsrfToken,
    expiresAt,
    adminUsername
  };
}

export async function validateSession(rawSessionToken) {
  if (!rawSessionToken) return null;

  const tokenHash = hashToken(rawSessionToken);
  const now = Date.now();

  // Try Supabase first if service-role configured
  if (supabase && isServiceRoleConfigured) {
    try {
      const { data, error } = await supabase
        .from('admin_sessions')
        .select('*')
        .eq('token_hash', tokenHash)
        .single();

      if (!error && data) {
        if (new Date(data.expires_at).getTime() < now) {
          // Expired: delete
          await supabase.from('admin_sessions').delete().eq('token_hash', tokenHash);
          return null;
        }

        // Sliding expiration update
        const newExpiry = new Date(now + SESSION_TTL_MS).toISOString();
        supabase.from('admin_sessions').update({
          last_activity: new Date(now).toISOString(),
          expires_at: newExpiry
        }).eq('token_hash', tokenHash).then(() => {});

        return data;
      }
    } catch (e) {
      // Fall through to local persistent session
    }
  }

  // Local persistent session check
  const localSessions = readLocalSessions();
  const session = localSessions.find(s => s.token_hash === tokenHash);

  if (!session) return null;

  if (new Date(session.expires_at).getTime() < now) {
    // Expired: clean up
    writeLocalSessions(localSessions.filter(s => s.token_hash !== tokenHash));
    return null;
  }

  // Sliding expiration
  session.last_activity = new Date(now).toISOString();
  session.expires_at = new Date(now + SESSION_TTL_MS).toISOString();
  writeLocalSessions(localSessions);

  return session;
}

export async function revokeSession(rawSessionToken) {
  if (!rawSessionToken) return;
  const tokenHash = hashToken(rawSessionToken);

  if (supabase && isServiceRoleConfigured) {
    try {
      await supabase.from('admin_sessions').delete().eq('token_hash', tokenHash);
    } catch (e) {}
  }

  const localSessions = readLocalSessions().filter(s => s.token_hash !== tokenHash);
  writeLocalSessions(localSessions);
}

export async function revokeAllSessions() {
  if (supabase && isServiceRoleConfigured) {
    try {
      await supabase.from('admin_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {}
  }
  writeLocalSessions([]);
}
