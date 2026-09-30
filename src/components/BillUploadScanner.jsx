import React, { useState, useRef } from 'react';
import { 
  Camera, Upload, FileText, CheckCircle, AlertCircle, Clock, 
  Sparkles, RefreshCw, X, ArrowRight, ShieldCheck, Check
} from 'lucide-react';
import loyaltyEngine from '../services/loyaltyEngine';
import backendApi from '../services/backendApi';
import { scanReceiptWithTesseract } from '../services/ocrService';

export default function BillUploadScanner({ 
  customer, 
  preferredReward = 'Free Biryani',
  onClaimSuccess 
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageFileName, setImageFileName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(null);
  const [claimResult, setClaimResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleReset = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setImageFileName('');
    setIsScanning(false);
    setScanStep(null);
    setClaimResult(null);
    setErrorMsg(null);
    setCameraError(null);
  };

  const handleTriggerCamera = () => {
    setErrorMsg(null);
    setCameraError(null);
    try {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    } catch (err) {
      console.warn('Camera launch error:', err);
      setCameraError('Camera access not supported on this browser/device. Please use gallery upload below.');
    }
  };

  const handleTriggerUpload = () => {
    setErrorMsg(null);
    setCameraError(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setErrorMsg(null);
    setCameraError(null);
    setClaimResult(null);
    setSelectedFile(file);
    setImageFileName(file.name || 'Receipt Image');

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file. Please try another photo.');
    };
    reader.readAsDataURL(file);
  };

  const handleScanAndClaim = async () => {
    if (!selectedImage) {
      setErrorMsg('Please select or capture a bill photo first.');
      return;
    }

    setIsScanning(true);
    setErrorMsg(null);
    setClaimResult(null);

    // Section 21: Branded Loading States
    // 1. Reading your bill...
    setScanStep({ status: 'reading', progress: 0.25, message: 'Reading your bill...' });

    const timer1 = setTimeout(() => {
      // 2. Verifying your bill...
      setScanStep({ status: 'verifying', progress: 0.50, message: 'Verifying your bill...' });
    }, 600);

    const timer2 = setTimeout(() => {
      // 3. Checking loyalty eligibility...
      setScanStep({ status: 'eligibility', progress: 0.75, message: 'Checking loyalty eligibility...' });
    }, 1200);

    try {
      // Call Express backend (Node.js -> Python OCR -> Validation -> Supabase)
      const result = await backendApi.claimBill({
        customerId: customer?.id || 'cust_sai',
        customerName: customer?.name || 'Customer',
        imageBase64: selectedImage,
        file: selectedFile
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!result.success) {
        // Human-friendly error messages (Never expose raw server crash)
        const msg = result.message || 'We could not verify this bill automatically. Please capture the complete original bill clearly and try again.';
        setErrorMsg(msg);
        setClaimResult(result);
      } else {
        // 4. Generating your reward...
        setScanStep({ status: 'reward', progress: 1.0, message: 'Generating your reward...' });

        const isBigBill = result.category === 'BIG_BILL_REWARD' || !!result.couponUnlocked;

        // Normalize response object for display
        const normalizedResult = {
          success: true,
          status: 'approved',
          isBigBill,
          category: result.category,
          message: result.message,
          newStreak: result.newStreak,
          claim: {
            restaurant: result.extracted?.restaurant || result.bill?.restaurant_name || "Dasari Darbar",
            billNumber: result.extracted?.billNumber || result.bill?.bill_number,
            billDate: result.extracted?.billDate || result.bill?.bill_date,
            originalAmount: result.extracted?.billAmount || result.bill?.bill_amount
          },
          rewardUnlocked: result.rewardUnlocked ? {
            rewardType: result.rewardUnlocked.reward_name || result.rewardUnlocked.rewardType,
            rewardName: result.rewardUnlocked.reward_name || result.rewardUnlocked.rewardName,
            code: result.rewardUnlocked.reward_code || result.rewardUnlocked.code
          } : null,
          couponGenerated: result.couponUnlocked ? {
            discountPercent: result.couponUnlocked.discount_percent || 10,
            maxDiscount: result.couponUnlocked.max_discount || 300,
            code: result.couponUnlocked.coupon_code || result.couponUnlocked.code,
            counterNotice: result.couponUnlocked.counter_verification_notice || 'Please show your original ₹2,000+ bill at the counter to redeem this offer.'
          } : null
        };

        // Sync local cache
        if (customer?.id) {
          const custAccount = loyaltyEngine.getCustomerAccount(customer.id);
          if (custAccount && typeof result.newStreak === 'number' && !isBigBill) {
            custAccount.track1Streak = result.newStreak;
            loyaltyEngine.saveCustomerAccount(custAccount);
          }
          if (normalizedResult.rewardUnlocked) {
            const allRewards = loyaltyEngine.getRewards();
            allRewards.unshift({
              id: 'rew_' + Date.now(),
              customerId: customer.id,
              rewardName: normalizedResult.rewardUnlocked.rewardName,
              code: normalizedResult.rewardUnlocked.code,
              status: 'AVAILABLE',
              createdAt: new Date().toISOString()
            });
            loyaltyEngine.saveRewards(allRewards);
          }
          if (normalizedResult.couponGenerated) {
            const allCoupons = loyaltyEngine.getCoupons();
            allCoupons.unshift({
              id: 'coup_' + Date.now(),
              customerId: customer.id,
              code: normalizedResult.couponGenerated.code,
              discountPercent: normalizedResult.couponGenerated.discountPercent,
              maxDiscount: normalizedResult.couponGenerated.maxDiscount,
              status: 'AVAILABLE',
              counterNotice: normalizedResult.couponGenerated.counterNotice,
              createdAt: new Date().toISOString()
            });
            loyaltyEngine.saveCoupons(allCoupons);
          }
        }

        setClaimResult(normalizedResult);
        if (onClaimSuccess) onClaimSuccess(normalizedResult);
      }
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      console.error('Scan error:', err);
      setErrorMsg('Error processing bill: ' + err.message);
    } finally {
      setIsScanning(false);
      setScanStep(null);
    }
  };


  return (
    <div style={{
      background: 'linear-gradient(155deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(228, 196, 125, 0.35)',
      borderRadius: '24px',
      padding: '28px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(12px)',
      color: '#FFF',
      marginBottom: '32px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: 'rgba(228, 196, 125, 0.2)',
              color: 'var(--gold-green)',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.1em'
            }}>
              DIRECT BILL SCANNER
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              • Powered by OCR
            </span>
          </div>
          <h2 style={{ fontSize: '24px', color: '#FFF', margin: '6px 0 2px', fontWeight: '800' }}>
            Scan Your Dasari Darbar Bill
          </h2>
          <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            Take a photo or upload your dining bill. Our OCR engine verifies the total and automatically records your visit or discount.
          </p>
        </div>

        {/* Claiming User Indicator */}
        <div style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '8px 14px',
          borderRadius: '12px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--bright-green)',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: '13px'
          }}>
            {customer?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--gold-green)', fontWeight: '700' }}>LOGGED IN AS</div>
            <div style={{ fontWeight: '800', color: '#FFF' }}>{customer?.name || 'Customer'}</div>
          </div>
        </div>
      </div>

      {/* Result Card (When Claim Processed) */}
      {claimResult && claimResult.success && (
        <div style={{
          background: claimResult.isBigBill 
            ? 'linear-gradient(135deg, rgba(165,38,42,0.3) 0%, rgba(6,69,45,0.45) 100%)'
            : (claimResult.status === 'pending_review' ? 'rgba(255, 179, 0, 0.15)' : 'rgba(46, 125, 50, 0.2)'),
          border: claimResult.isBigBill 
            ? '1px solid var(--gold-green)' 
            : (claimResult.status === 'pending_review' ? '1px solid rgba(255, 179, 0, 0.4)' : '1px solid rgba(76, 175, 80, 0.4)'),
          borderRadius: '18px',
          padding: '22px',
          marginBottom: '22px'
        }}>
          {claimResult.isBigBill ? (
            /* Section 11 & 12: High-Value Bill Verified Banner */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-green)', fontSize: '11px', fontWeight: '900', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
                <Sparkles size={16} /> ₹2,000+ HIGH-VALUE BILL
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#FFF', margin: '0 0 6px 0' }}>
                High-Value Bill Verified
              </h3>
              <p style={{ fontSize: '15px', color: '#FFF', margin: '0 0 4px 0', fontWeight: '700' }}>
                Your ₹2,000+ bill has been verified successfully.
              </p>
              <p style={{ fontSize: '14px', color: 'var(--gold-green)', margin: '0 0 16px 0', fontWeight: '700' }}>
                Your high-value coupon is now available.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '18px', color: claimResult.status === 'pending_review' ? '#FFE082' : '#A5D6A7' }}>
                {claimResult.status === 'pending_review' ? <Clock size={24} /> : <CheckCircle size={24} />}
                {claimResult.status === 'pending_review' ? 'Bill Queued for Owner Review' : 'Bill Verified & Approved!'}
              </div>
              <p style={{ fontSize: '14px', color: '#FFF', margin: '8px 0 14px', lineHeight: 1.5 }}>
                {claimResult.message}
              </p>
            </div>
          )}

          {/* Details table */}
          <div style={{
            background: 'rgba(0,0,0,0.35)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', display: 'block' }}>RESTAURANT</span>
              <strong>{claimResult.claim?.restaurant || "Dasari Darbar"}</strong>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', display: 'block' }}>BILL #</span>
              <strong style={{ fontFamily: 'monospace', color: 'var(--gold-green)' }}>{claimResult.claim?.billNumber || 'DD-N/A'}</strong>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', display: 'block' }}>BILL DATE</span>
              <strong>{claimResult.claim?.billDate || claimResult.claim?.claimKolkataDate}</strong>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', display: 'block' }}>BILL AMOUNT</span>
              <strong style={{ color: '#81C784', fontSize: '15px' }}>₹{Number(claimResult.claim?.originalAmount || 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* Normal 5/5 Milestone Reward Banner */}
          {claimResult.rewardUnlocked && (
            <div style={{
              background: 'linear-gradient(135deg, #06452D 0%, #032116 100%)',
              border: '1px solid var(--gold-green)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--gold-green)', fontWeight: '800', letterSpacing: '0.1em' }}>
                🎉 5/5 STREAK COMPLETED — REWARD READY!
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFF', margin: '4px 0' }}>
                {claimResult.rewardUnlocked.rewardType} Unlocked
              </div>
              <div style={{ fontSize: '20px', fontFamily: 'monospace', color: '#81C784', fontWeight: '900', letterSpacing: '0.1em' }}>
                {claimResult.rewardUnlocked.code}
              </div>
            </div>
          )}

          {/* ₹2,000+ High-Value Coupon Box per Section 12 */}
          {claimResult.couponGenerated && (
            <div style={{
              background: 'linear-gradient(135deg, #2D0B0D 0%, #170506 100%)',
              border: '1px solid #FF8A80',
              borderRadius: '14px',
              padding: '18px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '11px', color: '#FFCDD2', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                HIGH-VALUE COUPON
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFF', margin: '4px 0' }}>
                {claimResult.couponGenerated.discountPercent}% OFF (Max ₹{claimResult.couponGenerated.maxDiscount})
              </div>
              <div style={{ fontSize: '22px', fontFamily: 'monospace', color: '#FFF', fontWeight: '900', letterSpacing: '0.1em', margin: '6px 0' }}>
                {claimResult.couponGenerated.code}
              </div>

              {/* Section 12: Mandatory Counter Notice */}
              <div style={{
                marginTop: '12px',
                background: 'rgba(255, 193, 7, 0.15)',
                border: '1px solid rgba(255, 193, 7, 0.4)',
                borderLeft: '4px solid #FFC107',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#FFE082',
                fontSize: '13px',
                fontWeight: '700',
                textAlign: 'left',
                lineHeight: 1.4
              }}>
                "Please show your original ₹2,000+ bill at the counter to redeem this offer."
              </div>

              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)', marginTop: '8px', textAlign: 'left' }}>
                Notice: High-value bills receive this instant discount coupon directly and do not increase the normal 5-visit streak.
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#FFF',
              padding: '10px 20px',
              borderRadius: '24px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={15} /> Scan Another Bill
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div style={{
          background: 'rgba(165, 38, 42, 0.25)',
          border: '1px solid rgba(165, 38, 42, 0.6)',
          color: '#FFCDD2',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '13px',
          marginBottom: '18px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Notice:</strong> {errorMsg}
          </div>
        </div>
      )}

      {/* Bill Upload & Scanner Area (Hidden when result is shown) */}
      {!claimResult?.success && (
        <>
          {/* Mobile Camera Input (Requested only when customer chooses Take Photo) */}
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          {/* Standard Gallery / File Upload Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          {/* Camera Permission / Device Fallback Banner per Section 3 */}
          {cameraError && (
            <div style={{
              background: 'rgba(255, 152, 0, 0.2)',
              border: '1px solid rgba(255, 152, 0, 0.5)',
              color: '#FFE082',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Camera Notice:</strong> {cameraError}
              </div>
            </div>
          )}

          {!selectedImage ? (
            /* Dual Input Capture / Upload Box per Section 3 & 20 */
            <div
              style={{
                border: '2px dashed rgba(228, 196, 125, 0.5)',
                borderRadius: '18px',
                padding: '32px 20px',
                textAlign: 'center',
                background: 'rgba(0,0,0,0.22)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                marginBottom: '18px'
              }}
            >
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(228, 196, 125, 0.15)',
                border: '1px solid var(--gold-green)',
                color: 'var(--gold-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Camera size={32} />
              </div>

              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFF' }}>
                  Capture or Upload Dining Bill
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', maxWidth: '380px', margin: '4px auto 0' }}>
                  Take a live photo of your physical receipt or upload an image from your device gallery.
                </div>
              </div>

              {/* Dual Action Buttons: Camera and Gallery */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleTriggerCamera}
                  style={{
                    background: 'var(--bright-green)',
                    color: '#FFF',
                    border: 'none',
                    padding: '11px 22px',
                    borderRadius: '30px',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(11, 91, 59, 0.4)'
                  }}
                >
                  <Camera size={16} /> Take Photo
                </button>

                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#FFF',
                    padding: '11px 22px',
                    borderRadius: '30px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Upload size={16} /> Upload from Gallery
                </button>
              </div>

              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
                Supports JPG, PNG, WEBP • Max 15MB
              </div>
            </div>
          ) : (
            /* Selected Receipt Preview Box with Retake/Change Options */
            <div style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '18px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img
                  src={selectedImage}
                  alt="Receipt Preview"
                  style={{
                    width: '80px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '10px',
                    border: '1px solid rgba(228, 196, 125, 0.4)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                  }}
                />
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gold-green)', fontWeight: '800', letterSpacing: '0.05em' }}>
                    RECEIPT LOADED
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#FFF', margin: '2px 0' }}>
                    {imageFileName || 'Physical Bill Photo'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                    Ready for OCR processing and loyalty validation.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleTriggerCamera}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#FFF',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Camera size={13} /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#FFF',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Upload size={13} /> Change File
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    background: 'rgba(165,38,42,0.2)',
                    border: '1px solid rgba(165,38,42,0.4)',
                    color: '#FFCDD2',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* OCR Scanning Progress Bar */}
          {isScanning && (
            <div style={{
              background: 'rgba(6, 69, 45, 0.4)',
              border: '1px solid var(--gold-green)',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '18px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--gold-green)', fontWeight: '800', fontSize: '14px' }}>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {scanStep?.message || 'Reading Dasari Darbar bill with OCR...'}
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', marginTop: '12px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.round((scanStep?.progress || 0.45) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #E4C47D, #81C784)',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={handleScanAndClaim}
              disabled={!selectedImage || isScanning}
              className="btn-primary"
              style={{
                padding: '14px 28px',
                borderRadius: '30px',
                fontSize: '15px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(165, 38, 42, 0.4)',
                opacity: (!selectedImage || isScanning) ? 0.6 : 1,
                cursor: (!selectedImage || isScanning) ? 'not-allowed' : 'pointer'
              }}
            >
              <Camera size={18} />
              {isScanning ? 'ANALYZING BILL OCR...' : 'SCAN & CLAIM BILL NOW'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
