/**
 * DASARI DARBAR — SECTION 27 COMPREHENSIVE TEST SUITE
 * Validates all 10 mandatory scenarios from Section 27 against live backend & Python OCR.
 */

import { execSync } from 'child_process';
import { getBusinessDate } from './backend/services/billValidation.js';

const BACKEND_URL = 'http://127.0.0.1:5001';

function generateReceiptBase64({ restaurant, billNo, date, items, total }) {
  const payload = JSON.stringify({
    restaurant,
    billNo,
    date,
    items: (items || []).map(it => typeof it === 'string' ? it : it.text),
    total
  });

  const b64 = execSync('python test_gen_receipt.py', {
    input: payload,
    encoding: 'utf-8'
  });
  return b64.trim();
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('TESTING ALL 10 SCENARIOS FROM DASARI DARBAR SPECIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - Details: ${details}`);
      failed++;
    }
  }

  const today = getBusinessDate();
  const testRunId = Date.now() % 100000;
  const startBill = 5000 + testRunId;

  // Configure today's sequence first for test isolation
  console.log(`Configuring sequence for today (${today}) starting at #${startBill}...`);
  await fetch(`${BACKEND_URL}/api/admin/daily-sequence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessDate: today,
      firstBillNumber: startBill,
      adminUser: 'Dasaris_Darbar',
      confirmOverride: true
    })
  });

  // ==========================================================================
  // TEST 1 — Normal bill (₹850) -> Verified -> qualifying visit +1
  // ==========================================================================
  console.log('\n--- TEST 1: Normal bill (< ₹2,000) ---');
  const cust1 = `cust_test1_${Date.now()}`;
  const bill1Img = generateReceiptBase64({
    restaurant: "DASARI DARBAR",
    billNo: `Bill No: ${startBill + 1}`,
    date: `Date: ${today}`,
    items: ["1x Chicken Dum Biryani    Rs. 450.00", "1x Paneer Butter Masala   Rs. 400.00"],
    total: "GRAND TOTAL: Rs. 850.00"
  });

  const res1 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: cust1,
      customerName: 'Customer One',
      imageBase64: bill1Img
    })
  });
  const data1 = await res1.json();
  assert(res1.ok && data1.success && data1.category === 'VISIT_REWARD' && data1.newStreak === 1,
    'TEST 1: Normal bill (₹850) verified -> qualifying visit +1 (streak = 1)',
    JSON.stringify(data1));

  // ==========================================================================
  // TEST 2 — Fifth visit (Streak 4/5 -> 5/5 -> Reward Generated)
  // ==========================================================================
  console.log('\n--- TEST 2: Fifth visit milestone (4/5 -> 5/5 -> reward generated) ---');
  const cust2 = `cust_test2_${Date.now()}`;
  const { readLocalStore, writeLocalStore } = await import('./backend/services/supabaseClient.js');
  const store2 = readLocalStore();
  store2.loyalty_progress[cust2] = {
    customer_id: cust2,
    qualifying_visits_count: 4,
    total_visits_lifetime: 4,
    last_visit_date: '2026-09-20',
    milestone_unlocked: false
  };
  writeLocalStore(store2);

  const bill2Img = generateReceiptBase64({
    restaurant: "DASARI DARBAR",
    billNo: `Bill No: ${startBill + 2}`,
    date: `Date: ${today}`,
    items: ["1x Mutton Rogan Josh    Rs. 650.00", "1x Butter Naan Basket   Rs. 550.00"],
    total: "GRAND TOTAL: Rs. 1200.00"
  });

  const res2 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: cust2,
      customerName: 'Milestone Customer',
      imageBase64: bill2Img
    })
  });
  const data2 = await res2.json();
  assert(res2.ok && data2.success && data2.newStreak === 5 && data2.rewardUnlocked && data2.rewardUnlocked.reward_code,
    'TEST 2: Fifth visit (4/5 -> 5/5) generates milestone reward with voucher code',
    JSON.stringify(data2));

  // ==========================================================================
  // TEST 3 — ₹2,000+ bill (₹2,500) -> High-value bill verified, streak must NOT increase
  // ==========================================================================
  console.log('\n--- TEST 3: ₹2,000+ High-Value Bill ---');
  const cust3 = `cust_test3_${Date.now()}`;
  const store3 = readLocalStore();
  store3.loyalty_progress[cust3] = {
    customer_id: cust3,
    qualifying_visits_count: 3,
    total_visits_lifetime: 3,
    last_visit_date: '2026-09-20',
    milestone_unlocked: false
  };
  writeLocalStore(store3);

  const bill3Img = generateReceiptBase64({
    restaurant: "DASARI DARBAR",
    billNo: `Bill No: ${startBill + 3}`,
    date: `Date: ${today}`,
    items: ["2x Special Darbar Feast Platter   Rs. 2500.00"],
    total: "GRAND TOTAL: Rs. 2500.00"
  });

  const res3 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: cust3,
      customerName: 'High Value Diner',
      imageBase64: bill3Img
    })
  });
  const data3 = await res3.json();
  assert(
    res3.ok && data3.success && data3.category === 'BIG_BILL_REWARD' && 
    data3.couponUnlocked && data3.newStreak === 3,
    'TEST 3: ₹2,000+ bill verified -> High-value coupon available; streak remains 3/5',
    JSON.stringify(data3)
  );

  // ==========================================================================
  // TEST 4 — ₹2,000+ Redemption with counter verification, second attempt rejected
  // ==========================================================================
  console.log('\n--- TEST 4: ₹2,000+ Coupon Redemption & Double Redemption Protection ---');
  const couponCode = data3.couponUnlocked.coupon_code;

  // First redemption with counter verification
  const redeemRes1 = await fetch(`${BACKEND_URL}/api/admin/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voucherCode: couponCode,
      staffIdentifier: 'Staff Cashier [Physical Bill Verified at Counter]'
    })
  });
  const redeemData1 = await redeemRes1.json();
  assert(redeemRes1.ok && redeemData1.success,
    `TEST 4a: First redemption of coupon ${couponCode} succeeded after counter physical bill check`,
    JSON.stringify(redeemData1));

  // Second redemption attempt
  const redeemRes2 = await fetch(`${BACKEND_URL}/api/admin/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voucherCode: couponCode,
      staffIdentifier: 'Staff Cashier'
    })
  });
  const redeemData2 = await redeemRes2.json();
  assert(!redeemRes2.ok && !redeemData2.success && redeemData2.message.includes('already been redeemed'),
    'TEST 4b: Second redemption attempt rejected as already redeemed',
    JSON.stringify(redeemData2));

  // ==========================================================================
  // TEST 5 — Duplicate bill protection
  // ==========================================================================
  console.log('\n--- TEST 5: Duplicate Bill Protection ---');
  const res5 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: `cust_other_${Date.now()}`,
      customerName: 'Duplicate Attempter',
      imageBase64: bill1Img // Re-submitting bill1
    })
  });
  const data5 = await res5.json();
  assert(!res5.ok && !data5.success && data5.isDuplicate && data5.message.includes('already been'),
    'TEST 5: Duplicate bill submission rejected with duplicate warning and 0 rewards',
    JSON.stringify(data5));

  // ==========================================================================
  // TEST 6 — Missing bill number (OCR cannot find bill number)
  // ==========================================================================
  console.log('\n--- TEST 6: Missing Bill Number ---');
  const bill6Img = generateReceiptBase64({
    restaurant: "DASARI DARBAR",
    billNo: "", // Deliberately blank
    date: `Date: ${today}`,
    items: ["1x Butter Chicken   Rs. 450.00"],
    total: "GRAND TOTAL: Rs. 450.00"
  });

  const res6 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: `cust_miss_${Date.now()}`,
      customerName: 'No Bill Num',
      imageBase64: bill6Img
    })
  });
  const data6 = await res6.json();
  assert(!res6.ok && !data6.success && data6.message.toLowerCase().includes('bill number'),
    'TEST 6: Missing bill number rejected without inventing dummy value',
    JSON.stringify(data6));

  // ==========================================================================
  // TEST 7 — Missing amount (OCR cannot find grand total)
  // ==========================================================================
  console.log('\n--- TEST 7: Missing Amount ---');
  const bill7Img = generateReceiptBase64({
    restaurant: "DASARI DARBAR",
    billNo: `Bill No: ${startBill + 7}`,
    date: `Date: ${today}`,
    items: ["Order for Dine-In Only", "Items Pending Kitchen Delivery"],
    total: "" // Deliberately blank total with no prices anywhere
  });

  const res7 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: `cust_noamt_${Date.now()}`,
      customerName: 'No Amount',
      imageBase64: bill7Img
    })
  });
  const data7 = await res7.json();
  assert(!res7.ok && !data7.success && data7.message.toLowerCase().includes('amount'),
    'TEST 7: Missing amount rejected without defaulting to 0',
    JSON.stringify(data7));


  // ==========================================================================
  // TEST 8 — Sequence not configured (admin has not entered today's first bill)
  // ==========================================================================
  console.log('\n--- TEST 8: Sequence Not Configured ---');
  const futureDate = '2028-12-31';
  const seqRes8 = await fetch(`${BACKEND_URL}/api/admin/daily-sequence?date=${futureDate}`);
  const seqData8 = await seqRes8.json();
  assert(seqData8.success && !seqData8.isConfigured && seqData8.warning === "Today's bill sequence is not set.",
    'TEST 8: Unconfigured sequence returns warning without crashing or inventing a sequence',
    JSON.stringify(seqData8));

  // ==========================================================================
  // TEST 9 — Sequence mismatch (Bill number falls outside sequence)
  // ==========================================================================
  console.log('\n--- TEST 9: Sequence Mismatch ---');
  // Bill number is 2000, but configured sequence starts at 5000+
  const mismatchBillImg = generateReceiptBase64({
    restaurant: "DASARI DARBAR",
    billNo: `Bill No: 2000`,
    date: `Date: ${today}`,
    items: ["1x Paneer Tikka   Rs. 350.00"],
    total: "GRAND TOTAL: Rs. 350.00"
  });

  const res9 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: `cust_mismatch_${Date.now()}`,
      customerName: 'Mismatch Bill',
      imageBase64: mismatchBillImg
    })
  });
  const data9 = await res9.json();
  assert(!res9.ok && !data9.success && data9.isSequenceAnomaly && data9.message.includes('outside today\'s set sequence'),
    'TEST 9: Bill number outside sequence range is properly flagged and rejected',
    JSON.stringify(data9));

  // ==========================================================================
  // TEST 10 — Camera permission fallback verification
  // ==========================================================================
  console.log('\n--- TEST 10: Camera Permission Fallback ---');
  // Verify that BillUploadScanner code contains camera fallback mechanism without black screen
  const scannerCode = (await import('fs')).readFileSync('./src/components/BillUploadScanner.jsx', 'utf-8');
  const hasFallback = scannerCode.includes('Camera Notice') && scannerCode.includes('handleTriggerCamera') && scannerCode.includes('handleTriggerUpload');
  assert(hasFallback,
    'TEST 10: Frontend includes explicit camera trigger and graceful gallery upload fallback',
    'Verified BillUploadScanner dual inputs & fallback code');

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL 10)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
