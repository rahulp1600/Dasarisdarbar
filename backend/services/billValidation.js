/**
 * Dasari Darbar Bill Validation Service
 * Enforces:
 * 1. OCR legibility & restaurant verification
 * 2. Strict non-invented field rules
 * 3. Duplicate bill detection via deterministic fingerprinting and (bill_number + bill_date)
 * 4. Bill number sequence validation across days
 */

import { supabase, readLocalStore, writeLocalStore } from './supabaseClient.js';
import { logAuditEvent } from './auditLogger.js';

export function getBusinessDate(date = new Date()) {
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

/**
 * Generates unique deterministic bill fingerprint
 */
export function generateBillFingerprint(restaurant, billNumber, billDate, totalAmount) {
  const normRest = (restaurant || 'DASARI_DARBAR').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normBill = String(billNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normDate = String(billDate || getBusinessDate()).trim();
  const normAmount = Number(totalAmount || 0).toFixed(2);
  return `${normRest}|${normBill}|${normDate}|${normAmount}`;
}

/**
 * Checks if bill has already been submitted and verified
 */
export async function checkDuplicateBill({ billNumber, billDate, fingerprint }) {
  const numStr = String(billNumber).trim();
  const dateStr = String(billDate).trim();

  if (supabase) {
    try {
      // 1. Check verified_bills by bill_number and bill_date
      const { data: bills, error: bErr } = await supabase
        .from('verified_bills')
        .select('id, bill_number, bill_date, created_at')
        .eq('bill_number', numStr)
        .eq('bill_date', dateStr)
        .limit(1);

      if (!bErr && bills && bills.length > 0) {
        return {
          isDuplicate: true,
          reason: `Bill #${numStr} dated ${dateStr} has already been verified for loyalty rewards.`
        };
      }

      // 2. Check fingerprint in verified_bills
      if (fingerprint) {
        const { data: fpBills, error: fpErr } = await supabase
          .from('verified_bills')
          .select('id, bill_number, bill_date')
          .eq('bill_fingerprint', fingerprint)
          .limit(1);

        if (!fpErr && fpBills && fpBills.length > 0) {
          return {
            isDuplicate: true,
            reason: `Bill #${numStr} matches an already claimed bill record.`
          };
        }
      }
    } catch (e) {
      console.warn('Supabase duplicate check fallback:', e.message);
    }
  }

  // Local fallback store check
  const store = readLocalStore();
  const verifiedList = store.verified_bills || [];
  const dup = verifiedList.find(b => 
    (String(b.bill_number).trim() === numStr && String(b.bill_date).trim() === dateStr) ||
    (fingerprint && b.bill_fingerprint === fingerprint)
  );

  if (dup) {
    return {
      isDuplicate: true,
      reason: `Bill #${numStr} dated ${dateStr} has already been verified for loyalty rewards.`
    };
  }

  return { isDuplicate: false };
}


/**
 * Gets the admin-configured daily sequence for a business date
 */
export async function getDailySequenceConfig(businessDate) {
  const dateStr = businessDate || getBusinessDate();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_sequence_configs')
        .select('*')
        .eq('business_date', dateStr)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase getDailySequenceConfig fallback:', e.message);
    }
  }

  const store = readLocalStore();
  return store.daily_sequence_configs?.[dateStr] || null;
}

/**
 * Saves/updates the admin-configured starting bill number for a business date
 */
export async function setDailySequenceConfig({ businessDate, firstBillNumber, adminUser = 'Admin' }) {
  const dateStr = businessDate || getBusinessDate();
  const num = parseInt(firstBillNumber, 10);
  if (isNaN(num) || num <= 0) {
    throw new Error('First bill number must be a valid positive integer.');
  }

  const payload = {
    business_date: dateStr,
    first_bill_number: num,
    configured_by: adminUser,
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase
        .from('daily_sequence_configs')
        .upsert(payload);
    } catch (e) {
      console.warn('Supabase setDailySequenceConfig fallback:', e.message);
    }
  }

  const store = readLocalStore();
  if (!store.daily_sequence_configs) store.daily_sequence_configs = {};
  store.daily_sequence_configs[dateStr] = payload;
  writeLocalStore(store);

  // Log in admin_audit_logs per spec
  await logAuditEvent({
    actionType: 'DAILY_SEQUENCE_CONFIGURED',
    actorId: adminUser,
    targetRecordType: 'daily_sequence_configs',
    targetRecordId: dateStr,
    details: {
      businessDate: dateStr,
      firstBillNumber: num,
      configuredBy: adminUser
    }
  });

  return payload;
}

/**
 * Counts existing bills submitted today
 */
export async function countBillsForBusinessDate(businessDate) {
  const dateStr = businessDate || getBusinessDate();
  if (supabase) {
    try {
      const { count, error } = await supabase
        .from('verified_bills')
        .select('*', { count: 'exact', head: true })
        .eq('bill_date', dateStr);

      if (!error && typeof count === 'number') {
        return count;
      }
    } catch (e) {
      console.warn('Supabase countBillsForBusinessDate fallback:', e.message);
    }
  }

  const store = readLocalStore();
  return (store.verified_bills || []).filter(b => b.bill_date === dateStr).length;
}

/**
 * Validates bill sequence against admin-configured daily sequence.
 * Per spec Section 7 & 8:
 * - Admin enters today's first bill number (e.g. 5001).
 * - System checks if uploaded bill is within today's sequence range.
 * - If admin has NOT set the sequence, do NOT reject all bills; return warning.
 * - Sequence validation is a consistency check, NOT proof of authenticity.
 */
export async function validateBillSequence({ billNumber, billDate }) {
  const currentNum = parseInt(String(billNumber).replace(/\D/g, ''), 10);
  if (isNaN(currentNum)) {
    // Non-numeric bill numbers are accepted
    return { isValid: true };
  }

  // Must be a valid positive bill number
  if (currentNum <= 0) {
    return {
      isValid: false,
      reason: `Invalid non-positive bill number #${currentNum}.`
    };
  }

  const dateStr = billDate || getBusinessDate();
  const seqConfig = await getDailySequenceConfig(dateStr);

  // Section 8: IF ADMIN FORGETS TO SET THE SEQUENCE:
  // Do NOT automatically reject all bills.
  // Flag warning, allow processing.
  if (!seqConfig || !seqConfig.first_bill_number) {
    return {
      isValid: true,
      isSequenceConfigured: false,
      sequenceWarning: "Today's bill sequence is not set by admin."
    };
  }

  const firstNum = Number(seqConfig.first_bill_number);

  // Sequence mismatch: bill number is before today's starting bill
  if (currentNum < firstNum) {
    return {
      isValid: false,
      reason: `Bill sequence mismatch: Bill #${currentNum} is outside today's set sequence (starts from #${firstNum} for date ${dateStr}).`,
      isSequenceMismatch: true
    };
  }

  // Sequence anomaly: bill number jump is unreasonably high (> 2000 orders in a single day)
  if (currentNum > firstNum + 2000) {
    return {
      isValid: false,
      reason: `Bill sequence anomaly: Bill #${currentNum} significantly exceeds expected daily sequence range starting from #${firstNum}.`,
      isSequenceMismatch: true
    };
  }

  return {
    isValid: true,
    isSequenceConfigured: true,
    firstBillNumber: firstNum
  };
}

/**
 * Main validation pipeline for bill OCR payload
 */
export async function validateBillData(ocrData) {
  // 1. Basic legibility check
  if (!ocrData || !ocrData.success) {
    return {
      isValid: false,
      userMessage: "We couldn't clearly read your bill. Please upload a clearer photo with the full bill visible.",
      technicalReason: ocrData?.error || 'OCR parsing failed'
    };
  }

  // 2. Restaurant identity verification
  if (!ocrData.restaurant_name || !ocrData.restaurant_name.includes('Dasari')) {
    return {
      isValid: false,
      userMessage: "This receipt does not appear to be from Dasari Darbar. Please upload a valid dining bill from Dasari Darbar.",
      technicalReason: `Unrecognized restaurant name: ${ocrData.restaurant_name}`
    };
  }

  // 3. Bill number check
  if (!ocrData.bill_number) {
    return {
      isValid: false,
      userMessage: "Could not find a valid bill number on this receipt. Please ensure the top header of the bill is clearly visible.",
      technicalReason: 'Missing bill number'
    };
  }

  // 4. Bill date check
  if (!ocrData.bill_date) {
    return {
      isValid: false,
      userMessage: "Could not clearly identify the date on this receipt. Please upload a photo where the bill date is legible.",
      technicalReason: 'Missing bill date'
    };
  }

  // 5. Bill amount check
  const amount = Number(ocrData.bill_amount);
  if (isNaN(amount) || amount <= 0) {
    return {
      isValid: false,
      userMessage: "Could not determine the total bill amount. Please ensure the Grand Total row is clearly legible.",
      technicalReason: `Invalid bill amount: ${ocrData.bill_amount}`
    };
  }

  // 6. Generate deterministic fingerprint
  const fingerprint = generateBillFingerprint(
    ocrData.restaurant_name,
    ocrData.bill_number,
    ocrData.bill_date,
    amount
  );

  // 7. Duplicate Bill Check
  const dupCheck = await checkDuplicateBill({
    billNumber: ocrData.bill_number,
    billDate: ocrData.bill_date,
    fingerprint
  });

  if (dupCheck.isDuplicate) {
    return {
      isValid: false,
      isDuplicate: true,
      userMessage: "This bill has already been verified and claimed for loyalty rewards.",
      technicalReason: dupCheck.reason,
      fingerprint
    };
  }

  // 8. Sequence validation
  const seqCheck = await validateBillSequence({
    billNumber: ocrData.bill_number,
    billDate: ocrData.bill_date
  });

  if (!seqCheck.isValid) {
    return {
      isValid: false,
      isSequenceAnomaly: true,
      userMessage: seqCheck.reason,
      technicalReason: seqCheck.reason,
      fingerprint
    };
  }

  return {
    isValid: true,
    fingerprint,
    validatedBill: {
      restaurant: ocrData.restaurant_name,
      billNumber: ocrData.bill_number,
      billDate: ocrData.bill_date,
      billAmount: Math.round(amount * 100) / 100,
      confidence: ocrData.confidence || 0.85,
      rawText: ocrData.raw_text || ''
    }
  };
}
