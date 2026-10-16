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
 * Retrieves all approved visit reward claims for customer in the active cycle
 * (i.e. since the most recent redeemed milestone reward)
 */
export async function getCycleApprovedVisitClaims(customerId) {
  let redemptions = [];
  let claims = [];

  if (supabase && process.env.NODE_ENV !== 'test') {
    try {
      const [redRes, clmRes] = await Promise.all([
        supabase.from('redemptions').select('*').eq('customer_id', customerId).eq('reward_type', 'milestone_reward').order('redeemed_at', { ascending: false }).limit(1),
        supabase.from('loyalty_claims').select('*').eq('customer_id', customerId).eq('status', 'approved').order('created_at', { ascending: false })
      ]);
      if (!redRes.error && redRes.data) redemptions = redRes.data;
      if (!clmRes.error && clmRes.data) claims = clmRes.data;
    } catch (e) {
      console.warn('Supabase getCycleApprovedVisitClaims fallback:', e.message);
    }
  }

  // Fallback / merge with local store
  const store = readLocalStore();
  if (redemptions.length === 0 && store.redemptions) {
    const localR = store.redemptions
      .filter(r => r.customer_id === customerId && r.reward_type === 'milestone_reward')
      .sort((a,b) => new Date(b.created_at || b.redeemed_at) - new Date(a.created_at || a.redeemed_at));
    if (localR.length > 0) redemptions = localR;
  }
  if (store.loyalty_claims) {
    const localC = store.loyalty_claims
      .filter(c => c.customer_id === customerId && c.status === 'approved')
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    for (const lc of localC) {
      if (!claims.some(c => c.id === lc.id || (c.bill_fingerprint && c.bill_fingerprint === lc.bill_fingerprint))) {
        claims.push(lc);
      }
    }
  }

  // Filter for visit rewards only (handling category naming variations)
  const visitClaims = claims.filter(c => {
    const cat = (c.reward_category || c.category || '').toUpperCase();
    return cat === 'VISIT_REWARD' || cat === 'VISIT REWARDS' || cat === 'VISIT';
  });

  const lastRedeemedAt = redemptions[0]?.created_at || redemptions[0]?.redeemed_at || null;
  if (!lastRedeemedAt) {
    return visitClaims;
  }

  const lastRedeemedTime = new Date(lastRedeemedAt).getTime();
  return visitClaims.filter(c => new Date(c.created_at || c.submittedAt).getTime() > lastRedeemedTime);
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
    milestone_unlocked: false,
    cycle_total_amount: 0
  };

  let rewards = [];
  let coupons = [];
  let recentBills = [];

  if (supabase && process.env.NODE_ENV !== 'test') {
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

      const cycleClaims = await getCycleApprovedVisitClaims(customerId);
      const cycleTotal = cycleClaims.reduce((sum, c) => sum + Number(c.bill_amount || c.originalAmount || 0), 0);
      progress.cycle_total_amount = cycleTotal;

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

  const cycleClaims = await getCycleApprovedVisitClaims(customerId);
  const cycleTotal = cycleClaims.reduce((sum, c) => sum + Number(c.bill_amount || c.originalAmount || 0), 0);
  progress.cycle_total_amount = cycleTotal;

  return { progress, rewards, coupons, recentBills };
}

/**
 * Checks if customer already claimed a bill in category today
 */
export async function checkDailyLimits(customerId, category, todayKolkata) {
  if (supabase && process.env.NODE_ENV !== 'test') {
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
    } catch (e) {
      console.warn('Daily limit check Supabase fallback:', e.message);
    }
  }

  // Fallback check against local store
  const store = readLocalStore();
  const claimsToday = (store.loyalty_claims || []).filter(c => 
    c.customer_id === customerId &&
    c.reward_category === category &&
    c.status === 'approved' &&
    c.created_at && (getKolkataDateString(c.created_at) === todayKolkata || c.created_at.startsWith(todayKolkata))
  );

  if (claimsToday.length > 0) {
    return { 
      allowed: false, 
      message: `Daily ${category === 'VISIT_REWARD' ? 'Visit' : 'Big Bill'} limit reached. Only 1 claim allowed per day.` 
    };
  }

  return { allowed: true };
}

// Queue-based Mutex map to prevent concurrent race conditions on daily limits / reward issuance
const customerLocks = new Map();

export async function withCustomerLock(customerId, fn) {
  const prevLock = customerLocks.get(customerId) || Promise.resolve();
  let releaseLock;
  const currentLock = new Promise(resolve => { releaseLock = resolve; });
  customerLocks.set(customerId, currentLock);

  await prevLock;
  try {
    return await fn();
  } finally {
    releaseLock();
    if (customerLocks.get(customerId) === currentLock) {
      customerLocks.delete(customerId);
    }
  }
}

/**
 * Retrieves active reward offers from pool, optionally filtered by track ('track1' | 'track2')
 */
export async function getActiveRewardOffers(track = null) {
  let offers = [];
  if (supabase && process.env.NODE_ENV !== 'test') {
    try {
      let query = supabase
        .from('loyalty_offers')
        .select('*')
        .eq('active', true);

      if (track) {
        query = query.eq('track', track);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        offers = data;
      }
    } catch (e) {
      // Fallback
    }
  }

  if (offers.length === 0) {
    const store = readLocalStore();
    offers = (store.loyalty_offers || []).filter(o => o.active !== false && !o.is_deleted);
    if (track) {
      offers = offers.filter(o => (o.track || 'track1') === track);
    }
  }

  // Ensure is_deleted filter
  return offers.filter(o => !o.is_deleted);
}

/**
 * Validates Track Allocation:
 * - Each active percentage must be numeric between 0 and 100
 * - Active offers in the track must total exactly 100%
 */
export async function validateTrackAllocation(track, providedOffers = null) {
  const activeOffers = providedOffers || await getActiveRewardOffers(track);
  const trackLabel = track === 'track1' ? 'Track 1 (Five-Visit Milestone)' : 'Track 2 (Big Bill)';

  if (activeOffers.length === 0) {
    return {
      isValid: false,
      totalPercentage: 0,
      activeCount: 0,
      error: `No active offers configured for ${trackLabel}.`
    };
  }

  let total = 0;
  for (const offer of activeOffers) {
    const pct = Number(offer.allocation_percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return {
        isValid: false,
        totalPercentage: total,
        activeCount: activeOffers.length,
        error: `Offer "${offer.title || offer.name}" in ${trackLabel} has invalid percentage: ${offer.allocation_percentage}. Must be between 0 and 100.`
      };
    }
    total += pct;
  }

  const roundedTotal = Math.round(total * 100) / 100;
  const isValid = Math.abs(roundedTotal - 100) < 0.001;

  return {
    isValid,
    totalPercentage: roundedTotal,
    activeCount: activeOffers.length,
    error: isValid ? null : `Total active allocation for ${trackLabel} is ${roundedTotal}%. Active offers must total exactly 100%.`
  };
}

/**
 * Performs weighted selection of an active offer for a given track based on saved admin percentages.
 * - Rejects 0% offers from being selected.
 * - Fails safely (returns null) if total percentage != 100% or no offers available.
 * - Strictly never mixes Track 1 and Track 2.
 */
export async function selectWeightedOffer(track) {
  const activeOffers = await getActiveRewardOffers(track);
  const validation = await validateTrackAllocation(track, activeOffers);
  if (!validation.isValid) {
    console.warn(`[LOYALTY] Cannot select reward for ${track}: ${validation.error}`);
    return null;
  }

  // Rule: 0% offers must never be selected
  const eligibleOffers = activeOffers.filter(o => Number(o.allocation_percentage) > 0);
  if (eligibleOffers.length === 0) {
    console.warn(`[LOYALTY] No eligible offers with allocation > 0% in ${track}.`);
    return null;
  }

  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const offer of eligibleOffers) {
    cumulative += Number(offer.allocation_percentage);
    if (rand < cumulative) {
      return { ...offer };
    }
  }

  return { ...eligibleOffers[eligibleOffers.length - 1] };
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
  return await withCustomerLock(customerId, async () => {
    const todayKolkata = getKolkataDateString();
    const amount = Number(validatedBill.billAmount);
    // Explicit Requirement: verified single bill of ₹1,999 or more qualifies for Big Bill track
    const isBigBill = amount >= 1999;
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

    // 2. Duplicate Bill / Fingerprint Protection
    const store = readLocalStore();
    const isDuplicate = (store.verified_bills || []).some(b => 
      (fingerprint && b.bill_fingerprint === fingerprint) ||
      (b.bill_number === String(validatedBill.billNumber) && b.bill_date === validatedBill.billDate)
    );

    if (isDuplicate) {
      await recordClaimAttempt({
        customerId,
        billNumber: validatedBill.billNumber,
        billDate: validatedBill.billDate,
        billAmount: amount,
        restaurantName: validatedBill.restaurant,
        fingerprint,
        status: 'rejected',
        statusReason: 'Duplicate bill detected. Receipt has already been claimed.',
        rewardCategory
      });

      return {
        success: false,
        message: 'This bill has already been used for a loyalty claim. Each physical receipt can only be claimed once.',
        category: rewardCategory
      };
    }

    // 3. Insert into verified_bills
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

    if (supabase && process.env.NODE_ENV !== 'test') {
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
    store.verified_bills.push(billRecord);

    // 3. Process according to Category
    let rewardGenerated = null;
    let couponGenerated = null;
    let currentStreak = 0;
    let newStreak = 0;
    let cycleTotalAmount = 0;

    if (isBigBill) {
      // Track 2: Big Bill Reward (≥ ₹1,999)
      // Does NOT increment normal 5-visit streak.
      // Admin-controlled weighted allocation:
      const selectedOffer = await selectWeightedOffer('track2');
      if (!selectedOffer) {
        return {
          success: false,
          message: 'Big Bill reward allocation configuration is currently invalid or incomplete (must total 100%). Please notify restaurant management.',
          category: rewardCategory
        };
      }

      const rewardType = selectedOffer.discount_type || selectedOffer.type || 'percentage_discount';
      const rewardName = selectedOffer.title || selectedOffer.name || 'Big Bill Reward';
      const discountPercent = selectedOffer.discount_percent !== null && selectedOffer.discount_percent !== undefined
        ? Number(selectedOffer.discount_percent)
        : null;
      const maxDiscount = selectedOffer.max_discount !== null && selectedOffer.max_discount !== undefined
        ? Number(selectedOffer.max_discount)
        : null;
      const expiryDays = Number(selectedOffer.expiry_days) || 30;

      couponGenerated = {
        id: crypto.randomUUID(),
        customer_id: customerId,
        source_bill_id: billRecord.id,
        source_offer_id: selectedOffer.id,
        coupon_code: generateVoucherCode('DD-BIG'),
        status: 'available',
        reward_type: rewardType,
        reward_name: rewardName,
        discount_percent: discountPercent,
        max_discount: maxDiscount,
        description: selectedOffer.description || `${rewardName} on your next dining visit. Show original physical bill at counter when redeeming.`,
        counter_verification_notice: 'Please show your original ₹1,999+ bill at the counter to redeem this offer.',
        issued_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      };

      if (supabase && process.env.NODE_ENV !== 'test') {
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
      // Track 1: Qualifying Visit Rule (< ₹1,999)
      // Increment qualifying visits count
      const userState = await getCustomerLoyaltyState(customerId);
      currentStreak = userState.progress.qualifying_visits_count || 0;
      const totalLifetime = (userState.progress.total_visits_lifetime || 0) + 1;
      newStreak = Math.min(5, currentStreak + 1);

      // Cumulative Total Calculation for Current Cycle (Asia/Kolkata cycle since last redeemed reward)
      const priorCycleClaims = await getCycleApprovedVisitClaims(customerId);
      const priorCycleTotal = priorCycleClaims.reduce((sum, c) => sum + Number(c.bill_amount || c.originalAmount || 0), 0);
      cycleTotalAmount = priorCycleTotal + Number(amount);

      // ELIGIBILITY RULE: Must have at least 5 valid, verified bills whose combined total is at least ₹2,000
      const isEligible = newStreak >= 5 && cycleTotalAmount >= 2000;

      let progressUpdate = {
        customer_id: customerId,
        qualifying_visits_count: newStreak,
        total_visits_lifetime: totalLifetime,
        last_visit_date: todayKolkata,
        milestone_unlocked: isEligible,
        updated_at: new Date().toISOString()
      };

      // If customer qualifies (>= 5 bills AND combined total >= ₹2,000) -> Generate reward using Track 1 weighted selection
      if (isEligible) {
        const selectedOffer = await selectWeightedOffer('track1');
        if (selectedOffer) {
          const rewardType = selectedOffer.discount_type || selectedOffer.type || 'percentage_discount';
          const rewardName = selectedOffer.title || selectedOffer.name || '15% OFF';
          const discountPercent = selectedOffer.discount_percent !== null && selectedOffer.discount_percent !== undefined
            ? Number(selectedOffer.discount_percent)
            : null;
          const maxDiscount = selectedOffer.max_discount !== null && selectedOffer.max_discount !== undefined
            ? Number(selectedOffer.max_discount)
            : null;
          const expiryDays = Number(selectedOffer.expiry_days) || 30;

          rewardGenerated = {
            id: crypto.randomUUID(),
            customer_id: customerId,
            original_offer_id: selectedOffer.id,
            reward_type: rewardType,
            reward_name: rewardName,
            reward_code: generateVoucherCode('DD-RW'),
            source_bill_id: billRecord.id,
            status: 'available',
            discount_percent: discountPercent,
            max_discount: maxDiscount,
            description: selectedOffer.description || `${rewardName} 5-Visit Milestone Special Reward`,
            issued_date: new Date().toISOString(),
            expiry_date: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          };

          if (supabase && process.env.NODE_ENV !== 'test') {
            try {
              const { data, error } = await supabase.from('customer_rewards').insert([rewardGenerated]).select();
              if (!error && data && data[0]) rewardGenerated = data[0];
            } catch (e) {
              console.warn('Supabase customer_rewards insert fallback:', e.message);
            }
          }
          store.customer_rewards.push(rewardGenerated);
        } else {
          console.warn('[LOYALTY] Track 1 configuration invalid; fail-safe: milestone reached without reward issuance until reconfigured.');
        }
      }

      // Persist loyalty progress in Supabase & local
      if (supabase && process.env.NODE_ENV !== 'test') {
        try {
          await supabase
            .from('loyalty_progress')
            .upsert(progressUpdate, { onConflict: 'customer_id' });
        } catch (e) {
          console.warn('Supabase loyalty_progress upsert fallback:', e.message);
        }
      }
      store.loyalty_progress[customerId] = {
        ...progressUpdate,
        cycle_total_amount: cycleTotalAmount
      };
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
  });

  // Ensure claimRecord is present in current in-memory store before persisting
  if (!store.loyalty_claims.some(c => c.id === claimRecord.id)) {
    store.loyalty_claims.push(claimRecord);
  }

  // Save local store
  writeLocalStore(store);

  // 5. Log audit trail
  const actionType = isBigBill
    ? 'BIG_BILL_COUPON_ISSUED'
    : (rewardGenerated ? 'MILESTONE_REWARD_ISSUED' : 'VISIT_RECORDED');

  await logAuditEvent({
    actionType,
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
      : (rewardGenerated
          ? `🎉 Congratulations! 5 valid visits totaling ₹${(typeof cycleTotalAmount === 'number' ? cycleTotalAmount : amount).toFixed(0)} recorded! Milestone Reward (${rewardGenerated.reward_name}) is now ready!`
          : (newStreak >= 5
              ? `Visit verified! (${newStreak}/5 visits completed, combined total: ₹${(typeof cycleTotalAmount === 'number' ? cycleTotalAmount : amount).toFixed(0)} / ₹2,000. Combined total must be at least ₹2,000 to unlock milestone reward.)`
              : `Visit verified! Loyalty progress updated to ${newStreak}/5 visits (combined total: ₹${(typeof cycleTotalAmount === 'number' ? cycleTotalAmount : amount).toFixed(0)} / ₹2,000).`)),
    category: rewardCategory,
    bill: billRecord,
    claim: claimRecord,
    newStreak,
    cycleTotalAmount: isBigBill ? 0 : (typeof cycleTotalAmount === 'number' ? cycleTotalAmount : amount),
    rewardGenerated,
    couponGenerated
  };
  });
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

  let savedClaim = claim;
  if (supabase && process.env.NODE_ENV !== 'test') {
    try {
      const { data, error } = await supabase.from('loyalty_claims').insert([claim]).select();
      if (!error && data && data[0]) savedClaim = data[0];
    } catch (e) {
      console.warn('Supabase loyalty_claims insert fallback:', e.message);
    }
  }

  const store = readLocalStore();
  store.loyalty_claims.push(savedClaim);
  writeLocalStore(store);
  return savedClaim;
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
  if (supabase && process.env.NODE_ENV !== 'test') {
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
    if (supabase && process.env.NODE_ENV !== 'test') {
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

  if (supabase && process.env.NODE_ENV !== 'test') {
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

  if (supabase && process.env.NODE_ENV !== 'test') {
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
    if (supabase && process.env.NODE_ENV !== 'test') {
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
      store.loyalty_progress[voucher.customer_id].cycle_total_amount = 0;
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
