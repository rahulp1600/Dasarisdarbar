/**
 * END-TO-END AUTOMATED TEST SUITE FOR DASARI DARBAR OCR LOYALTY SYSTEM
 * Verifies all 9 core test scenarios from Section 25 of the specification:
 * 1. Valid bill verification & progress increment
 * 2. Duplicate bill rejection
 * 3. Poor/unreadable image rejection
 * 4. Fake/other restaurant rejection
 * 5. Invalid sequence detection
 * 6. ₹2,000+ big bill coupon mechanism
 * 7. 5th qualifying visit milestone reward generation
 * 8. Reward redemption & double redemption prevention
 * 9. Persistent state consistency
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = 'http://127.0.0.1:5001';
const PYTHON_OCR_URL = 'http://127.0.0.1:8000';

// Helper to generate receipt images with Python Pillow
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


async function runTests() {
  console.log('================================================================');
  console.log('STARTING DASARI DARBAR E2E OCR LOYALTY SYSTEM VALIDATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, title, details = '') {
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} - Details: ${details}`);
      failed++;
    }
  }

  // 0. HEALTH CHECK
  console.log('Checking health of Node & Python services...');
  const healthRes = await fetch(`${BACKEND_URL}/api/health`);
  const healthData = await healthRes.json();
  assert(healthData.status === 'healthy' && healthData.integrations.pythonOcr === 'ok', 
    '0. System Health: Node backend and Python OCR service are connected and operational');

  const { readLocalStore, writeLocalStore } = await import('./backend/services/supabaseClient.js');
  const initialStore = readLocalStore();
  const maxRecorded = (initialStore.verified_bills && initialStore.verified_bills.length > 0)
    ? Math.max(...initialStore.verified_bills.map(b => parseInt(String(b.bill_number).replace(/\D/g, '') || 0, 10)))
    : 1000;
  const baseNum = maxRecorded + 1;
  const testCustId = 'e2e_customer_' + Date.now();

  // TEST 1: Valid bill (< ₹2000)
  console.log('\n--- TEST 1: Valid Bill (< ₹2000) ---');
  const validBillB64 = generateReceiptBase64({
    restaurant: "DASARIS DARBAR",
    billNo: `Bill No: ${baseNum}`,
    date: "Date: 28-09-2026",
    items: [
      { y: 240, text: "1x Raju Gari Kodi Pulav     Rs. 360.00" },
      { y: 280, text: "1x Basket Chicken           Rs. 351.00" }
    ],
    total: "GRAND TOTAL: Rs. 711.00"
  });

  const res1 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: testCustId,
      customerName: 'E2E Tester',
      imageBase64: validBillB64
    })
  });
  const data1 = await res1.json();
  assert(res1.ok && data1.success && data1.category === 'VISIT_REWARD' && data1.newStreak === 1,
    '1. Valid bill (< ₹2000) verified: OCR extracted fields, saved verified bill, streak = 1',
    JSON.stringify(data1));

  // TEST 2: Duplicate bill rejection
  console.log('\n--- TEST 2: Duplicate Bill Detection ---');
  const res2 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: testCustId,
      customerName: 'E2E Tester',
      imageBase64: validBillB64
    })
  });
  const data2 = await res2.json();
  assert(!res2.ok && !data2.success && (data2.isDuplicate || data2.message?.includes('already been')),
    '2. Duplicate bill rejected: System prevented same bill from being claimed twice',
    JSON.stringify(data2));

  // TEST 3: Poor / unreadable image
  console.log('\n--- TEST 3: Poor / Unreadable Image ---');
  // 100x100 blank white image with no text
  const poorB64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';


  const res3 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: testCustId,
      customerName: 'E2E Tester',
      imageBase64: poorB64
    })
  });
  const data3 = await res3.json();
  assert(!res3.ok && !data3.success && data3.message?.includes("couldn't clearly read your bill"),
    '3. Poor/blank image handled gracefully with customer-friendly prompt',
    JSON.stringify(data3));

  // TEST 4: Fake / Different Restaurant
  console.log('\n--- TEST 4: Fake / Different Restaurant ---');
  const otherRestB64 = generateReceiptBase64({
    restaurant: "SOME OTHER RESTAURANT",
    billNo: `Bill No: ${baseNum + 5}`,
    date: "Date: 28-09-2026",
    items: [{ y: 240, text: "1x Burger Combo     Rs. 450.00" }],
    total: "GRAND TOTAL: Rs. 450.00"
  });

  const res4 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: testCustId,
      customerName: 'E2E Tester',
      imageBase64: otherRestB64
    })
  });
  const data4 = await res4.json();
  assert(!res4.ok && !data4.success && data4.message?.includes('not appear to be from Dasari Darbar'),
    '4. Different restaurant rejected: Receipts outside Dasari Darbar are rejected',
    JSON.stringify(data4));

  // TEST 5: Out-of-Sequence / Anomaly Detection
  console.log('\n--- TEST 5: Sequence Anomaly Detection ---');
  const anomalyBillB64 = generateReceiptBase64({
    restaurant: "DASARIS DARBAR",
    billNo: "Bill No: 2",
    date: "Date: 28-09-2026",
    items: [{ y: 240, text: "1x Biryani     Rs. 300.00" }],
    total: "GRAND TOTAL: Rs. 300.00"
  });

  const res5 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: testCustId,
      customerName: 'E2E Tester',
      imageBase64: anomalyBillB64
    })
  });
  const data5 = await res5.json();
  assert(!res5.ok && !data5.success && data5.isSequenceAnomaly === true,
    '5. Out-of-sequence anomaly rejected: System rejected reset to #2 when sequence is at thousands',
    JSON.stringify(data5));

  // TEST 6: ₹2,000+ Big Bill Coupon
  console.log('\n--- TEST 6: ₹2,000+ Big Bill Coupon ---');
  const bigBillCust = 'big_bill_cust_' + Date.now();
  const bigBillB64 = generateReceiptBase64({
    restaurant: "DASARIS DARBAR",
    billNo: `Bill No: ${baseNum + 1}`,
    date: "Date: 28-09-2026",
    items: [
      { y: 240, text: "2x Tandoori Chicken Mandi   Rs. 900.00" },
      { y: 280, text: "3x Mutton Ghee Roast        Rs. 1230.00" }
    ],
    total: "GRAND TOTAL: Rs. 2130.00"
  });

  const res6 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: bigBillCust,
      customerName: 'Big Spender',
      imageBase64: bigBillB64
    })
  });
  const data6 = await res6.json();
  assert(res6.ok && data6.success && data6.category === 'BIG_BILL_REWARD' && data6.couponUnlocked !== null && data6.newStreak === 0,
    '6. ₹2,000+ bill generated separate Big Bill Coupon without modifying visit streak (newStreak = 0)',
    JSON.stringify(data6));

  // TEST 7: Fifth Qualifying Visit -> Reward Unlocked
  console.log('\n--- TEST 7: Fifth Qualifying Visit Milestone ---');
  const streakCustId = 'streak_cust_' + Date.now();

  // Directly set customer streak to 4 to test 5th visit
  const s = readLocalStore();
  s.loyalty_progress[streakCustId] = {
    customer_id: streakCustId,
    qualifying_visits_count: 4,
    total_visits_lifetime: 4,
    last_visit_date: '2026-09-20'
  };
  writeLocalStore(s);

  const fifthBillB64 = generateReceiptBase64({
    restaurant: "DASARIS DARBAR",
    billNo: `Bill No: ${baseNum + 2}`,
    date: "Date: 28-09-2026",
    items: [{ y: 240, text: "1x Raju Gari Kodi Pulav     Rs. 360.00" }],
    total: "GRAND TOTAL: Rs. 360.00"
  });

  const res7 = await fetch(`${BACKEND_URL}/api/loyalty/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: streakCustId,
      customerName: 'Streak Champ',
      imageBase64: fifthBillB64
    })
  });
  const data7 = await res7.json();
  assert(res7.ok && data7.success && data7.newStreak === 5 && data7.rewardUnlocked !== null,
    '7. 5th qualifying visit unlocks active milestone reward from pool (newStreak = 5)',
    JSON.stringify(data7));

  const earnedReward = data7.rewardUnlocked;
  const rewardCode = earnedReward?.reward_code || earnedReward?.code;

  // TEST 8: Reward Redemption & Double Redemption Prevention
  console.log('\n--- TEST 8: Reward Redemption ---');
  const redeemRes = await fetch(`${BACKEND_URL}/api/admin/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voucherCode: rewardCode,
      staffIdentifier: 'Cashier Desk Counter 1'
    })
  });
  const redeemData = await redeemRes.json();
  assert(redeemRes.ok && redeemData.success && redeemData.streakReset === true,
    '8a. Voucher redeemed by staff: Status updated to redeemed and streak resets 5/5 -> 0/5',
    JSON.stringify(redeemData));

  // Try redeeming same code again
  const redeemTwiceRes = await fetch(`${BACKEND_URL}/api/admin/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voucherCode: rewardCode,
      staffIdentifier: 'Cashier Desk Counter 1'
    })
  });
  const redeemTwiceData = await redeemTwiceRes.json();
  assert(!redeemTwiceRes.ok && !redeemTwiceData.success && redeemTwiceData.message.includes('already been redeemed'),
    '8b. Double redemption rejected: Same voucher code cannot be redeemed twice',
    JSON.stringify(redeemTwiceData));

  // TEST 9: Persistent State Consistency Check
  console.log('\n--- TEST 9: Persistent State Consistency Check ---');
  const statusRes = await fetch(`${BACKEND_URL}/api/loyalty/status?customerId=${streakCustId}`);
  const statusData = await statusRes.json();
  assert(statusRes.ok && statusData.success && statusData.progress.qualifying_visits_count === 0,
    '9. Customer data persists correctly: Streak remains 0 after redemption across requests',
    JSON.stringify(statusData));

  console.log('\n================================================================');
  console.log(`FINAL E2E RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
