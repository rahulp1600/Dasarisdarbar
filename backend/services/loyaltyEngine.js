/**
 * Dasari Darbar Backend Loyalty Engine
 * Implements:
 * - Qualifying Visit Rule (< ₹2000 -> Streak + 1 up to 5/5)
 * - Big Bill Rule (≥ ₹2000 -> Separate Big Bill Coupon)
 * - Asia/Kolkata Daily limits (1 visit reward / day, 1 big bill coupon / day)
 * - Random offer assignment from active pool upon 5/5 milestone
 * - Immutable snapshot persistence in customer_rewards
 * - Streak resets 5/5 -> 0/5 ONLY upon redemption
 * - Complete database persistence to Supabase with local fallback
 */

import crypto from 'crypto';
import { supabase, readLocalStore, writeLocalStore } from './supabaseClient.js';
import { logAuditEvent } from './auditLogger.js';

export function getKolkataDateString(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(date));
  } catch (e) {
    return new Date(date).toISOString().split('T')[0];
  }
}

export function generateVoucherCode(prefix = 'DD-RW') {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${randomNum}`;
}

/**
 * Retrieves customer's loyalty profile, progress, rewards, and coupons
 */
export async function getCustomerLoyaltyState(customerId) {
  let progress = {
    customer_id: customerId,
    qualifying_visits_count: 0,
    total_visits_lifetime: 0,
    last_visit_date: null,
    milestone_unlocked: false
  };

  let rewards = [];
  let coupons = [];
  let recentBills = [];

  if (supabase) {
    try {
      const [progRes, rewRes, coupRes, billsRes] = await Promise.all([
        supabase.from('loyalty_progress').select('*').eq('customer_id', customerId).single(),
        supabase.from('customer_rewards').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('big_bill_coupons').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('verified_bills').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(10)
      ]);

      if (!progRes.error && progRes.data) progress = progRes.data;
      if (!rewRes.error && rewRes.data) rewards = rewRes.data;
      if (!coupRes.error && coupRes.data) coupons = coupRes.data;
      if (!billsRes.error && billsRes.data) recentBills = billsRes.data;

      // If any tables returned schema error, merge from local store fallback
      const store = readLocalStore();
      if ((progRes.error || !progRes.data) && store.loyalty_progress[customerId]) {
        progress = store.loyalty_progress[customerId];
      }
      if (rewRes.error || rewards.length === 0) {
        const localR = store.customer_rewards.filter(r => r.customer_id === customerId);
        if (localR.length > 0) rewards = localR;
      }
      if (coupRes.error || coupons.length === 0) {
        const localC = store.big_bill_coupons.filter(c => c.customer_id === customerId);
        if (localC.length > 0) coupons = localC;
      }
      if (billsRes.error || recentBills.length === 0) {
        const localB = store.verified_bills.filter(b => b.customer_id === customerId).slice(-10).reverse();
        if (localB.length > 0) recentBills = localB;
      }

      return { progress, rewards, coupons, recentBills };
    } catch (e) {
      console.warn('Supabase getCustomerLoyaltyState fallback to local:', e.message);
    }
  }

  // Fallback to local store
  const store = readLocalStore();
  progress = store.loyalty_progress[customerId] || progress;
  rewards = store.customer_rewards.filter(r => r.customer_id === customerId);
  coupons = store.big_bill_coupons.filter(c => c.customer_id === customerId);
  recentBills = store.verified_bills.filter(b => b.customer_id === customerId).slice(-10).reverse();

  return { progress, rewards, coupons, recentBills };
}

/**
 * Checks if customer already claimed a bill in category today
 */
export async function checkDailyLimits(customerId, category, todayKolkata) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loyalty_claims')
        .select('id, reward_category, created_at')
        .eq('customer_id', customerId)
        .eq('reward_category', category)
        .eq('status', 'approved')
        .gte('created_at', `${todayKolkata}T00:00:00Z`);

      if (!error && data && data.length > 0) {
        return { allowed: false, message: `Daily ${category === 'VISIT_REWARD' ? 'Visit' : 'Big Bill'} Reward limit reached. Only 1 claim allowed per day.` };
      }
      return { allowed: true };
    } catch (e) {
      console.warn('Daily limit check Supabase fallback:', e.message);
    }
  }

  // Fallback check
  const store = readLocalStore();
  const claimsToday = store.loyalty_claims.filter(c => 
    c.customer_id === customerId &&
    c.reward_category === category &&
    c.status === 'approved' &&
    c.created_at && c.created_at.startsWith(todayKolkata)
  );

  if (claimsToday.length > 0) {
    return { 
      allowed: false, 
      message: `Daily ${category === 'VISIT_REWARD' ? 'Visit' : 'Big Bill'} Reward limit reached. Only 1 bill per day may be claimed for this category.` 
    };
  }

  return { allowed: true };
}

/**
 * Retrieves active reward offers from pool
 */
export async function getActiveRewardOffers() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loyalty_offers')
        .select('*')
        .eq('active', true);

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      // Fallback
    }
  }

  const store = readLocalStore();
  return store.loyalty_offers.filter(o => o.active);
}

/**
 * Processes a verified bill through loyalty rules
 */
export async function processVerifiedBillClaim({
  customerId,
  customerName = 'Customer',
  validatedBill,
  fingerprint,
  imageReference = null
}) {
  const todayKolkata = getKolkataDateString();
  const amount = Number(validatedBill.billAmount);
  const isBigBill = amount >= 2000;
  const rewardCategory = isBigBill ? 'BIG_BILL_REWARD' : 'VISIT_REWARD';

  // 1. Check daily limit
  const limitCheck = await checkDailyLimits(customerId, rewardCategory, todayKolkata);
  if (!limitCheck.allowed) {
    // Record rejected claim
    await recordClaimAttempt({
      customerId,
      billNumber: validatedBill.billNumber,
      billDate: validatedBill.billDate,
      billAmount: amount,
      restaurantName: validatedBill.restaurant,
      fingerprint,
      status: 'rejected',
      statusReason: limitCheck.message,
      rewardCategory
    });

    return {
      success: false,
      message: limitCheck.message,
      category: rewardCategory
    };
  }

  // 2. Insert into verified_bills
  let billRecord = {
    id: crypto.randomUUID(),
    customer_id: customerId,
    bill_number: String(validatedBill.billNumber),
    bill_date: validatedBill.billDate,
    bill_amount: amount,
    restaurant_name: validatedBill.restaurant,
    ocr_raw_text: validatedBill.rawText || '',
    ocr_confidence: validatedBill.confidence || 0.85,
    bill_image_reference: imageReference,
    bill_fingerprint: fingerprint,
    verification_status: 'verified',
    verification_reason: 'Automated OCR & sequence validation passed',
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('verified_bills')
        .insert([billRecord])
        .select();

      if (!error && data && data[0]) {
        billRecord = data[0];
      }
    } catch (e) {
      console.warn('Supabase verified_bills insert fallback:', e.message);
    }
  }

  // Save to local fallback store as well
  const store = readLocalStore();
  store.verified_bills.push(billRecord);

  // 3. Process according to Category
  let rewardGenerated = null;
  let couponGenerated = null;
  let currentStreak = 0;
  let newStreak = 0;

  if (isBigBill) {
    // ₹2000+ Big Bill Coupon Rule:
    // Does NOT increment normal 5-visit streak.
    couponGenerated = {
      id: crypto.randomUUID(),
      customer_id: customerId,
      source_bill_id: billRecord.id,
      coupon_code: generateVoucherCode('DD-BIG'),
      status: 'available',
      discount_percent: 10.0,
      max_discount: 300.0,
      description: '10% instant discount on your next family dining visit (Max ₹300). Show original physical bill at counter when redeeming.',
      counter_verification_notice: 'Please show your original ₹2,000+ bill at the counter to redeem this offer.',
      issued_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('big_bill_coupons').insert([couponGenerated]).select();
        if (!error && data && data[0]) couponGenerated = data[0];
      } catch (e) {
        console.warn('Supabase big_bill_coupons insert fallback:', e.message);
      }
    }
    store.big_bill_coupons.push(couponGenerated);

    // Fetch existing streak without incrementing
    const userState = await getCustomerLoyaltyState(customerId);
    currentStreak = userState.progress.qualifying_visits_count || 0;
    newStreak = currentStreak;

  } else {
    // Qualifying Visit Rule (< ₹2000):
    // Increment qualifying visits count
    const userState = await getCustomerLoyaltyState(customerId);
    currentStreak = userState.progress.qualifying_visits_count || 0;
    const totalLifetime = (userState.progress.total_visits_lifetime || 0) + 1;
    newStreak = Math.min(5, currentStreak + 1);

    let progressUpdate = {
      customer_id: customerId,
      qualifying_visits_count: newStreak,
      total_visits_lifetime: totalLifetime,
      last_visit_date: todayKolkata,
      milestone_unlocked: newStreak === 5,
      updated_at: new Date().toISOString()
    };

    // If milestone 5/5 reached -> Generate random reward from active pool
    if (newStreak === 5) {
      const activeOffers = await getActiveRewardOffers();
      const selectedOffer = activeOffers.length > 0 
        ? activeOffers[Math.floor(Math.random() * activeOffers.length)]
        : {
            title: '15% OFF',
            discount_type: 'percentage_discount',
            discount_percent: 15,
            max_discount: 400,
            description: '15% instant discount on dining bill (Max ₹400).'
          };

      rewardGenerated = {
        id: crypto.randomUUID(),
        customer_id: customerId,
        reward_type: selectedOffer.discount_type || 'percentage_discount',
        reward_name: selectedOffer.title || selectedOffer.name || '15% OFF',
        reward_code: generateVoucherCode('DD-RW'),
        source_bill_id: billRecord.id,
        status: 'available',
        discount_percent: selectedOffer.discount_percent || 15,
        max_discount: selectedOffer.max_discount || 400,
        description: selectedOffer.description || '5-Visit Milestone Special Reward',
        issued_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      };

      if (supabase) {
        try {
          const { data, error } = await supabase.from('customer_rewards').insert([rewardGenerated]).select();
          if (!error && data && data[0]) rewardGenerated = data[0];
        } catch (e) {
          console.warn('Supabase customer_rewards insert fallback:', e.message);
        }
      }
      store.customer_rewards.push(rewardGenerated);
    }

    // Persist loyalty progress in Supabase & local
    if (supabase) {
      try {
        await supabase
          .from('loyalty_progress')
          .upsert(progressUpdate, { onConflict: 'customer_id' });
      } catch (e) {
        console.warn('Supabase loyalty_progress upsert fallback:', e.message);
      }
    }
    store.loyalty_progress[customerId] = progressUpdate;
  }

  // 4. Record successful claim
  const claimRecord = await recordClaimAttempt({
    customerId,
    billNumber: validatedBill.billNumber,
    billDate: validatedBill.billDate,
    billAmount: amount,
    restaurantName: validatedBill.restaurant,
    fingerprint,
    status: 'approved',
    statusReason: 'Bill verified successfully',
    rewardCategory,
    rewardId: rewardGenerated ? rewardGenerated.id : (couponGenerated ? couponGenerated.id : null)
  });

  // Save local store
  writeLocalStore(store);

  // 5. Log audit trail
  await logAuditEvent({
    actionType: isBigBill ? 'BIG_BILL_COUPON_ISSUED' : (newStreak === 5 ? 'MILESTONE_REWARD_ISSUED' : 'VISIT_RECORDED'),
    actorId: customerId,
    targetRecordType: isBigBill ? 'big_bill_coupons' : 'verified_bills',
    targetRecordId: isBigBill ? (couponGenerated?.id || '') : billRecord.id,
    details: {
      billNumber: validatedBill.billNumber,
      amount,
      newStreak,
      rewardGenerated: rewardGenerated?.reward_name,
      couponCode: couponGenerated?.coupon_code
    }
  });

  return {
    success: true,
    message: isBigBill
      ? `₹${amount} bill verified! 10% Big Bill Discount Coupon (${couponGenerated.coupon_code}) unlocked!`
      : (newStreak === 5
          ? `Congratulations! 5th qualifying visit recorded! Milestone Reward (${rewardGenerated.reward_name}) is now ready!`
          : `Visit verified! Loyalty progress updated to ${newStreak}/5 visits.`),
    category: rewardCategory,
    bill: billRecord,
    claim: claimRecord,
    newStreak,
    rewardGenerated,
    couponGenerated
  };
}

/**
 * Records claim attempts (audit of scans)
 */
async function recordClaimAttempt({
  customerId,
  billNumber,
  billDate,
  billAmount,
  restaurantName,
  fingerprint,
  status,
  statusReason,
  rewardCategory,
  rewardId = null
}) {
  const claim = {
    id: crypto.randomUUID(),
    customer_id: customerId,
    bill_number: billNumber ? String(billNumber) : null,
    bill_date: billDate,
    bill_amount: billAmount,
    restaurant_name: restaurantName,
    bill_fingerprint: fingerprint,
    status,
    status_reason: statusReason,
    reward_category: rewardCategory,
    reward_id: rewardId,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('loyalty_claims').insert([claim]).select();
      if (!error && data && data[0]) return data[0];
    } catch (e) {
      console.warn('Supabase loyalty_claims insert fallback:', e.message);
    }
  }

  const store = readLocalStore();
  store.loyalty_claims.push(claim);
  writeLocalStore(store);
  return claim;
}

/**
 * Redeems a customer voucher (milestone reward or big bill coupon)
 * Enforces:
 * 1. Checks voucher existence & status === 'available'
 * 2. Checks expiration
 * 3. Prevents double redemption
 * 4. Resets streak 5/5 -> 0/5 ONLY on successful redemption of milestone reward
 * 5. Logs audit event
 */
export async function redeemVoucher({ voucherCode, staffIdentifier = 'Staff Counter' }) {
  const cleanCode = String(voucherCode || '').trim().toUpperCase();

  if (!cleanCode) {
    return { success: false, message: 'Please provide a valid voucher code.' };
  }

  const store = readLocalStore();
  let voucher = null;
  let voucherType = null; // 'milestone_reward' or 'big_bill_coupon'

  // 1. Search customer_rewards
  if (supabase) {
    try {
      const { data: rewData } = await supabase
        .from('customer_rewards')
        .select('*')
        .eq('reward_code', cleanCode)
        .limit(1);

      if (rewData && rewData.length > 0) {
        voucher = rewData[0];
        voucherType = 'milestone_reward';
      }
    } catch (e) {
      console.warn('Supabase redeem query fallback:', e.message);
    }
  }

  if (!voucher) {
    const localRew = store.customer_rewards.find(r => r.reward_code === cleanCode);
    if (localRew) {
      voucher = localRew;
      voucherType = 'milestone_reward';
    }
  }

  // 2. Search big_bill_coupons if not found in customer_rewards
  if (!voucher) {
    if (supabase) {
      try {
        const { data: coupData } = await supabase
          .from('big_bill_coupons')
          .select('*')
          .eq('coupon_code', cleanCode)
          .limit(1);

        if (coupData && coupData.length > 0) {
          voucher = coupData[0];
          voucherType = 'big_bill_coupon';
        }
      } catch (e) {
        console.warn('Supabase coupon redeem query fallback:', e.message);
      }
    }

    if (!voucher) {
      const localCoup = store.big_bill_coupons.find(c => c.coupon_code === cleanCode);
      if (localCoup) {
        voucher = localCoup;
        voucherType = 'big_bill_coupon';
      }
    }
  }

  if (!voucher) {
    return { success: false, message: `Voucher code '${cleanCode}' not found.` };
  }

  // 3. Validation checks
  if (voucher.status === 'redeemed') {
    return {
      success: false,
      message: `Voucher '${cleanCode}' has already been redeemed on ${new Date(voucher.redeemed_date || voucher.created_at).toLocaleDateString()}.`
    };
  }

  if (voucher.status === 'expired') {
    return { success: false, message: `Voucher '${cleanCode}' has expired and cannot be redeemed.` };
  }

  if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
    return { success: false, message: `Voucher '${cleanCode}' expired on ${new Date(voucher.expiry_date).toLocaleDateString()}.` };
  }

  // 4. Perform redemption
  const nowIso = new Date().toISOString();
  voucher.status = 'redeemed';
  voucher.redeemed_date = nowIso;

  if (supabase) {
    try {
      const targetTable = voucherType === 'milestone_reward' ? 'customer_rewards' : 'big_bill_coupons';
      await supabase
        .from(targetTable)
        .update({ status: 'redeemed', redeemed_date: nowIso })
        .eq('id', voucher.id);
    } catch (e) {
      console.warn('Supabase voucher status update fallback:', e.message);
    }
  }

  // Record in redemptions table
  const redemptionRecord = {
    id: crypto.randomUUID(),
    customer_id: voucher.customer_id,
    reward_id: voucher.id,
    reward_type: voucherType,
    voucher_code: cleanCode,
    staff_identifier: staffIdentifier,
    redeemed_at: nowIso,
    staff_verified: true
  };

  if (supabase) {
    try {
      await supabase.from('redemptions').insert([redemptionRecord]);
    } catch (e) {
      console.warn('Supabase redemptions insert fallback:', e.message);
    }
  }
  store.redemptions.push(redemptionRecord);

  // 5. Critical Rule: If this was a milestone reward, reset customer streak 5/5 -> 0/5
  let streakReset = false;
  if (voucherType === 'milestone_reward') {
    if (supabase) {
      try {
        await supabase
          .from('loyalty_progress')
          .update({ qualifying_visits_count: 0, milestone_unlocked: false, updated_at: nowIso })
          .eq('customer_id', voucher.customer_id);
        streakReset = true;
      } catch (e) {
        console.warn('Supabase streak reset fallback:', e.message);
      }
    }

    if (store.loyalty_progress[voucher.customer_id]) {
      store.loyalty_progress[voucher.customer_id].qualifying_visits_count = 0;
      store.loyalty_progress[voucher.customer_id].milestone_unlocked = false;
      store.loyalty_progress[voucher.customer_id].updated_at = nowIso;
      streakReset = true;
    }
  }

  writeLocalStore(store);

  // 6. Log audit event
  await logAuditEvent({
    actionType: 'VOUCHER_REDEEMED',
    actorId: staffIdentifier,
    targetRecordType: voucherType,
    targetRecordId: voucher.id,
    details: {
      voucherCode: cleanCode,
      rewardName: voucher.reward_name || '10% Big Bill Discount',
      customerId: voucher.customer_id,
      streakReset
    }
  });

  return {
    success: true,
    message: `Voucher '${cleanCode}' successfully redeemed for ${voucher.reward_name || 'Discount'}.`,
    voucher,
    streakReset
  };
}
