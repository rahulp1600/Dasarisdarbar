import express from 'express';
import { supabase, readLocalStore, writeLocalStore } from '../services/supabaseClient.js';
import { redeemVoucher } from '../services/loyaltyEngine.js';
import { 
  getDailySequenceConfig, 
  setDailySequenceConfig, 
  countBillsForBusinessDate, 
  getBusinessDate 
} from '../services/billValidation.js';
import { logAuditEvent } from '../services/auditLogger.js';
import { requireAdminAuth, loginRateLimiter } from '../middleware/auth.js';
import {
  getAdminRecord,
  verifyPassword,
  createSession,
  validateSession,
  revokeSession,
  updateAdminCredentials
} from '../services/adminAuthService.js';

const router = express.Router();

/**
 * =========================================================================
 * UNPROTECTED AUTHENTICATION & SESSION ENDPOINTS (EXCEPTIONS)
 * =========================================================================
 */

/**
 * POST /api/admin/login
 * Verifies admin credentials, creates persistent session, sets HttpOnly cookie
 */
router.post('/login', loginRateLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    if (res.recordFailedLogin) res.recordFailedLogin();
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  try {
    const adminRecord = await getAdminRecord(username);
    if (!adminRecord) {
      if (res.recordFailedLogin) res.recordFailedLogin();
      return res.status(401).json({ success: false, message: 'Invalid admin username or password.' });
    }

    const isValid = verifyPassword(password, adminRecord.salt, adminRecord.password_hash);
    if (!isValid) {
      if (res.recordFailedLogin) res.recordFailedLogin();
      await logAuditEvent({
        actionType: 'ADMIN_LOGIN_FAILED',
        actorId: username,
        targetRecordType: 'admin_auth',
        ipAddress: req.ip
      });
      return res.status(401).json({ success: false, message: 'Invalid admin username or password.' });
    }

    if (res.recordSuccessfulLogin) res.recordSuccessfulLogin();

    const session = await createSession(
      adminRecord.username,
      req.ip,
      req.headers['user-agent']
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('dd_admin_session', session.rawSessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    await logAuditEvent({
      actionType: 'ADMIN_LOGIN_SUCCESS',
      actorId: adminRecord.username,
      targetRecordType: 'admin_auth',
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Login successful',
      username: session.adminUsername,
      csrfToken: session.rawCsrfToken
    });
  } catch (err) {
    console.error('Error during admin login:', err);
    return res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
});

/**
 * GET /api/admin/session
 * Session status probe (does not return 401; returns authenticated: false if no valid session)
 */
router.get('/session', async (req, res) => {
  const cookieToken = req.cookies?.dd_admin_session;
  const headerToken = req.headers['x-admin-session'] ||
    (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);
  const rawToken = cookieToken || headerToken;

  if (!rawToken) {
    return res.json({ success: true, authenticated: false });
  }

  try {
    const session = await validateSession(rawToken);
    if (!session) {
      return res.json({ success: true, authenticated: false });
    }

    return res.json({
      success: true,
      authenticated: true,
      username: session.admin_username,
      csrfToken: session.csrf_token
    });
  } catch (err) {
    return res.json({ success: true, authenticated: false });
  }
});

/**
 * POST /api/admin/logout
 * Revokes session and clears session cookie
 */
router.post('/logout', async (req, res) => {
  const cookieToken = req.cookies?.dd_admin_session;
  const headerToken = req.headers['x-admin-session'] ||
    (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);
  const rawToken = cookieToken || headerToken;

  if (rawToken) {
    try {
      await revokeSession(rawToken);
    } catch (e) {}
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('dd_admin_session', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/'
  });

  return res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * =========================================================================
 * ALL SUBSEQUENT ROUTES REQUIRE AUTHENTICATED ADMIN SESSION + CSRF
 * =========================================================================
 */
router.use(requireAdminAuth);

/**
 * POST /api/admin/change-credentials
 * Authenticated admin updates their password
 */
router.post('/change-credentials', async (req, res) => {
  const { currentPassword, newUsername, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword) {
    return res.status(400).json({ success: false, message: 'Current password is required.' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'New password and confirmation do not match.' });
  }

  try {
    const result = await updateAdminCredentials({
      currentPassword,
      newUsername: newUsername || req.adminUser,
      newPassword
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    const newSession = await createSession(
      newUsername || req.adminUser,
      req.ip,
      req.headers['user-agent']
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('dd_admin_session', newSession.rawSessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    await logAuditEvent({
      actionType: 'ADMIN_CREDENTIALS_CHANGED',
      actorId: req.adminUser,
      targetRecordType: 'admin_credentials',
      details: { newUsername: newUsername || req.adminUser }
    });

    return res.json({
      success: true,
      message: 'Admin credentials successfully updated.',
      username: newSession.adminUsername,
      csrfToken: newSession.rawCsrfToken
    });
  } catch (err) {
    console.error('Error changing admin credentials:', err);
    return res.status(500).json({ success: false, message: 'Server error updating credentials.' });
  }
});

/**
 * POST /api/admin/redeem
 * Staff/Admin verifies and redeems a voucher (milestone reward or big bill coupon)
 */
router.post('/redeem', async (req, res) => {
  const { voucherCode, staffIdentifier } = req.body;

  if (!voucherCode) {
    return res.status(400).json({ success: false, message: 'voucherCode is required' });
  }

  try {
    const result = await redeemVoucher({
      voucherCode,
      staffIdentifier: staffIdentifier || 'Staff Cashier'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err) {
    console.error('Error redeeming voucher:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

/**
 * GET /api/admin/daily-sequence
 * Retrieves admin-configured daily sequence for business date
 */
router.get('/daily-sequence', async (req, res) => {
  const targetDate = req.query.date || getBusinessDate();

  try {
    const config = await getDailySequenceConfig(targetDate);
    const billsCount = await countBillsForBusinessDate(targetDate);
    const isConfigured = !!(config && config.first_bill_number);

    return res.json({
      success: true,
      businessDate: targetDate,
      config: config || null,
      isConfigured,
      firstBillNumber: config?.first_bill_number || null,
      billsCountToday: billsCount,
      warning: !isConfigured ? "Today's bill sequence is not set." : null
    });
  } catch (err) {
    console.error('Error fetching daily sequence:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

/**
 * POST /api/admin/daily-sequence
 * Admin configures today's first bill number
 */
router.post('/daily-sequence', async (req, res) => {
  const { businessDate, firstBillNumber, confirmOverride = false } = req.body;
  const targetDate = businessDate || getBusinessDate();

  if (!firstBillNumber || isNaN(parseInt(firstBillNumber, 10)) || parseInt(firstBillNumber, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid positive integer for today\'s first bill number.'
    });
  }

  try {
    const billsCount = await countBillsForBusinessDate(targetDate);

    // If bills exist and admin has not confirmed override
    if (billsCount > 0 && !confirmOverride) {
      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        billsCount,
        message: `${billsCount} bill(s) have already been submitted today. Updating the starting sequence may affect subsequent sequence checks. Do you want to proceed?`
      });
    }

    const savedConfig = await setDailySequenceConfig({
      businessDate: targetDate,
      firstBillNumber: parseInt(firstBillNumber, 10),
      adminUser: req.adminUser
    });

    return res.json({
      success: true,
      message: `Today's starting bill sequence set to #${savedConfig.first_bill_number} for date ${targetDate}.`,
      config: savedConfig
    });
  } catch (err) {
    console.error('Error setting daily sequence:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

/**
 * GET /api/admin/offers
 * Retrieves loyalty offers list
 */
router.get('/offers', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loyalty_offers')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    } catch (e) {
      console.warn('Supabase offers query fallback:', e.message);
    }
  }

  const store = readLocalStore();
  return res.json({ success: true, data: store.loyalty_offers || [] });
});

/**
 * POST /api/admin/offers
 * Admin updates or creates a loyalty offer
 */
router.post('/offers', async (req, res) => {
  const offer = req.body;
  if (!offer || !offer.title) {
    return res.status(400).json({ success: false, message: 'Offer title is required.' });
  }

  if (offer.discount_percent !== undefined && offer.discount_percent !== null && offer.discount_percent !== '') {
    const num = Number(offer.discount_percent);
    if (isNaN(num) || num < 0 || num > 100) {
      return res.status(400).json({ success: false, message: 'Discount percentage must be between 0 and 100.' });
    }
  }

  const store = readLocalStore();
  const offerId = offer.id || `offer_${Date.now()}`;
  const offerPayload = {
    id: offerId,
    title: offer.title,
    discount_type: offer.discount_type || 'percentage_discount',
    value: offer.value || (offer.discount_percent ? `${offer.discount_percent}%` : 'Special'),
    discount_percent: offer.discount_percent ? Number(offer.discount_percent) : null,
    max_discount: offer.max_discount ? Number(offer.max_discount) : null,
    description: offer.description || '',
    active: offer.active !== false,
    expiry_days: Number(offer.expiry_days) || 30
  };

  if (supabase) {
    try {
      await supabase.from('loyalty_offers').upsert(offerPayload);
    } catch (e) {
      console.warn('Supabase offer upsert fallback:', e.message);
    }
  }

  if (!store.loyalty_offers) store.loyalty_offers = [];
  const idx = store.loyalty_offers.findIndex(o => o.id === offerId);
  if (idx >= 0) {
    store.loyalty_offers[idx] = offerPayload;
  } else {
    store.loyalty_offers.push(offerPayload);
  }
  writeLocalStore(store);

  await logAuditEvent({
    actionType: 'LOYALTY_OFFER_CONFIGURED',
    actorId: req.adminUser,
    targetRecordType: 'loyalty_offers',
    targetRecordId: offerId,
    details: offerPayload
  });

  return res.json({ success: true, offer: offerPayload });
});

/**
 * PATCH /api/admin/offers/:id/status
 * Admin activates or deactivates a loyalty offer
 */
router.patch('/offers/:id/status', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body || {};
  const isActive = Boolean(active);
  let updatedInSupabase = false;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loyalty_offers')
        .update({ active: isActive })
        .eq('id', id)
        .select();
      if (!error && data && data.length > 0) updatedInSupabase = true;
    } catch (e) {
      console.warn('Supabase offer status toggle fallback:', e.message);
    }
  }

  const store = readLocalStore();
  if (!store.loyalty_offers) store.loyalty_offers = [];
  const idx = store.loyalty_offers.findIndex(o => o.id === id);
  if (idx >= 0) {
    store.loyalty_offers[idx].active = isActive;
    writeLocalStore(store);
  }

  await logAuditEvent({
    actionType: 'LOYALTY_OFFER_STATUS_UPDATED',
    actorId: req.adminUser,
    targetRecordType: 'loyalty_offers',
    targetRecordId: id,
    details: { active: isActive, updatedInSupabase }
  });

  return res.json({
    success: true,
    id,
    active: isActive,
    offer: { id, active: isActive },
    message: `Offer ${isActive ? 'activated' : 'deactivated'} successfully.`
  });
});

/**
 * DELETE /api/admin/offers/:id
 * Admin deletes a loyalty offer
 */
router.delete('/offers/:id', async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    try {
      await supabase.from('loyalty_offers').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase offer delete fallback:', e.message);
    }
  }

  const store = readLocalStore();
  if (store.loyalty_offers) {
    store.loyalty_offers = store.loyalty_offers.filter(o => o.id !== id);
    writeLocalStore(store);
  }

  await logAuditEvent({
    actionType: 'LOYALTY_OFFER_DELETED',
    actorId: req.adminUser,
    targetRecordType: 'loyalty_offers',
    targetRecordId: id,
    details: { offerId: id }
  });

  return res.json({ success: true, message: 'Offer deleted successfully.' });
});

/**
 * GET /api/admin/verified-bills
 */
router.get('/verified-bills', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('verified_bills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) return res.json({ success: true, data });
    } catch (e) {
      console.warn('Supabase verified-bills query fallback:', e.message);
    }
  }

  const store = readLocalStore();
  return res.json({ success: true, data: store.verified_bills.slice().reverse() });
});

/**
 * GET /api/admin/claims
 */
router.get('/claims', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loyalty_claims')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) return res.json({ success: true, data });
    } catch (e) {
      console.warn('Supabase claims query fallback:', e.message);
    }
  }

  const store = readLocalStore();
  return res.json({ success: true, data: store.loyalty_claims.slice().reverse() });
});

/**
 * GET /api/admin/rewards
 */
router.get('/rewards', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('customer_rewards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) return res.json({ success: true, data });
    } catch (e) {
      console.warn('Supabase rewards query fallback:', e.message);
    }
  }

  const store = readLocalStore();
  return res.json({ success: true, data: store.customer_rewards.slice().reverse() });
});

/**
 * GET /api/admin/coupons
 */
router.get('/coupons', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('big_bill_coupons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) return res.json({ success: true, data });
    } catch (e) {
      console.warn('Supabase coupons query fallback:', e.message);
    }
  }

  const store = readLocalStore();
  return res.json({ success: true, data: store.big_bill_coupons.slice().reverse() });
});

/**
 * GET /api/admin/redemptions
 */
router.get('/redemptions', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('redemptions')
        .select('*')
        .order('redeemed_at', { ascending: false })
        .limit(100);

      if (!error && data) return res.json({ success: true, data });
    } catch (e) {
      console.warn('Supabase redemptions query fallback:', e.message);
    }
  }

  const store = readLocalStore();
  return res.json({ success: true, data: store.redemptions.slice().reverse() });
});

/**
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) return res.json({ success: true, data });
    } catch (e) {
      console.warn('Supabase audit-logs query fallback:', e.message);
    }
  }

  const store = readLocalStore();
  return res.json({ success: true, data: store.admin_audit_logs.slice().reverse() });
});

/**
 * =========================================================================
 * TABLE RESERVATION OFFERS ENDPOINTS
 * =========================================================================
 */

/**
 * GET /api/admin/reservation-offers
 * Retrieves all table reservation offers
 */
router.get('/reservation-offers', async (req, res) => {
  const store = readLocalStore();
  const offers = store.reservation_offers || [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('dine_in_offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const supabaseOffers = data.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || '',
          discount_percentage: Number(item.discount_percentage) || 10,
          start_date: item.start_date || item.valid_from || '',
          end_date: item.end_date || item.valid_to || '',
          active: item.active !== false,
          created_at: item.created_at
        }));

        const ids = new Set(supabaseOffers.map(o => o.id));
        const merged = [...supabaseOffers, ...offers.filter(o => !ids.has(o.id))];
        return res.json({ success: true, data: merged });
      }
    } catch (e) {
      console.warn('Supabase dine_in_offers query fallback:', e.message);
    }
  }

  return res.json({ success: true, data: offers });
});

/**
 * GET /api/admin/reservation-offers/active
 * Publicly returns ONLY currently valid offers for new bookings
 * Enforces: active = true, start_date <= today <= end_date
 */
router.get('/reservation-offers/active', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const store = readLocalStore();
  const allOffers = store.reservation_offers || [];

  const validOffers = allOffers.filter(offer => {
    if (!offer.active) return false;
    if (offer.start_date && offer.start_date > today) return false;
    if (offer.end_date && offer.end_date < today) return false;
    return true;
  });

  return res.json({ success: true, data: validOffers });
});

/**
 * POST /api/admin/reservation-offers
 * Admin creates or updates a table reservation offer
 */
router.post('/reservation-offers', async (req, res) => {
  const { id, title, description, discount_percentage, start_date, end_date, active = true } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Offer title is required.' });
  }

  const discountNum = Number(discount_percentage);
  if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
    return res.status(400).json({ success: false, message: 'Discount percentage must be a valid number between 0 and 100.' });
  }

  if (start_date && end_date && start_date > end_date) {
    return res.status(400).json({ success: false, message: 'Offer start date cannot be after end date.' });
  }

  const offerId = id || `roffer_${Date.now()}`;
  const nowISO = new Date().toISOString();
  const offerPayload = {
    id: offerId,
    title: title.trim(),
    description: description ? description.trim() : '',
    discount_percentage: discountNum,
    start_date: start_date || nowISO.split('T')[0],
    end_date: end_date || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    active: Boolean(active),
    created_at: nowISO
  };

  const store = readLocalStore();
  if (!store.reservation_offers) store.reservation_offers = [];
  const existingIdx = store.reservation_offers.findIndex(o => o.id === offerId);
  if (existingIdx >= 0) {
    store.reservation_offers[existingIdx] = { ...store.reservation_offers[existingIdx], ...offerPayload };
  } else {
    store.reservation_offers.unshift(offerPayload);
  }
  writeLocalStore(store);

  if (supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(offerId);
      const rpcRes = await supabase.rpc('admin_upsert_dine_in_offer', {
        p_id: isUUID ? offerId : null,
        p_title: offerPayload.title,
        p_description: offerPayload.description,
        p_discount_percentage: offerPayload.discount_percentage,
        p_start_date: offerPayload.start_date,
        p_end_date: offerPayload.end_date,
        p_active: offerPayload.active
      });
      if (!rpcRes?.error && rpcRes?.data?.offer?.id) {
        offerPayload.id = rpcRes.data.offer.id;
      } else {
        // Direct fallback attempt
        await supabase.from('dine_in_offers').upsert({
          id: offerPayload.id,
          title: offerPayload.title,
          description: offerPayload.description,
          valid_from: offerPayload.start_date,
          valid_to: offerPayload.end_date,
          active: offerPayload.active
        });
      }
    } catch (e) {
      console.warn('Supabase dine_in_offers upsert fallback:', e.message);
    }
  }

  await logAuditEvent({
    actionType: 'RESERVATION_OFFER_CONFIGURED',
    actorId: req.adminUser,
    targetRecordType: 'dine_in_offers',
    targetRecordId: offerId,
    details: offerPayload
  });

  return res.json({ success: true, offer: offerPayload, message: 'Reservation offer saved successfully.' });
});

/**
 * PUT /api/admin/reservation-offers/:id
 * Update an existing reservation offer
 */
router.put('/reservation-offers/:id', async (req, res) => {
  req.body = { ...req.body, id: req.params.id };
  const { id, title, description, discount_percentage, start_date, end_date, active = true } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Offer title is required.' });
  }

  const discountNum = Number(discount_percentage);
  if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
    return res.status(400).json({ success: false, message: 'Discount percentage must be a valid number between 0 and 100.' });
  }

  if (start_date && end_date && start_date > end_date) {
    return res.status(400).json({ success: false, message: 'Offer start date cannot be after end date.' });
  }

  const offerId = id;
  const nowISO = new Date().toISOString();
  const offerPayload = {
    id: offerId,
    title: title.trim(),
    description: description ? description.trim() : '',
    discount_percentage: discountNum,
    start_date: start_date || nowISO.split('T')[0],
    end_date: end_date || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    active: Boolean(active),
    updated_at: nowISO
  };

  const store = readLocalStore();
  if (!store.reservation_offers) store.reservation_offers = [];
  const existingIdx = store.reservation_offers.findIndex(o => o.id === offerId);
  if (existingIdx >= 0) {
    store.reservation_offers[existingIdx] = { ...store.reservation_offers[existingIdx], ...offerPayload };
  } else {
    store.reservation_offers.unshift(offerPayload);
  }
  writeLocalStore(store);

  if (supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(offerId);
      const rpcRes = await supabase.rpc('admin_upsert_dine_in_offer', {
        p_id: isUUID ? offerId : null,
        p_title: offerPayload.title,
        p_description: offerPayload.description,
        p_discount_percentage: offerPayload.discount_percentage,
        p_start_date: offerPayload.start_date,
        p_end_date: offerPayload.end_date,
        p_active: offerPayload.active
      });
      if (!rpcRes?.error && rpcRes?.data?.offer?.id) {
        offerPayload.id = rpcRes.data.offer.id;
      } else {
        await supabase.from('dine_in_offers').upsert({
          id: offerPayload.id,
          title: offerPayload.title,
          description: offerPayload.description,
          valid_from: offerPayload.start_date,
          valid_to: offerPayload.end_date,
          active: offerPayload.active
        });
      }
    } catch (e) {
      console.warn('Supabase dine_in_offers upsert fallback:', e.message);
    }
  }

  await logAuditEvent({
    actionType: 'RESERVATION_OFFER_CONFIGURED',
    actorId: req.adminUser,
    targetRecordType: 'dine_in_offers',
    targetRecordId: offerId,
    details: offerPayload
  });

  return res.json({ success: true, offer: offerPayload, message: 'Reservation offer updated successfully.' });
});

/**
 * PATCH /api/admin/reservation-offers/:id/status
 * Toggle or set offer active status
 */
router.patch('/reservation-offers/:id/status', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  const store = readLocalStore();
  if (!store.reservation_offers) store.reservation_offers = [];
  const offer = store.reservation_offers.find(o => o.id === id);

  if (!offer) {
    return res.status(404).json({ success: false, message: 'Reservation offer not found.' });
  }

  offer.active = active !== undefined ? Boolean(active) : !offer.active;
  writeLocalStore(store);

  if (supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUUID) {
        await supabase.rpc('admin_upsert_dine_in_offer', {
          p_id: id,
          p_title: offer.title,
          p_description: offer.description || '',
          p_discount_percentage: offer.discount_percentage || 10,
          p_start_date: offer.start_date || null,
          p_end_date: offer.end_date || null,
          p_active: offer.active
        });
      }
      await supabase.from('dine_in_offers').update({ active: offer.active }).eq('id', id);
    } catch (e) {
      console.warn('Supabase status update fallback:', e.message);
    }
  }

  await logAuditEvent({
    actionType: 'RESERVATION_OFFER_STATUS_CHANGED',
    actorId: req.adminUser,
    targetRecordType: 'dine_in_offers',
    targetRecordId: id,
    details: { active: offer.active }
  });

  return res.json({ success: true, offer, message: `Offer ${offer.active ? 'activated' : 'deactivated'} successfully.` });
});

/**
 * DELETE /api/admin/reservation-offers/:id
 * Delete a reservation offer
 */
router.delete('/reservation-offers/:id', async (req, res) => {
  const { id } = req.params;

  const store = readLocalStore();
  if (!store.reservation_offers) store.reservation_offers = [];
  store.reservation_offers = store.reservation_offers.filter(o => o.id !== id);
  writeLocalStore(store);

  if (supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUUID) {
        await supabase.rpc('admin_delete_dine_in_offer', {
          p_offer_id: id
        });
      }
      await supabase.from('dine_in_offers').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete fallback:', e.message);
    }
  }

  await logAuditEvent({
    actionType: 'RESERVATION_OFFER_DELETED',
    actorId: req.adminUser,
    targetRecordType: 'dine_in_offers',
    targetRecordId: id,
    details: { deletedOfferId: id }
  });

  return res.json({ success: true, message: 'Reservation offer deleted successfully.' });
});

/**
 * =========================================================================
 * MENU ITEM EDITING ENDPOINTS
 * =========================================================================
 */

/**
 * GET /api/admin/menu
 * Retrieves all menu items for admin management
 */
router.get('/menu', async (req, res) => {
  let items = [];
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!error && data && data.length > 0) {
        items = data;
      }
    } catch (e) {
      console.warn('Supabase admin menu read error:', e.message);
    }
  }

  const store = readLocalStore();
  const localOverrides = store.menu_items || [];

  // Merge local overrides onto items
  for (const lo of localOverrides) {
    const existing = items.find(i => i.id === lo.id || (lo.name && i.name && i.name.toLowerCase() === lo.name.toLowerCase()));
    if (existing) {
      if (lo.price !== undefined) existing.price = lo.price;
      if (lo.is_available !== undefined) existing.is_available = lo.is_available;
      if (lo.name !== undefined) existing.name = lo.name;
      if (lo.description !== undefined) existing.description = lo.description;
    } else {
      items.push(lo);
    }
  }

  return res.json({ success: true, data: items });
});

/**
 * PUT /api/admin/menu/:id
 * General update for menu item (price, availability, name, description)
 */
router.put('/menu/:id', async (req, res) => {
  const { id } = req.params;
  const { price, is_available, name, description, category } = req.body || {};

  const updates = {};
  if (price !== undefined && price !== null && price !== '') {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a valid non-negative number.' });
    }
    updates.price = numPrice;
  }
  if (is_available !== undefined) updates.is_available = Boolean(is_available);
  if (name && typeof name === 'string') updates.name = name.trim();
  if (description !== undefined) updates.description = String(description).trim();
  if (category) updates.category = String(category).trim();

  let updatedInSupabase = false;
  let supabaseRecord = null;
  if (supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query;
      if (isUUID) {
        query = supabase.from('menu_items').update(updates).eq('id', id).select();
      } else if (name) {
        query = supabase.from('menu_items').update(updates).eq('name', name).select();
      } else {
        query = supabase.from('menu_items').update(updates).eq('id', id).select();
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        updatedInSupabase = true;
        supabaseRecord = data[0];
      }
    } catch (e) {
      console.warn('Supabase menu item update fallback:', e.message);
    }
  }

  const store = readLocalStore();
  if (!store.menu_items) store.menu_items = [];
  const idx = store.menu_items.findIndex(item => item.id === id || (name && item.name?.toLowerCase() === name.toLowerCase()));
  if (idx >= 0) {
    store.menu_items[idx] = { ...store.menu_items[idx], ...updates, id };
  } else {
    store.menu_items.push({ id, ...updates });
  }
  writeLocalStore(store);

  await logAuditEvent({
    actionType: 'MENU_ITEM_UPDATED',
    actorId: req.adminUser,
    targetRecordType: 'menu_items',
    targetRecordId: id,
    details: { updates, updatedInSupabase }
  });

  return res.json({
    success: true,
    message: updatedInSupabase ? 'Menu item updated in database successfully.' : 'Menu item updated in server store.',
    updatedInSupabase,
    item: supabaseRecord || { id, ...updates }
  });
});

/**
 * PUT /api/admin/menu/:id/price
 * Update price for an existing menu item
 */
router.put('/menu/:id/price', async (req, res) => {
  const { id } = req.params;
  const { price, name } = req.body;

  if (price === undefined || price === null || price === '') {
    return res.status(400).json({ success: false, message: 'Price is required.' });
  }

  const numericPrice = Number(price);
  if (isNaN(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ success: false, message: 'Price must be a valid non-negative number.' });
  }

  let updatedInSupabase = false;
  let queryRes = null;
  if (supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUUID) {
        queryRes = await supabase.from('menu_items').update({ price: numericPrice }).eq('id', id).select();
      } else if (name) {
        queryRes = await supabase.from('menu_items').update({ price: numericPrice }).eq('name', name).select();
      } else {
        queryRes = await supabase.from('menu_items').update({ price: numericPrice }).eq('id', id).select();
      }

      if (!queryRes?.error && queryRes?.data && queryRes.data.length > 0) {
        updatedInSupabase = true;
      } else {
        const rpcRes = await supabase.rpc('admin_update_menu_price', {
          p_identifier: isUUID ? id : (name || id),
          p_price: numericPrice
        });
        if (!rpcRes?.error && rpcRes?.data?.success) {
          updatedInSupabase = true;
          queryRes = { data: [rpcRes.data.item] };
        }
      }
    } catch (e) {
      console.warn('Supabase menu price update fallback:', e.message);
    }
  }

  const store = readLocalStore();
  if (!store.menu_items) store.menu_items = [];
  const existingIdx = store.menu_items.findIndex(item => item.id === id || (name && item.name?.toLowerCase() === name.toLowerCase()));
  if (existingIdx >= 0) {
    store.menu_items[existingIdx].price = numericPrice;
    if (name) store.menu_items[existingIdx].name = name;
  } else {
    store.menu_items.push({ id, name: name || undefined, price: numericPrice });
  }
  writeLocalStore(store);

  await logAuditEvent({
    actionType: 'MENU_PRICE_UPDATED',
    actorId: req.adminUser,
    targetRecordType: 'menu_items',
    targetRecordId: id,
    details: { price: numericPrice, name, updatedInSupabase }
  });

  return res.json({
    success: true,
    id,
    name: name || undefined,
    price: numericPrice,
    updatedInSupabase,
    supabaseRecord: queryRes?.data?.[0] || null,
    message: updatedInSupabase
      ? `Menu item price updated to ₹${numericPrice} in Supabase and server store.`
      : `Menu item price updated to ₹${numericPrice} in server store.`
  });
});

router.post('/menu/price', async (req, res) => {
  const { id, price, name } = req.body;
  if (!id) return res.status(400).json({ success: false, message: 'Item id is required.' });

  if (price === undefined || price === null || price === '') {
    return res.status(400).json({ success: false, message: 'Price is required.' });
  }

  const numericPrice = Number(price);
  if (isNaN(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ success: false, message: 'Price must be a valid non-negative number.' });
  }

  let updatedInSupabase = false;
  let queryRes = null;
  if (supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUUID) {
        queryRes = await supabase.from('menu_items').update({ price: numericPrice }).eq('id', id).select();
      } else if (name) {
        queryRes = await supabase.from('menu_items').update({ price: numericPrice }).eq('name', name).select();
      } else {
        queryRes = await supabase.from('menu_items').update({ price: numericPrice }).eq('id', id).select();
      }

      if (!queryRes?.error && queryRes?.data && queryRes.data.length > 0) {
        updatedInSupabase = true;
      } else {
        const rpcRes = await supabase.rpc('admin_update_menu_price', {
          p_identifier: isUUID ? id : (name || id),
          p_price: numericPrice
        });
        if (!rpcRes?.error && rpcRes?.data?.success) {
          updatedInSupabase = true;
          queryRes = { data: [rpcRes.data.item] };
        }
      }
    } catch (e) {
      console.warn('Supabase menu price update fallback:', e.message);
    }
  }

  const store = readLocalStore();
  if (!store.menu_items) store.menu_items = [];
  const existingIdx = store.menu_items.findIndex(item => item.id === id || (name && item.name?.toLowerCase() === name.toLowerCase()));
  if (existingIdx >= 0) {
    store.menu_items[existingIdx].price = numericPrice;
    if (name) store.menu_items[existingIdx].name = name;
  } else {
    store.menu_items.push({ id, name: name || undefined, price: numericPrice });
  }
  writeLocalStore(store);

  await logAuditEvent({
    actionType: 'MENU_PRICE_UPDATED',
    actorId: req.adminUser,
    targetRecordType: 'menu_items',
    targetRecordId: id,
    details: { price: numericPrice, name, updatedInSupabase }
  });

  return res.json({
    success: true,
    id,
    name: name || undefined,
    price: numericPrice,
    updatedInSupabase,
    supabaseRecord: queryRes?.data?.[0] || null,
    message: updatedInSupabase
      ? `Menu item price updated to ₹${numericPrice} in Supabase and server store.`
      : `Menu item price updated to ₹${numericPrice} in server store.`
  });
});

/**
 * =========================================================================
 * TABLE RESERVATIONS (BOOKINGS) ADMIN ENDPOINTS
 * =========================================================================
 */

/**
 * GET /api/admin/bookings
 * Retrieves all table reservations for admin dashboard
 */
router.get('/bookings', async (req, res) => {
  let bookings = [];
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: false });
      if (!error && data) {
        bookings = data;
      }
    } catch (e) {
      console.warn('Supabase bookings query fallback:', e.message);
    }
  }

  const store = readLocalStore();
  const localBookings = store.bookings || [];

  for (const lb of localBookings) {
    if (!bookings.some(b => b.id === lb.id)) {
      bookings.push(lb);
    }
  }

  bookings.sort((a, b) => {
    const dateCompare = (b.booking_date || '').localeCompare(a.booking_date || '');
    if (dateCompare !== 0) return dateCompare;
    return (b.booking_time || '').localeCompare(a.booking_time || '');
  });

  return res.json({ success: true, data: bookings });
});

/**
 * PATCH /api/admin/bookings/:id/status
 * Updates reservation status (confirmed, pending, cancelled)
 */
router.patch('/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  const validStatuses = ['confirmed', 'cancelled', 'pending'];
  if (!status || !validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  const cleanStatus = status.toLowerCase();
  let updatedInSupabase = false;
  let updatedRecord = null;

  if (supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUUID) {
        const { data, error } = await supabase
          .from('bookings')
          .update({ status: cleanStatus })
          .eq('id', id)
          .select();
        if (!error && data && data.length > 0) {
          updatedInSupabase = true;
          updatedRecord = data[0];
        }
      }
    } catch (e) {
      console.warn('Supabase booking status update fallback:', e.message);
    }
  }

  const store = readLocalStore();
  if (!store.bookings) store.bookings = [];
  const idx = store.bookings.findIndex(b => b.id === id);
  if (idx >= 0) {
    store.bookings[idx].status = cleanStatus;
    store.bookings[idx].updated_at = new Date().toISOString();
    updatedRecord = updatedRecord || store.bookings[idx];
  } else if (!updatedRecord) {
    const newB = { id, status: cleanStatus, updated_at: new Date().toISOString() };
    store.bookings.unshift(newB);
    updatedRecord = newB;
  }
  writeLocalStore(store);

  await logAuditEvent({
    actionType: 'BOOKING_STATUS_UPDATED',
    actorId: req.adminUser,
    targetRecordType: 'bookings',
    targetRecordId: id,
    details: { status: cleanStatus, updatedInSupabase }
  });

  return res.json({
    success: true,
    message: `Booking status updated to ${cleanStatus}.`,
    data: updatedRecord,
    updatedInSupabase
  });
});

/**
 * DELETE /api/admin/bookings/:id
 * Admin deletes a table reservation
 */
router.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUUID) {
        await supabase.rpc('admin_delete_booking', {
          p_booking_id: id
        });
        await supabase.from('bookings').delete().eq('id', id);
      }
    } catch (e) {
      console.warn('Supabase booking delete fallback:', e.message);
    }
  }

  const store = readLocalStore();
  if (store.bookings) {
    store.bookings = store.bookings.filter(b => b.id !== id);
    writeLocalStore(store);
  }

  await logAuditEvent({
    actionType: 'BOOKING_DELETED',
    actorId: req.adminUser,
    targetRecordType: 'bookings',
    targetRecordId: id,
    details: { bookingId: id }
  });

  return res.json({ success: true, message: 'Table reservation deleted successfully.' });
});

export default router;

