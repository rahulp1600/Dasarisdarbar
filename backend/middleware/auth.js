import crypto from 'crypto';
import { validateSession } from '../services/adminAuthService.js';

// --- IN-MEMORY SLIDING RATE LIMITER FOR LOGIN ---
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const now = Date.now();

  const record = loginAttempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + WINDOW_MS;
  }

  if (record.count >= MAX_ATTEMPTS) {
    const remainingSeconds = Math.ceil((record.resetAt - now) / 1000);
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Too many failed login attempts. Please wait ${remainingSeconds} seconds before trying again.`,
      retryAfterSeconds: remainingSeconds
    });
  }

  // Attach tracker helper to response for logging failure
  res.recordFailedLogin = () => {
    record.count += 1;
    loginAttempts.set(ip, record);
  };

  res.recordSuccessfulLogin = () => {
    loginAttempts.delete(ip);
  };

  next();
}

// --- REQUIRE ADMIN AUTHENTICATION MIDDLEWARE ---
export async function requireAdminAuth(req, res, next) {
  // 1. Extract session token from HttpOnly cookie or authorization/x-admin-session header
  const cookieToken = req.cookies?.dd_admin_session;
  const headerToken = req.headers['x-admin-session'] ||
    (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);

  const rawSessionToken = cookieToken || headerToken;

  if (!rawSessionToken) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Admin authentication required.'
    });
  }

  // 2. Validate session against persistent store
  const session = await validateSession(rawSessionToken);
  if (!session) {
    return res.status(401).json({
      success: false,
      code: 'SESSION_EXPIRED',
      message: 'Admin session is invalid or has expired. Please log in again.'
    });
  }

  // Validate non-empty authenticated admin username (no silent fallbacks)
  const authenticatedUsername = session.admin_username || session.adminUsername || session.username;
  if (!authenticatedUsername || typeof authenticatedUsername !== 'string' || !authenticatedUsername.trim()) {
    return res.status(401).json({
      success: false,
      code: 'SESSION_INVALID',
      message: 'Admin session identity is missing or invalid. Please log in again.'
    });
  }

  // 3. CSRF Verification for state-modifying requests (POST, PUT, PATCH, DELETE)
  const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  if (isMutatingMethod) {
    const clientCsrfToken = req.headers['x-csrf-token'];
    const sessionCsrfToken = session.csrf_token;

    if (!clientCsrfToken || !sessionCsrfToken) {
      return res.status(403).json({
        success: false,
        code: 'CSRF_REQUIRED',
        message: 'Security validation failed: CSRF token missing.'
      });
    }

    try {
      const a = Buffer.from(clientCsrfToken, 'utf-8');
      const b = Buffer.from(sessionCsrfToken, 'utf-8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(403).json({
          success: false,
          code: 'CSRF_INVALID',
          message: 'Security validation failed: Invalid CSRF token.'
        });
      }
    } catch (e) {
      return res.status(403).json({
        success: false,
        code: 'CSRF_INVALID',
        message: 'Security validation failed: Invalid CSRF token.'
      });
    }
  }

  // Attach session context to request
  req.adminSession = session;
  req.adminUser = authenticatedUsername.trim();

  next();
}
