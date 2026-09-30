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

const router = express.Router();

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
  const { businessDate, firstBillNumber, adminUser = 'Dasaris_Darbar', confirmOverride = false } = req.body;
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
      adminUser
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
    actorId: req.body.adminUser || 'Dasaris_Darbar',
    targetRecordType: 'loyalty_offers',
    targetRecordId: offerId,
    details: offerPayload
  });

  return res.json({ success: true, offer: offerPayload });
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

export default router;

