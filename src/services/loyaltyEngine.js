// ============================================================================
// DASARI DARBAR LOYALTY SYSTEM - CORE ENGINE
// Strict loyalty business logic enforcing:
// 1. Visit Rewards (< ₹2,000) vs Big Bill Rewards (≥ ₹2,000) - No "Track 1/2" in UI
// 2. Active Reward Pool with equal-probability random selection at 5/5
// 3. Immutable snapshot persistence of customer rewards
// 4. Streak resets 5/5 -> 0/5 ONLY on successful redemption, never on generation
// 5. Asia/Kolkata daily claim enforcement & duplicate fingerprinting
// ============================================================================

/**
 * Returns YYYY-MM-DD string in Asia/Kolkata timezone
 */
export function getKolkataDateString(date = new Date()) {
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch (e) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
}

/**
 * Generates unique tamper-proof bill fingerprint
 */
export function generateBillFingerprint(restaurant, billNumber, billDate, totalAmount) {
  const normRest = (restaurant || 'DASARI_DARBAR').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normBill = String(billNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normDate = String(billDate || getKolkataDateString()).trim();
  const normAmount = Number(totalAmount || 0).toFixed(2);
  return `${normRest}|${normBill}|${normDate}|${normAmount}`;
}

/**
 * Generates unique human-friendly voucher codes
 */
export function generateVoucherCode(prefix = 'DD-RW') {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${randomNum}`;
}

/**
 * Initial Default Active Reward Pool (Admin Configurable)
 */
export const INITIAL_REWARD_OFFERS = [
  {
    id: 'offer_10_pct',
    name: '10% OFF',
    type: 'percentage_discount',
    discount_percent: 10,
    max_discount: 300,
    description: '10% instant discount on your entire dining bill (Max ₹300).',
    is_active: true,
    expiry_days: 30,
    created_at: new Date().toISOString()
  },
  {
    id: 'offer_15_pct',
    name: '15% OFF',
    type: 'percentage_discount',
    discount_percent: 15,
    max_discount: 400,
    description: '15% instant discount on your family dining bill (Max ₹400).',
    is_active: true,
    expiry_days: 30,
    created_at: new Date().toISOString()
  },
  {
    id: 'offer_free_dessert',
    name: 'FREE DESSERT',
    type: 'free_item',
    discount_percent: null,
    max_discount: null,
    description: 'Complimentary Double Ka Meetha or Apricot Delight with your meal.',
    is_active: true,
    expiry_days: 30,
    created_at: new Date().toISOString()
  },
  {
    id: 'offer_free_cooldrink',
    name: 'FREE COOL DRINK',
    type: 'free_item',
    discount_percent: null,
    max_discount: null,
    description: 'Complimentary chilled Goli Soda or refreshing beverage.',
    is_active: true,
    expiry_days: 30,
    created_at: new Date().toISOString()
  }
];

export const DEFAULT_BIG_BILL_CONFIG = {
  discount_percent: 10,
  max_discount: 300,
  expiry_days: 14
};

// Safe LocalStorage Adapter
class LocalStorageAdapter {
  get(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }
}

export class LoyaltyEngine {
  constructor(storageAdapter = new LocalStorageAdapter()) {
    this.storage = storageAdapter;
  }

  // =========================================================================
  // ADMIN REWARD POOL (OFFERS)
  // =========================================================================
  getOffers() {
    return this.storage.get('dd_loyalty_offers', INITIAL_REWARD_OFFERS);
  }

  saveOffers(offers) {
    this.storage.set('dd_loyalty_offers', offers);
    return offers;
  }

  addOffer({ name, type, discount_percent, max_discount, description, expiry_days = 30 }) {
    const offers = this.getOffers();
    const newOffer = {
      id: 'offer_' + Date.now(),
      name: name.trim(),
      type: type || 'percentage_discount',
      discount_percent: discount_percent ? Number(discount_percent) : null,
      max_discount: max_discount ? Number(max_discount) : null,
      description: description ? description.trim() : `${name} special reward`,
      is_active: true,
      expiry_days: Number(expiry_days) || 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    offers.push(newOffer);
    this.saveOffers(offers);
    return newOffer;
  }

  updateOffer(id, updates) {
    const offers = this.getOffers().map(o => {
      if (o.id === id) {
        return { ...o, ...updates, updated_at: new Date().toISOString() };
      }
      return o;
    });
    this.saveOffers(offers);
    return offers;
  }

  toggleOfferActive(id) {
    const offers = this.getOffers().map(o => {
      if (o.id === id) {
        return { ...o, is_active: !o.is_active, updated_at: new Date().toISOString() };
      }
      return o;
    });
    this.saveOffers(offers);
    return offers;
  }

  deleteOffer(id) {
    const offers = this.getOffers().filter(o => o.id !== id);
    this.saveOffers(offers);
    return offers;
  }

  // =========================================================================
  // RANDOM SELECTION LOGIC & SNAPSHOT PERSISTENCE
  // =========================================================================
  /**
   * Randomly selects one currently ACTIVE offer from the pool with equal probability.
   * Creates an immutable snapshot so historical rewards NEVER change when Admin edits offers.
   */
  assignRandomMilestoneReward(customer) {
    const offers = this.getOffers();
    const activeOffers = offers.filter(o => o.is_active);

    // Rule 8: If no active offers exist, create PENDING_REWARD
    if (activeOffers.length === 0) {
      const pendingReward = {
        id: generateVoucherCode('DD-RW'),
        code: generateVoucherCode('DD-RW'),
        isPendingConfig: true,
        rewardName: 'Pending Admin Configuration',
        rewardType: 'pending_admin',
        rewardDescription: 'Your visit milestone has been reached. Your reward is pending admin configuration.',
        customerId: customer.id,
        customerName: customer.name || 'Valued Customer',
        assignedAt: new Date().toISOString(),
        status: 'PENDING_CONFIG'
      };
      const rewards = this.getRewards();
      rewards.unshift(pendingReward);
      this.saveRewards(rewards);
      return pendingReward;
    }

    // Rule 9: Random selection from active offer pool (equal probability)
    const randomIndex = Math.floor(Math.random() * activeOffers.length);
    const selectedOffer = activeOffers[randomIndex];

    // Calculate expiry date
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (selectedOffer.expiry_days || 30));
    const expiryDateStr = expiry.toISOString().split('T')[0];

    // Rule 6 & 32: Immutable Snapshot
    const snapshotReward = {
      id: generateVoucherCode('DD-RW'),
      code: generateVoucherCode('DD-RW'),
      offerId: selectedOffer.id,
      rewardName: selectedOffer.name,
      rewardType: selectedOffer.type,
      rewardValue: selectedOffer.discount_percent || null,
      maxDiscount: selectedOffer.max_discount || null,
      rewardDescription: selectedOffer.description,
      customerId: customer.id,
      customerName: customer.name || 'Valued Customer',
      assignedAt: new Date().toISOString(),
      expiryDate: expiryDateStr,
      status: 'ACTIVE' // 'ACTIVE' | 'REDEEMED' | 'EXPIRED'
    };

    const rewards = this.getRewards();
    rewards.unshift(snapshotReward);
    this.saveRewards(rewards);

    return snapshotReward;
  }

  // =========================================================================
  // BIG BILL REWARD CONFIGURATION & COUPON GENERATION
  // =========================================================================
  getBigBillConfig() {
    return this.storage.get('dd_big_bill_config', DEFAULT_BIG_BILL_CONFIG);
  }

  saveBigBillConfig(cfg) {
    const merged = { ...DEFAULT_BIG_BILL_CONFIG, ...cfg };
    this.storage.set('dd_big_bill_config', merged);
    return merged;
  }

  getConfig() {
    const bigBill = this.getBigBillConfig();
    return {
      track1Threshold: 2000,
      track1RequiredVisits: 5,
      track2Threshold: 2000,
      track2DiscountPercent: bigBill.discount_percent || 10,
      track2MaxDiscount: bigBill.max_discount || 300,
      timezone: 'Asia/Kolkata'
    };
  }

  saveConfig(cfg) {
    if (!cfg) return this.getConfig();
    if (cfg.track2DiscountPercent !== undefined || cfg.track2MaxDiscount !== undefined) {
      this.saveBigBillConfig({
        discount_percent: Number(cfg.track2DiscountPercent) || 10,
        max_discount: Number(cfg.track2MaxDiscount) || 300
      });
    }
    return this.getConfig();
  }

  generateBigBillCoupon(customer, billData = {}) {
    const cfg = this.getBigBillConfig();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (cfg.expiry_days || 14));

    const coupon = {
      id: generateVoucherCode('DD-BB'),
      code: generateVoucherCode('DD-BB'),
      customerId: customer.id,
      customerName: customer.name || 'Valued Customer',
      billNumber: billData.billNumber || null,
      billAmount: billData.originalAmount || null,
      discountPercent: cfg.discount_percent,
      maxDiscount: cfg.max_discount,
      description: `${cfg.discount_percent}% instant discount on family dining (Max ₹${cfg.max_discount}).`,
      issuedDate: getKolkataDateString(),
      assignedAt: new Date().toISOString(),
      expiryDate: expiry.toISOString().split('T')[0],
      status: 'ACTIVE' // 'ACTIVE' | 'REDEEMED' | 'EXPIRED'
    };

    const coupons = this.getCoupons();
    coupons.unshift(coupon);
    this.saveCoupons(coupons);

    return coupon;
  }

  // =========================================================================
  // CUSTOMER ACCOUNTS
  // =========================================================================
  getCustomerAccount(customerId) {
    if (!customerId) return null;
    const accounts = this.storage.get('dd_loyalty_accounts', {});
    if (!accounts[customerId]) {
      accounts[customerId] = {
        id: customerId,
        name: 'Loyal Diner',
        phone: '',
        email: '',
        track1Streak: 0, // 0/5 qualifying visits
        createdAt: new Date().toISOString()
      };
      this.storage.set('dd_loyalty_accounts', accounts);
    }
    return accounts[customerId];
  }

  saveCustomerAccount(customer) {
    const accounts = this.storage.get('dd_loyalty_accounts', {});
    accounts[customer.id] = customer;
    this.storage.set('dd_loyalty_accounts', accounts);
    return customer;
  }

  getAllCustomers() {
    const accounts = this.storage.get('dd_loyalty_accounts', {});
    return Object.values(accounts);
  }

  // =========================================================================
  // CLAIMS, REWARDS & COUPONS DATA
  // =========================================================================
  getClaims() {
    return this.storage.get('dd_loyalty_claims', []);
  }

  saveClaims(claims) {
    this.storage.set('dd_loyalty_claims', claims);
    return claims;
  }

  getRewards() {
    return this.storage.get('dd_loyalty_rewards', []);
  }

  saveRewards(rewards) {
    this.storage.set('dd_loyalty_rewards', rewards);
    return rewards;
  }

  getCoupons() {
    return this.storage.get('dd_loyalty_coupons', []);
  }

  saveCoupons(coupons) {
    this.storage.set('dd_loyalty_coupons', coupons);
    return coupons;
  }

  // =========================================================================
  // BILL CLAIM PROCESSING PIPELINE
  // =========================================================================
  processBillClaim({ customerId, billData, imagePreview = null }) {
    const customer = this.getCustomerAccount(customerId);
    if (!customer) {
      return { success: false, message: 'Please sign in to claim loyalty visits.' };
    }

    const todayKolkata = getKolkataDateString();
    const claims = this.getClaims();

    // 1. Invalid Image or Unrelated Restaurant Check (Rules 19 & 20)
    if (!billData || billData.isValidImage === false || billData.isDasariDarbar === false) {
      return {
        success: false,
        status: 'rejected',
        message: "We couldn't verify this as a Dasari Darbar bill."
      };
    }

    const billNumber = billData?.billNumber || null;
    const billDate = billData?.billDate || null;
    const amount = (billData?.originalAmount !== undefined && billData?.originalAmount !== null)
      ? Number(billData.originalAmount)
      : ((billData?.grandTotal !== undefined && billData?.grandTotal !== null) ? Number(billData.grandTotal) : null);

    // 2. Strict Non-Inventing Check (Rules 1, 17, 18):
    // If OCR could not find billNumber, billDate, or grandTotal -> PENDING_REVIEW
    if (billData.needsReview || !billNumber || !billDate || amount === null || isNaN(amount)) {
      const pendingClaim = {
        id: 'clm_' + Date.now(),
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        restaurant: billData?.restaurant || "Dasari's Darbar (Uncertain)",
        billNumber: billNumber,          // NEVER INVENT: remains null if missing
        billDate: billDate,              // NEVER INVENT: remains null if missing
        originalAmount: amount,          // NEVER INVENT: remains null if missing
        claimKolkataDate: todayKolkata,
        status: 'pending_review',
        reviewReason: billData?.reviewReason || 'Required bill fields could not be verified by OCR.',
        rawOcrText: billData?.rawText || '',
        ocrConfidence: billData?.confidence || 0,
        imagePreview: imagePreview,
        submittedAt: new Date().toISOString()
      };

      claims.unshift(pendingClaim);
      this.saveClaims(claims);

      return {
        success: false,
        status: 'pending_review',
        message: 'Your bill was submitted for owner review. Our team will verify and stamp your account shortly.',
        claim: pendingClaim
      };
    }

    // 3. Duplicate Bill Protection (Rule 22)
    const fingerprint = generateBillFingerprint(
      billData.restaurant,
      billNumber,
      billDate,
      amount
    );

    const isDuplicate = claims.some(c => 
      c.status === 'approved' &&
      generateBillFingerprint(c.restaurant, c.billNumber, c.billDate, c.originalAmount) === fingerprint
    );

    if (isDuplicate) {
      return {
        success: false,
        status: 'rejected',
        message: 'This bill has already been used for a loyalty claim. Each physical receipt can only be claimed once.'
      };
    }

    // 4. Category Determination by ORIGINAL GRAND TOTAL (Rule 23 & 24)
    // < ₹2,000 is Visit Reward; ≥ ₹2,000 is Big Bill Reward
    const isVisitReward = amount < 2000;
    const category = isVisitReward ? 'VISIT REWARDS' : 'BIG BILL REWARDS';

    // 5. Same-Day Daily Limits (Rule 11)
    // Customer may receive 1 Visit Reward AND 1 Big Bill Reward per calendar day from 2 DIFFERENT bills.
    const approvedToday = claims.filter(c => 
      c.customerId === customer.id && 
      c.claimKolkataDate === todayKolkata && 
      c.status === 'approved'
    );

    if (isVisitReward) {
      const alreadyHadVisitClaimToday = approvedToday.some(c => Number(c.originalAmount) < 2000);
      if (alreadyHadVisitClaimToday) {
        return {
          success: false,
          status: 'rejected',
          message: 'Daily Visit Reward limit reached: Maximum 1 Visit Reward claim allowed per customer per calendar day.'
        };
      }
    } else {
      const alreadyHadBigBillClaimToday = approvedToday.some(c => Number(c.originalAmount) >= 2000);
      if (alreadyHadBigBillClaimToday) {
        return {
          success: false,
          status: 'rejected',
          message: 'Daily Big Bill limit reached: Maximum 1 Big Bill Reward claim allowed per customer per calendar day.'
        };
      }
    }

    // 6. Approve Claim & Apply Benefit
    let rewardUnlocked = null;
    let couponGenerated = null;

    if (isVisitReward) {
      // Increment Visit Streak (0/5 -> 5/5)
      const currentStreak = Number(customer.track1Streak || 0);
      const newStreak = Math.min(5, currentStreak + 1);
      customer.track1Streak = newStreak;
      this.saveCustomerAccount(customer);

      // If customer reaches 5/5 -> Trigger Random Reward Assignment
      if (newStreak === 5) {
        rewardUnlocked = this.assignRandomMilestoneReward(customer);
      }
    } else {
      // Big Bill Reward -> Generates 10% coupon without altering Visit streak
      couponGenerated = this.generateBigBillCoupon(customer, {
        billNumber,
        originalAmount: amount
      });
    }

    // Record Approved Claim
    const approvedClaim = {
      id: 'clm_' + Date.now(),
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      restaurant: billData.restaurant || "Dasari's Darbar",
      billNumber: billNumber,
      billDate: billDate,
      originalAmount: amount,
      claimKolkataDate: todayKolkata,
      category: category,
      status: 'approved',
      rewardId: rewardUnlocked ? rewardUnlocked.id : null,
      couponId: couponGenerated ? couponGenerated.id : null,
      fingerprint: fingerprint,
      rawOcrText: billData.rawText || '',
      ocrConfidence: billData.confidence || 1.0,
      imagePreview: imagePreview,
      submittedAt: new Date().toISOString()
    };

    claims.unshift(approvedClaim);
    this.saveClaims(claims);

    return {
      success: true,
      status: 'approved',
      message: isVisitReward
        ? (customer.track1Streak === 5 
            ? '🎉 5th Qualifying Visit Completed! Your random reward is unlocked!' 
            : `Visit verified! Streak progress: ${customer.track1Streak}/5 visits.`)
        : `Big Bill verified! You unlocked a ${couponGenerated.discountPercent}% instant discount coupon!`,
      claim: approvedClaim,
      rewardUnlocked,
      couponGenerated,
      customer,
      newStreak: customer.track1Streak
    };
  }

  // =========================================================================
  // ADMIN REVIEW QUEUE ACTIONS (Rule 26)
  // =========================================================================
  approvePendingClaim(claimId, overrides = {}) {
    const claims = this.getClaims();
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return { success: false, message: 'Claim not found.' };

    const customer = this.getCustomerAccount(claim.customerId);
    const amount = overrides.originalAmount ? Number(overrides.originalAmount) : claim.originalAmount;
    const billNumber = overrides.billNumber || claim.billNumber;

    if (!amount) {
      return { success: false, message: 'Cannot approve claim without a valid original grand total.' };
    }

    claim.originalAmount = amount;
    claim.billNumber = billNumber;
    claim.status = 'approved';
    claim.approvedAt = new Date().toISOString();

    const isVisit = amount < 2000;
    claim.category = isVisit ? 'VISIT REWARDS' : 'BIG BILL REWARDS';

    let rewardUnlocked = null;
    let couponGenerated = null;

    if (isVisit) {
      const currentStreak = Number(customer.track1Streak || 0);
      const newStreak = Math.min(5, currentStreak + 1);
      customer.track1Streak = newStreak;
      this.saveCustomerAccount(customer);

      if (newStreak === 5) {
        rewardUnlocked = this.assignRandomMilestoneReward(customer);
        claim.rewardId = rewardUnlocked.id;
      }
    } else {
      couponGenerated = this.generateBigBillCoupon(customer, { billNumber, originalAmount: amount });
      claim.couponId = couponGenerated.id;
    }

    this.saveClaims(claims);
    return { success: true, message: 'Claim approved successfully.', claim, rewardUnlocked, couponGenerated };
  }

  rejectPendingClaim(claimId, reason = 'Not a verified Dasari Darbar receipt') {
    const claims = this.getClaims();
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return { success: false, message: 'Claim not found.' };

    claim.status = 'rejected';
    claim.rejectionReason = reason;
    claim.rejectedAt = new Date().toISOString();

    this.saveClaims(claims);
    return { success: true, message: 'Claim rejected.', claim };
  }

  // =========================================================================
  // REWARD & COUPON REDEMPTION (Rule 29)
  // Streak resets 5/5 -> 0/5 ONLY on successful redemption!
  // =========================================================================
  redeemVoucher(code, staffNotes = '') {
    if (!code) return { success: false, message: 'Please enter a valid voucher or coupon code.' };
    const cleanCode = code.trim().toUpperCase();

    // Check in Visit Rewards
    const rewards = this.getRewards();
    const reward = rewards.find(r => r.code === cleanCode);

    if (reward) {
      if (reward.status === 'REDEEMED') {
        return { success: false, message: `Reward ${cleanCode} has already been redeemed on ${reward.redeemedAt}.` };
      }
      if (reward.status === 'EXPIRED') {
        return { success: false, message: `Reward ${cleanCode} has expired.` };
      }

      reward.status = 'REDEEMED';
      reward.redeemedAt = new Date().toISOString();
      reward.staffNotes = staffNotes;
      this.saveRewards(rewards);

      // Rule 29: Reset streak 5/5 -> 0/5 ONLY on successful redemption!
      const customer = this.getCustomerAccount(reward.customerId);
      if (customer) {
        customer.track1Streak = 0;
        this.saveCustomerAccount(customer);
      }

      return {
        success: true,
        message: `Successfully redeemed ${reward.rewardName}! Streak reset to 0/5.`,
        voucher: reward,
        type: 'VISIT_REWARD'
      };
    }

    // Check in Big Bill Coupons
    const coupons = this.getCoupons();
    const coupon = coupons.find(c => c.code === cleanCode);

    if (coupon) {
      if (coupon.status === 'REDEEMED') {
        return { success: false, message: `Coupon ${cleanCode} has already been redeemed on ${coupon.redeemedAt}.` };
      }
      if (coupon.status === 'EXPIRED') {
        return { success: false, message: `Coupon ${cleanCode} has expired.` };
      }

      coupon.status = 'REDEEMED';
      coupon.redeemedAt = new Date().toISOString();
      coupon.staffNotes = staffNotes;
      this.saveCoupons(coupons);

      return {
        success: true,
        message: `Successfully redeemed Big Bill ${coupon.discountPercent}% Coupon (Max ₹${coupon.maxDiscount})!`,
        voucher: coupon,
        type: 'BIG_BILL_COUPON'
      };
    }

    return { success: false, message: `Code "${cleanCode}" not found in active rewards or coupons.` };
  }
}

export const loyaltyEngine = new LoyaltyEngine();
export default loyaltyEngine;
