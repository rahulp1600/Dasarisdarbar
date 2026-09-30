import React, { useState, useEffect } from 'react';
import { 
  Award, Gift, Sparkles, AlertCircle, Clock, Copy, 
  CheckCircle, ArrowRight, ShieldCheck, FileText, Camera, 
  LogOut, RefreshCw, Check, Percent, Utensils, ChevronDown
} from 'lucide-react';
import loyaltyEngine from '../services/loyaltyEngine';
import { localStoreManager } from '../services/store';
import { supabase } from '../services/supabase';
import CustomerAuth from '../components/CustomerAuth';
import BillUploadScanner from '../components/BillUploadScanner';

export default function Loyalty() {
  const currentCustomer = localStoreManager.getCurrentCustomer();
  const [activeCustomerId, setActiveCustomerId] = useState(currentCustomer?.id || null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  // Sync Supabase Auth session (handles Google OAuth redirect return seamlessly)
  useEffect(() => {
    if (!supabase) return;

    const handleUserSession = (user) => {
      if (!user) return;
      const customerObj = {
        id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Valued Guest',
        email: user.email || '',
        phone: user.user_metadata?.phone || user.phone || '',
        photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
      };
      localStoreManager.loginCustomerWithGoogle(customerObj);
      setActiveCustomerId(user.id);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUserSession(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        handleUserSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        localStoreManager.logoutCustomer();
        setActiveCustomerId(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const customer = activeCustomerId ? loyaltyEngine.getCustomerAccount(activeCustomerId) : null;
  const config = loyaltyEngine.getConfig();

  // Pull customer claims and rewards
  const customerClaims = customer 
    ? loyaltyEngine.getClaims().filter(c => c.customerId === customer.id) 
    : [];
  const customerRewards = customer 
    ? loyaltyEngine.getRewards().filter(r => r.customerId === customer.id) 
    : [];
  const customerCoupons = customer 
    ? loyaltyEngine.getCoupons().filter(c => c.customerId === customer.id) 
    : [];

  const streak = Number(customer?.track1Streak || 0);

  // Check if customer has reached 5/5 milestone and has an active unredeemed reward
  const milestoneReward = customerRewards.find(r => r.status === 'ACTIVE' || r.status === 'AVAILABLE');

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2200);
  };

  const handleLogout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signout:', e.message);
      }
    }
    localStoreManager.logoutCustomer();
    setActiveCustomerId(null);
    refresh();
  };

  const handleClaimSuccess = () => {
    refresh();
  };

  // ---------------------------------------------------------------------------
  // VIEW 1: AUTH GATE (When not logged in)
  // ---------------------------------------------------------------------------
  if (!customer) {
    return (
      <div className="section-dark" style={{ minHeight: '85vh', paddingTop: '40px', paddingBottom: '90px', paddingLeft: '16px', paddingRight: '16px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--gold-green)', fontWeight: '800', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
            DASARI'S REWARDS
          </div>
          <h1 style={{ fontSize: '28px', color: '#FFF', fontWeight: '800', margin: '0 0 6px 0', lineHeight: 1.2 }}>
            EVERY VISIT LEAVES A MARK.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: '0 0 24px 0' }}>
            Your loyalty, beautifully tracked.
          </p>

          <CustomerAuth onLoginSuccess={(loggedInUser) => {
            setActiveCustomerId(loggedInUser.id);
            refresh();
          }} />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW 2: LOGGED-IN CUSTOMER LOYALTY (Mobile-First Layout per Spec Section 27)
  // ---------------------------------------------------------------------------
  return (
    <div className="section-dark" style={{ minHeight: '90vh', paddingTop: '28px', paddingBottom: '90px', paddingLeft: '16px', paddingRight: '16px' }}>
      <div style={{ maxWidth: '580px', margin: '0 auto' }}>

        {/* 1. BRAND HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'var(--gold-green)', fontWeight: '900', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
            DASARI'S REWARDS
          </div>
          <h1 style={{ fontSize: '26px', color: '#FFF', fontWeight: '900', margin: '0 0 6px 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            EVERY VISIT LEAVES A MARK.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', margin: 0 }}>
            Your loyalty, beautifully tracked.
          </p>
        </div>

        {/* 2. VISIT REWARDS (< ₹2,000) */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(6, 69, 45, 0.45) 0%, rgba(3, 33, 22, 0.6) 100%)',
          border: '1px solid rgba(228, 196, 125, 0.4)',
          borderRadius: '20px',
          padding: '22px 20px',
          marginBottom: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(228, 196, 125, 0.2)', color: 'var(--gold-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={18} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--gold-green)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                VISIT REWARDS
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
              Bill total &lt; ₹2,000
            </span>
          </div>

          <div style={{ textAlign: 'center', margin: '10px 0 16px 0' }}>
            <div style={{ fontSize: '38px', fontWeight: '900', color: '#FFF', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {streak} <span style={{ fontSize: '24px', color: 'var(--gold-green)' }}>/ 5</span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '800', letterSpacing: '0.15em', marginTop: '4px', textTransform: 'uppercase' }}>
              QUALIFYING VISITS
            </div>
          </div>

          {/* 5-Segment Progress Bar */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {[1, 2, 3, 4, 5].map((step) => {
              const isFilled = streak >= step;
              return (
                <div 
                  key={step}
                  style={{
                    flex: 1,
                    height: '8px',
                    borderRadius: '4px',
                    background: isFilled 
                      ? 'linear-gradient(90deg, #E4C47D, #81C784)' 
                      : 'rgba(255,255,255,0.15)',
                    boxShadow: isFilled ? '0 0 10px rgba(129, 199, 132, 0.5)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            <span>Next milestone:</span>
            <strong style={{ color: 'var(--gold-green)' }}>
              {streak === 5 ? 'Milestone achieved!' : '5 verified visits'}
            </strong>
          </div>

          {/* 5/5 REWARD UNLOCK EXPERIENCE (Section 28) */}
          {streak === 5 && milestoneReward && (
            <div style={{
              marginTop: '18px',
              background: 'linear-gradient(135deg, rgba(228, 196, 125, 0.25) 0%, rgba(6, 69, 45, 0.8) 100%)',
              border: '1.5px solid var(--gold-green)',
              borderRadius: '16px',
              padding: '18px 16px',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(228, 196, 125, 0.2)'
            }}>
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>🎉 REWARD UNLOCKED</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', marginBottom: '8px' }}>
                You've completed 5 verified visits!
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gold-green)', fontWeight: '800', letterSpacing: '0.1em' }}>
                YOUR REWARD:
              </div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#FFF', margin: '4px 0 12px 0' }}>
                {milestoneReward.rewardName}
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px dashed var(--gold-green)',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>Reward Code:</span>
                <span style={{ fontSize: '17px', fontWeight: '900', color: 'var(--gold-green)', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                  {milestoneReward.code}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(milestoneReward.code)}
                  style={{
                    background: 'rgba(228, 196, 125, 0.2)',
                    border: '1px solid var(--gold-green)',
                    color: '#FFF',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedCode === milestoneReward.code ? <Check size={12} color="#81C784" /> : <Copy size={12} />}
                  {copiedCode === milestoneReward.code ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginTop: '10px' }}>
                Present code to staff at billing. Streak resets to 0/5 upon redemption.
              </div>
            </div>
          )}
        </div>

        {/* 3. BIG BILL REWARDS (≥ ₹2,000) */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(165, 38, 42, 0.25) 0%, rgba(60, 10, 15, 0.4) 100%)',
          border: '1px solid rgba(255, 138, 128, 0.35)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 138, 128, 0.2)', color: '#FF8A80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Percent size={18} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '900', color: '#FFCDD2', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                BIG BILL REWARDS
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
              Bill total ≥ ₹2,000
            </span>
          </div>

          <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.85)', margin: '4px 0 12px 0', lineHeight: 1.4 }}>
            Bills of ₹2,000 or more unlock an instant <strong>{config.track2DiscountPercent}% OFF</strong> dining coupon (Max ₹{config.track2MaxDiscount}).
          </p>

          {/* Active Big Bill Coupons if any */}
          {customerCoupons.filter(c => c.status === 'AVAILABLE').length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {customerCoupons.filter(c => c.status === 'AVAILABLE').map(coupon => (
                <div 
                  key={coupon.id}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255, 138, 128, 0.4)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#FFF' }}>
                      {coupon.discountPercent}% OFF (Max ₹{coupon.maxDiscount})
                    </div>
                    <div style={{ fontSize: '11px', color: '#FFCDD2' }}>
                      Code: <code style={{ fontWeight: '800', fontSize: '12px' }}>{coupon.code}</code> • Expires {coupon.expiryDate}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(coupon.code)}
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#FFF',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedCode === coupon.code ? <Check size={12} color="#81C784" /> : <Copy size={12} />}
                    {copiedCode === coupon.code ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
              ℹ Spend ₹2,000+ on a single bill to unlock your instant coupon code here.
            </div>
          )}
        </div>

        {/* 4. VERIFY YOUR VISIT (Upload your Dasari Darbar bill) */}
        <div style={{
          background: 'linear-gradient(155deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(228, 196, 125, 0.35)',
          borderRadius: '20px',
          padding: '22px 20px',
          marginBottom: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold-green)', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              VERIFY YOUR VISIT
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#FFF', margin: '4px 0 2px 0' }}>
              Upload your Dasari Darbar bill.
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              Automatic OCR extracts your receipt. No manual entry needed.
            </p>
          </div>

          {/* Integrated Tesseract OCR scanner */}
          <BillUploadScanner
            customer={customer}
            onClaimSuccess={handleClaimSuccess}
          />
        </div>

        {/* 5. RECENT ACTIVITY */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold-green)', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              RECENT ACTIVITY
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              {customerClaims.length} Claim{customerClaims.length === 1 ? '' : 's'}
            </span>
          </div>

          {customerClaims.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              No bills submitted yet. Scan your first dining receipt above!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {customerClaims.slice(0, 5).map(claim => {
                const isApproved = claim.status === 'approved';
                const isPending = claim.status === 'pending_review';
                const isRejected = claim.status === 'rejected';

                return (
                  <div
                    key={claim.id}
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#FFF' }}>
                        Bill #{claim.billNumber || 'Under Review'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
                        ₹{Number(claim.originalAmount || 0).toLocaleString('en-IN')} • {claim.category}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                        {claim.claimKolkataDate || claim.submittedAt?.split('T')[0]}
                      </div>
                    </div>

                    <div>
                      {isApproved && (
                        <span style={{
                          background: 'rgba(46, 125, 50, 0.25)',
                          color: '#81C784',
                          border: '1px solid rgba(46, 125, 50, 0.5)',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '800',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <CheckCircle size={12} /> Verified
                        </span>
                      )}
                      {isPending && (
                        <span style={{
                          background: 'rgba(255, 152, 0, 0.2)',
                          color: '#FFB74D',
                          border: '1px solid rgba(255, 152, 0, 0.4)',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '800',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Clock size={12} /> Pending Review
                        </span>
                      )}
                      {isRejected && (
                        <span style={{
                          background: 'rgba(198, 40, 40, 0.2)',
                          color: '#EF9A9A',
                          border: '1px solid rgba(198, 40, 40, 0.4)',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '800'
                        }}>
                          ✕ Rejected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. REWARDS (Customer Vault) */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold-green)', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              REWARDS
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              Assigned Rewards & Discounts
            </span>
          </div>

          {customerRewards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              Complete 5 qualifying visits to earn a randomly selected reward from our offers pool!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {customerRewards.map(reward => {
                const isActive = reward.status === 'ACTIVE' || reward.status === 'AVAILABLE';
                return (
                  <div
                    key={reward.id}
                    style={{
                      background: isActive ? 'rgba(6, 69, 45, 0.35)' : 'rgba(0,0,0,0.25)',
                      border: isActive ? '1px solid var(--gold-green)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#FFF' }}>
                        {reward.rewardName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: '2px 0 4px 0' }}>
                        {reward.rewardDescription || 'Visit Reward milestone benefit'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gold-green)', fontFamily: 'monospace', fontWeight: '800' }}>
                        Code: {reward.code}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isActive ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(reward.code)}
                            style={{
                              background: 'rgba(228, 196, 125, 0.2)',
                              border: '1px solid var(--gold-green)',
                              color: '#FFF',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {copiedCode === reward.code ? <Check size={12} color="#81C784" /> : <Copy size={12} />}
                            {copiedCode === reward.code ? 'Copied' : 'Copy Code'}
                          </button>
                          <span style={{ background: '#2E7D32', color: '#FFF', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '800' }}>
                            ACTIVE
                          </span>
                        </>
                      ) : (
                        <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700' }}>
                          {reward.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6.5. HIGH-VALUE COUPONS (₹2,000+ BILLS) per Sections 10, 11, 12 */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold-green)', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              HIGH-VALUE COUPONS (₹2,000+ BILLS)
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              {customerCoupons.length} Coupon{customerCoupons.length === 1 ? '' : 's'}
            </span>
          </div>

          {customerCoupons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              Upload any dining bill of ₹2,000 or more to instantly unlock a 10% high-value coupon!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {customerCoupons.map(coupon => {
                const isActive = coupon.status === 'AVAILABLE' || coupon.status === 'available' || coupon.status === 'ACTIVE';
                return (
                  <div
                    key={coupon.id}
                    style={{
                      background: isActive ? 'linear-gradient(135deg, rgba(165,38,42,0.25) 0%, rgba(6,69,45,0.3) 100%)' : 'rgba(0,0,0,0.25)',
                      border: isActive ? '1px solid var(--gold-green)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--gold-green)', fontWeight: '800', letterSpacing: '0.05em' }}>
                          HIGH-VALUE COUPON
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: '800', color: '#FFF' }}>
                          {coupon.discountPercent || 10}% OFF (Max ₹{coupon.maxDiscount || 300})
                        </div>
                        <div style={{ fontSize: '14px', color: '#81C784', fontFamily: 'monospace', fontWeight: '900', letterSpacing: '0.08em', marginTop: '2px' }}>
                          Code: {coupon.code || coupon.coupon_code}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isActive ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(coupon.code || coupon.coupon_code)}
                              style={{
                                background: 'rgba(228, 196, 125, 0.2)',
                                border: '1px solid var(--gold-green)',
                                color: '#FFF',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {copiedCode === (coupon.code || coupon.coupon_code) ? <Check size={12} color="#81C784" /> : <Copy size={12} />}
                              {copiedCode === (coupon.code || coupon.coupon_code) ? 'Copied' : 'Copy Code'}
                            </button>
                            <span style={{ background: '#2E7D32', color: '#FFF', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '800' }}>
                              AVAILABLE
                            </span>
                          </>
                        ) : (
                          <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700' }}>
                            {coupon.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Section 12 Mandatory Notice on Coupon Screen */}
                    {isActive && (
                      <div style={{
                        background: 'rgba(255, 193, 7, 0.12)',
                        border: '1px solid rgba(255, 193, 7, 0.35)',
                        borderLeft: '3px solid #FFC107',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        color: '#FFE082',
                        fontWeight: '700',
                        lineHeight: 1.4
                      }}>
                        "Please show your original ₹2,000+ bill at the counter to redeem this offer."
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 7. ACCOUNT */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--gold-green)', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>
              ACCOUNT
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#FFF' }}>
              {customer.name}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
              {customer.email || customer.phone || 'customer@example.com'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'rgba(165,38,42,0.25)',
              border: '1px solid rgba(165,38,42,0.6)',
              color: '#FFCDD2',
              padding: '9px 18px',
              borderRadius: '24px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
