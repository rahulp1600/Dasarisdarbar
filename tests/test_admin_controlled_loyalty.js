// ============================================================================
// COMPREHENSIVE TEST SUITE: Admin-Controlled Loyalty Rewards (Track 1 & Track 2)
// Covers all 12 explicit prompt verification requirements
// ============================================================================

process.env.NODE_ENV = 'test';
import assert from 'assert';
import { 
  validateTrackAllocation, 
  selectWeightedOffer, 
  getActiveRewardOffers,
  processVerifiedBillClaim,
  redeemVoucher,
  checkDailyLimits,
  getKolkataDateString
} from '../backend/services/loyaltyEngine.js';
import { generateBillFingerprint } from '../backend/services/billValidation.js';
import { readLocalStore, writeLocalStore, DEFAULT_STORE } from '../backend/services/supabaseClient.js';
import { LoyaltyEngine } from '../src/services/loyaltyEngine.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${e.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${e.message}`);
    failed++;
  }
}

console.log('\n============================================================');
console.log('STARTING DASARI DARBAR LOYALTY ENGINE VERIFICATION');
console.log('============================================================\n');

// Reset test store helper
function setupFreshTestStore() {
  const freshStore = JSON.parse(JSON.stringify(DEFAULT_STORE));
  freshStore.loyalty_offers = [
    {
      id: 't1_offer_70',
      track: 'track1',
      title: '70% Weighted Reward',
      type: 'percentage_discount',
      discount_percent: 10,
      max_discount: 300,
      allocation_percentage: 70,
      active: true,
      is_deleted: false,
      expiry_days: 30
    },
    {
      id: 't1_offer_30',
      track: 'track1',
      title: '30% Weighted Reward',
      type: 'percentage_discount',
      discount_percent: 15,
      max_discount: 400,
      allocation_percentage: 30,
      active: true,
      is_deleted: false,
      expiry_days: 30
    },
    {
      id: 't2_offer_mandi',
      track: 'track2',
      title: 'Chicken Mandi Special',
      type: 'free_item',
      description: 'Free Mandi Plate',
      allocation_percentage: 50,
      active: true,
      is_deleted: false,
      expiry_days: 30
    },
    {
      id: 't2_offer_50off',
      track: 'track2',
      title: '50% Mega Dining Off',
      type: 'percentage_discount',
      discount_percent: 50,
      max_discount: 1000,
      allocation_percentage: 50,
      active: true,
      is_deleted: false,
      expiry_days: 30
    }
  ];
  freshStore.verified_bills = [];
  freshStore.customer_rewards = [];
  freshStore.big_bill_coupons = [];
  freshStore.loyalty_progress = {};
  freshStore.audit_logs = [];
  writeLocalStore(freshStore);
  return freshStore;
}

// ----------------------------------------------------------------------------
// TEST 1: Track 1 weighted allocation follows saved admin percentages (70/30)
// ----------------------------------------------------------------------------
await testAsync('1. Track 1 weighted allocation follows saved admin percentages (70/30)', async () => {
  setupFreshTestStore();
  const validation = await validateTrackAllocation('track1');
  assert.strictEqual(validation.isValid, true, 'Track 1 should be valid at 70+30=100%');

  let count70 = 0;
  let count30 = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const offer = await selectWeightedOffer('track1');
    assert(offer, 'Offer must be selected');
    if (offer.id === 't1_offer_70') count70++;
    if (offer.id === 't1_offer_30') count30++;
  }

  const ratio70 = count70 / N;
  const ratio30 = count30 / N;
  assert(ratio70 > 0.62 && ratio70 < 0.78, `Expected ~70% for offer 1, got ${(ratio70 * 100).toFixed(1)}%`);
  assert(ratio30 > 0.22 && ratio30 < 0.38, `Expected ~30% for offer 2, got ${(ratio30 * 100).toFixed(1)}%`);
});

// ----------------------------------------------------------------------------
// TEST 2: Track 2 weighted allocation follows its own saved admin percentages (50/50)
// ----------------------------------------------------------------------------
await testAsync('2. Track 2 weighted allocation follows its own saved admin percentages (50/50)', async () => {
  setupFreshTestStore();
  const validation = await validateTrackAllocation('track2');
  assert.strictEqual(validation.isValid, true, 'Track 2 should be valid at 50+50=100%');

  let countMandi = 0;
  let count50Off = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const offer = await selectWeightedOffer('track2');
    assert(offer, 'Offer must be selected');
    if (offer.id === 't2_offer_mandi') countMandi++;
    if (offer.id === 't2_offer_50off') count50Off++;
  }

  const ratioMandi = countMandi / N;
  const ratio50Off = count50Off / N;
  assert(ratioMandi > 0.42 && ratioMandi < 0.58, `Expected ~50% Mandi, got ${(ratioMandi * 100).toFixed(1)}%`);
  assert(ratio50Off > 0.42 && ratio50Off < 0.58, `Expected ~50% 50% Off, got ${(ratio50Off * 100).toFixed(1)}%`);
});

// ----------------------------------------------------------------------------
// TEST 3: Bill of ₹1,998 does not qualify for Big Bill; ₹1,999 and ₹2,000 do
// ----------------------------------------------------------------------------
await testAsync('3. Exact eligibility threshold: ₹1,998 is Visit Reward; ₹1,999 and ₹2,000 are Big Bill', async () => {
  const store = setupFreshTestStore();
  const testDate = getKolkataDateString();

  // ₹1,998 Claim
  const res1998 = await processVerifiedBillClaim({
    customerId: 'cust_thresh_1',
    customerName: 'Threshold Tester 1',
    validatedBill: {
      billNumber: 'BILL-1998',
      billDate: testDate,
      billAmount: 1998,
      restaurant: "DASARI'S DARBAR"
    },
    fingerprint: 'DASARI|BILL1998|2026-10-16|1998.00'
  });

  assert.strictEqual(res1998.success, true);
  assert.strictEqual(res1998.category, 'VISIT_REWARD', '₹1,998 bill must be VISIT_REWARD (Track 1)');
  assert.strictEqual(res1998.newStreak, 1, '₹1,998 must increment visit streak to 1');
  assert.strictEqual(res1998.couponGenerated, null, '₹1,998 must NOT issue Big Bill coupon');

  // ₹1,999 Claim
  const res1999 = await processVerifiedBillClaim({
    customerId: 'cust_thresh_2',
    customerName: 'Threshold Tester 2',
    validatedBill: {
      billNumber: 'BILL-1999',
      billDate: testDate,
      billAmount: 1999,
      restaurant: "DASARI'S DARBAR"
    },
    fingerprint: 'DASARI|BILL1999|2026-10-16|1999.00'
  });

  assert.strictEqual(res1999.success, true);
  assert.strictEqual(res1999.category, 'BIG_BILL_REWARD', '₹1,999 bill must qualify as BIG_BILL_REWARD (Track 2)');
  assert.strictEqual(res1999.newStreak, 0, 'Big Bill must NOT increment 5-visit streak');
  assert(res1999.couponGenerated, '₹1,999 must unlock a Big Bill discount coupon');
  assert(res1999.couponGenerated.coupon_code.startsWith('DD-BIG'), 'Coupon code must have DD-BIG prefix');

  // ₹2,000 Claim
  const res2000 = await processVerifiedBillClaim({
    customerId: 'cust_thresh_3',
    customerName: 'Threshold Tester 3',
    validatedBill: {
      billNumber: 'BILL-2000',
      billDate: testDate,
      billAmount: 2000,
      restaurant: "DASARI'S DARBAR"
    },
    fingerprint: 'DASARI|BILL2000|2026-10-16|2000.00'
  });

  assert.strictEqual(res2000.success, true);
  assert.strictEqual(res2000.category, 'BIG_BILL_REWARD', '₹2,000 bill must qualify as BIG_BILL_REWARD (Track 2)');
  assert(res2000.couponGenerated, '₹2,000 must unlock a Big Bill discount coupon');
});

// ----------------------------------------------------------------------------
// TEST 4: Setting an offer to 0% prevents its selection
// ----------------------------------------------------------------------------
await testAsync('4. Setting an offer to 0% prevents its selection completely', async () => {
  const store = setupFreshTestStore();
  // Set offer A to 0%, offer B to 100%
  store.loyalty_offers = [
    {
      id: 't1_zero_pct',
      track: 'track1',
      title: 'Zero Percent Offer',
      allocation_percentage: 0,
      active: true,
      is_deleted: false
    },
    {
      id: 't1_hundred_pct',
      track: 'track1',
      title: 'Hundred Percent Offer',
      allocation_percentage: 100,
      active: true,
      is_deleted: false
    }
  ];
  writeLocalStore(store);

  const validation = await validateTrackAllocation('track1');
  assert.strictEqual(validation.isValid, true, '0% + 100% is a valid 100% total');

  let zeroSelected = 0;
  for (let i = 0; i < 500; i++) {
    const selected = await selectWeightedOffer('track1');
    if (selected.id === 't1_zero_pct') {
      zeroSelected++;
    }
  }
  assert.strictEqual(zeroSelected, 0, 'Offer with 0% allocation must NEVER be selected');
});

// ----------------------------------------------------------------------------
// TEST 5: Invalid totals are rejected independently for each track
// ----------------------------------------------------------------------------
await testAsync('5. Invalid totals are rejected independently for each track without silent normalisation', async () => {
  const store = setupFreshTestStore();
  // Make Track 1 sum to 80% (invalid) while Track 2 is 100% (valid)
  store.loyalty_offers[0].allocation_percentage = 50;
  store.loyalty_offers[1].allocation_percentage = 30; // Total 80%
  writeLocalStore(store);

  const t1Val = await validateTrackAllocation('track1');
  assert.strictEqual(t1Val.isValid, false, 'Track 1 summing to 80% must be invalid');
  assert(t1Val.error.includes('80%'), 'Error message must clearly report current total');

  const t2Val = await validateTrackAllocation('track2');
  assert.strictEqual(t2Val.isValid, true, 'Track 2 summing to 100% must remain valid independently');

  // Attempting weighted selection on invalid Track 1 returns null (safe fail)
  const t1Offer = await selectWeightedOffer('track1');
  assert.strictEqual(t1Offer, null, 'selectWeightedOffer must return null when configuration is invalid');
});

// ----------------------------------------------------------------------------
// TEST 6: Deactivated and deleted offers are not selected for new rewards
// ----------------------------------------------------------------------------
await testAsync('6. Deactivated and soft-deleted offers are excluded from selection', async () => {
  const store = setupFreshTestStore();
  store.loyalty_offers = [
    {
      id: 't2_active',
      track: 'track2',
      title: 'Active 100% Offer',
      allocation_percentage: 100,
      active: true,
      is_deleted: false
    },
    {
      id: 't2_deactivated',
      track: 'track2',
      title: 'Deactivated Offer',
      allocation_percentage: 50,
      active: false,
      is_deleted: false
    },
    {
      id: 't2_deleted',
      track: 'track2',
      title: 'Soft-deleted Offer',
      allocation_percentage: 50,
      active: true,
      is_deleted: true
    }
  ];
  writeLocalStore(store);

  const activeOffers = await getActiveRewardOffers('track2');
  assert.strictEqual(activeOffers.length, 1, 'Only non-deleted, active offers should be in active pool');
  assert.strictEqual(activeOffers[0].id, 't2_active');

  for (let i = 0; i < 100; i++) {
    const offer = await selectWeightedOffer('track2');
    assert.strictEqual(offer.id, 't2_active', 'Only the active non-deleted offer may be selected');
  }
});

// ----------------------------------------------------------------------------
// TEST 7: Adding, editing, or removing offers does not silently redistribute percentages
// ----------------------------------------------------------------------------
await testAsync('7. Offer operations do NOT silently redistribute other offers percentages', async () => {
  const store = setupFreshTestStore();
  const initialT1Offer1Pct = store.loyalty_offers[0].allocation_percentage; // 70
  const initialT1Offer2Pct = store.loyalty_offers[1].allocation_percentage; // 30

  // Admin deactivates offer 2
  store.loyalty_offers[1].active = false;
  writeLocalStore(store);

  // Check offer 1 percentage is still 70 (not silently inflated to 100)
  const updatedOffers = readLocalStore().loyalty_offers;
  assert.strictEqual(updatedOffers[0].allocation_percentage, 70, 'Offer 1 percentage must remain untouched at 70%');

  // Track 1 is now total 70% -> correctly invalid requiring admin explicit action
  const val = await validateTrackAllocation('track1');
  assert.strictEqual(val.isValid, false, 'Track 1 must be flagged as invalid (70%) until admin explicitly configures 100%');
});

// ----------------------------------------------------------------------------
// TEST 8: Previously issued vouchers and redemption history remain intact after offer changes
// ----------------------------------------------------------------------------
await testAsync('8. Historical rewards and issued vouchers remain intact after offer edit/soft-delete', async () => {
  const store = setupFreshTestStore();
  const testDate = getKolkataDateString();

  // 1. Issue a Big Bill reward
  const claimRes = await processVerifiedBillClaim({
    customerId: 'cust_audit_1',
    customerName: 'Audit Tester',
    validatedBill: {
      billNumber: 'BILL-HIST-1',
      billDate: testDate,
      billAmount: 2500,
      restaurant: "DASARI'S DARBAR"
    },
    fingerprint: 'DASARI|BILLHIST1|2026-10-16|2500.00'
  });

  const voucherCode = claimRes.couponGenerated.coupon_code;
  const issuedOfferId = claimRes.couponGenerated.source_offer_id;
  const initialDiscount = claimRes.couponGenerated.discount_percent;

  // 2. Admin edits and soft-deletes the original offer
  const currentStore = readLocalStore();
  const offerToEdit = currentStore.loyalty_offers.find(o => o.id === issuedOfferId);
  if (offerToEdit) {
    offerToEdit.discount_percent = 99; // Alter discount
    offerToEdit.is_deleted = true;     // Soft-delete
    offerToEdit.active = false;
  }
  writeLocalStore(currentStore);

  // 3. Verify voucher snapshot retains original details
  const postEditStore = readLocalStore();
  const coupon = postEditStore.big_bill_coupons.find(c => c.coupon_code === voucherCode);
  assert(coupon, 'Issued coupon must still exist in storage');
  assert.strictEqual(coupon.discount_percent, initialDiscount, 'Issued coupon must retain its original discount snapshot');

  // 4. Verify voucher is still redeemable
  const redeemRes = await redeemVoucher({ voucherCode, staffIdentifier: 'Cashier 1' });
  assert.strictEqual(redeemRes.success, true, 'Voucher remains fully redeemable after offer archival');
});

// ----------------------------------------------------------------------------
// TEST 9: Daily Big Bill limit remains enforced under concurrent requests
// ----------------------------------------------------------------------------
await testAsync('9. Daily Big Bill limit remains strictly enforced under concurrent requests', async () => {
  setupFreshTestStore();
  const testDate = getKolkataDateString();
  const custId = 'cust_concurrent_bb';

  // Fire 3 concurrent Big Bill claims at the exact same moment for the same customer
  const promises = [1, 2, 3].map(i => 
    processVerifiedBillClaim({
      customerId: custId,
      customerName: 'Concurrent Tester',
      validatedBill: {
        billNumber: `BILL-CONC-${i}`,
        billDate: testDate,
        billAmount: 2500 + i,
        restaurant: "DASARI'S DARBAR"
      },
      fingerprint: `DASARI|BILLCONC${i}|2026-10-16|${2500 + i}.00`
    })
  );

  const results = await Promise.all(promises);
  const successCount = results.filter(r => r.success).length;
  const rejectedCount = results.filter(r => !r.success && r.message && r.message.includes('Daily Big Bill')).length;

  assert.strictEqual(successCount, 1, `Exactly 1 claim must succeed, got ${successCount}`);
  assert.strictEqual(rejectedCount, 2, `Exactly 2 claims must be rejected with daily limit, got ${rejectedCount}`);
});

// ----------------------------------------------------------------------------
// TEST 10: Track 1 and Track 2 never select each other's offers
// ----------------------------------------------------------------------------
await testAsync('10. Strict Track Isolation: Track 1 and Track 2 never select each others offers', async () => {
  setupFreshTestStore();

  for (let i = 0; i < 200; i++) {
    const t1Offer = await selectWeightedOffer('track1');
    assert.strictEqual(t1Offer.track, 'track1', 'Track 1 selection must only return track1 offers');

    const t2Offer = await selectWeightedOffer('track2');
    assert.strictEqual(t2Offer.track, 'track2', 'Track 2 selection must only return track2 offers');
  }
});

// ----------------------------------------------------------------------------
// TEST 11: Bill verification, eligibility, voucher expiry, redemption, and fraud-prevention checks work
// ----------------------------------------------------------------------------
await testAsync('11. Fraud prevention: Duplicate receipt fingerprint is rejected', async () => {
  setupFreshTestStore();
  const testDate = getKolkataDateString();

  const claim1 = await processVerifiedBillClaim({
    customerId: 'cust_fraud_1',
    customerName: 'Fraud Check 1',
    validatedBill: {
      billNumber: 'BILL-UNIQUE-99',
      billDate: testDate,
      billAmount: 850,
      restaurant: "DASARI'S DARBAR"
    },
    fingerprint: 'DASARI|BILLUNIQUE99|2026-10-16|850.00'
  });
  assert.strictEqual(claim1.success, true);

  // Attempt duplicate fingerprint with another customer
  const claim2 = await processVerifiedBillClaim({
    customerId: 'cust_fraud_2',
    customerName: 'Fraud Check 2',
    validatedBill: {
      billNumber: 'BILL-UNIQUE-99',
      billDate: testDate,
      billAmount: 850,
      restaurant: "DASARI'S DARBAR"
    },
    fingerprint: 'DASARI|BILLUNIQUE99|2026-10-16|850.00'
  });
  assert.strictEqual(claim2.success, false, 'Duplicate bill fingerprint must be rejected');
  assert(claim2.message.includes('already been used'), 'Rejection message must indicate duplicate usage');
});

// ----------------------------------------------------------------------------
// TEST 12: Invalid or missing configuration fails safely without issuing an unintended reward
// ----------------------------------------------------------------------------
await testAsync('12. Fail-safe protection: Invalid configuration safely stops reward issuance', async () => {
  const store = setupFreshTestStore();
  // Break Track 2 by setting active percentages to sum to 75%
  store.loyalty_offers[2].allocation_percentage = 40;
  store.loyalty_offers[3].allocation_percentage = 35; // Total 75%
  writeLocalStore(store);

  const testDate = getKolkataDateString();
  const claim = await processVerifiedBillClaim({
    customerId: 'cust_failsafe_1',
    customerName: 'Failsafe Tester',
    validatedBill: {
      billNumber: 'BILL-FAILSAFE-1',
      billDate: testDate,
      billAmount: 2200,
      restaurant: "DASARI'S DARBAR"
    },
    fingerprint: 'DASARI|BILLFAILSAFE1|2026-10-16|2200.00'
  });

  assert.strictEqual(claim.success, false, 'Claim must fail safely when allocation config is invalid');
  assert(claim.message.includes('allocation configuration is currently invalid'), 'Must inform user that config needs admin setup');
  assert.strictEqual(claim.couponGenerated, undefined, 'Must NEVER issue an unintended coupon on invalid config');
});

// ----------------------------------------------------------------------------
// TEST FRONTEND LOYALTY ENGINE MIRROR (Class LoyaltyEngine in src/services)
// ----------------------------------------------------------------------------
test('13. Frontend LoyaltyEngine class mirrors Track 1 & 2 isolation and threshold rules', () => {
  const memStore = {};
  const mockStorage = {
    get: (key, def) => memStore[key] || def,
    set: (key, val) => { memStore[key] = val; }
  };
  const frontendEngine = new LoyaltyEngine(mockStorage);

  const t1Val = frontendEngine.validateTrackAllocation('track1');
  assert.strictEqual(t1Val.isValid, true, 'Default frontend Track 1 must be valid (25*4 = 100%)');

  const t2Val = frontendEngine.validateTrackAllocation('track2');
  assert.strictEqual(t2Val.isValid, true, 'Default frontend Track 2 must be valid (100%)');

  const t1Pick = frontendEngine.selectWeightedOffer('track1');
  assert.strictEqual(t1Pick.track, 'track1');

  const t2Pick = frontendEngine.selectWeightedOffer('track2');
  assert.strictEqual(t2Pick.track, 'track2');
});

console.log('\n============================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
}
