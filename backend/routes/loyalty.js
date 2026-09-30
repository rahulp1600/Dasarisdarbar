import express from 'express';
import multer from 'multer';
import { callPythonOcrService } from '../services/ocrClient.js';
import { validateBillData } from '../services/billValidation.js';
import { getCustomerLoyaltyState, processVerifiedBillClaim } from '../services/loyaltyEngine.js';

const router = express.Router();
const upload = multer({
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

/**
 * GET /api/loyalty/status
 * Returns current customer progress, available rewards, coupons, and bills
 */
router.get('/status', async (req, res) => {
  const customerId = req.query.customerId;
  if (!customerId) {
    return res.status(400).json({ success: false, message: 'customerId is required' });
  }

  try {
    const data = await getCustomerLoyaltyState(customerId);
    return res.json({
      success: true,
      customerId,
      progress: data.progress,
      rewards: data.rewards,
      coupons: data.coupons,
      recentBills: data.recentBills
    });
  } catch (err) {
    console.error('Error fetching loyalty status:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

/**
 * POST /api/loyalty/claim
 * Main OCR bill processing and loyalty claim endpoint.
 * Accepts multipart/form-data or JSON with Base64 image.
 */
router.post('/claim', upload.single('bill_image'), async (req, res) => {
  const customerId = req.body.customerId || 'cust_guest';
  const customerName = req.body.customerName || 'Valued Customer';
  let imageBase64 = req.body.imageBase64;
  let imageBuffer = req.file ? req.file.buffer : null;
  let mimetype = req.file ? req.file.mimetype : 'image/jpeg';

  if (!imageBuffer && !imageBase64) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a bill photo to claim your loyalty benefits.'
    });
  }

  try {
    // Step 1: Call isolated Python OCR microservice
    const ocrResult = await callPythonOcrService({
      imageBase64,
      imageBuffer,
      mimetype
    });

    // Step 2: Validate extracted OCR data
    const validation = await validateBillData(ocrResult);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.userMessage,
        isDuplicate: !!validation.isDuplicate,
        isSequenceAnomaly: !!validation.isSequenceAnomaly,
        technicalReason: validation.technicalReason,
        extracted: {
          restaurant: ocrResult.restaurant_name,
          billNumber: ocrResult.bill_number,
          billDate: ocrResult.bill_date,
          billAmount: ocrResult.bill_amount,
          confidence: ocrResult.confidence
        }
      });
    }

    // Step 3: Process verified bill through loyalty engine rules
    const claimResult = await processVerifiedBillClaim({
      customerId,
      customerName,
      validatedBill: validation.validatedBill,
      fingerprint: validation.fingerprint
    });

    if (!claimResult.success) {
      return res.status(400).json({
        success: false,
        message: claimResult.message,
        category: claimResult.category,
        extracted: validation.validatedBill
      });
    }

    return res.json({
      success: true,
      message: claimResult.message,
      category: claimResult.category,
      newStreak: claimResult.newStreak,
      rewardUnlocked: claimResult.rewardGenerated,
      couponUnlocked: claimResult.couponGenerated,
      bill: claimResult.bill,
      extracted: validation.validatedBill
    });

  } catch (err) {
    console.error('Error processing loyalty claim:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while verifying your bill. Please try again.',
      technicalError: err.message
    });
  }
});

export default router;
