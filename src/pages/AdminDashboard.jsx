import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, CheckCircle, XCircle, Search, Save, 
  Utensils, Award, Calendar, Users, RefreshCw, ExternalLink, 
  Download, Database, Gift, Clock, FileText, Tag, Ticket, 
  ShieldAlert, Check, X, ArrowRight, Settings, Camera, Upload, Image,
  ZoomIn, ZoomOut, RotateCw, Eye, EyeOff, Maximize2
} from 'lucide-react';
import { dataStore, localStoreManager } from '../services/store';
import loyaltyEngine from '../services/loyaltyEngine';
import adminAuth from '../services/adminAuth';
import backendApi from '../services/backendApi';

export default function AdminDashboard({ activeTab: propActiveTab, setActiveTab: propSetActiveTab, onExit }) {
  const [internalTab, setInternalTab] = useState('menu');
  const activeTab = propActiveTab || internalTab;
  const setActiveTab = propSetActiveTab || setInternalTab;

  const TABS = ['menu', 'claims', 'redemptions', 'offers', 'customers', 'bookings', 'settings'];

  // Swipe gesture detection state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 45;

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    if (Math.abs(distanceX) > Math.abs(distanceY) * 1.2 && Math.abs(distanceX) > minSwipeDistance) {
      const isLeftSwipe = distanceX > 0;
      const currentIndex = TABS.indexOf(activeTab);
      if (isLeftSwipe) {
        if (currentIndex < TABS.length - 1) setActiveTab(TABS[currentIndex + 1]);
      } else {
        if (currentIndex > 0) setActiveTab(TABS[currentIndex - 1]);
      }
    }
  };

  useEffect(() => {
    const activeBtn = document.querySelector('.admin-nav-btn.active');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  // --- STATE STORES ---
  const [menuItems, setMenuItems] = useState(dataStore.getMenuItems());
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ category: 'starters', name: '', description: '', price: '', tag: '', is_veg: false, is_available: true, image: null });

  const [bookings, setBookings] = useState(dataStore.getBookings());
  const [offers, setOffers] = useState(loyaltyEngine.getOffers());

  // Offers Management Modal State (Rule 7 & 31)
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerFormData, setOfferFormData] = useState({ 
    id: null, 
    name: '', 
    type: 'percentage_discount', 
    discount_percent: 10, 
    max_discount: 300, 
    description: '', 
    expiry_days: 30, 
    is_active: true 
  });

  // Admin Credentials & Settings State (Rule 33)
  const [adminUser, setAdminUser] = useState(adminAuth.getCurrentUsername());
  const [adminCredsForm, setAdminCredsForm] = useState({
    currentPassword: '',
    newUsername: adminAuth.getCurrentUsername(),
    newPassword: '',
    confirmPassword: ''
  });
  const [adminCredsStatus, setAdminCredsStatus] = useState({ type: '', message: '' });

  // Customer Bill Receipt Lightbox State
  const [viewingBillClaim, setViewingBillClaim] = useState(null);
  const [billZoom, setBillZoom] = useState(1);
  const [billRotation, setBillRotation] = useState(0);

  // Loyalty Engine State
  const [claims, setClaims] = useState(loyaltyEngine.getClaims());
  const [rewards, setRewards] = useState(loyaltyEngine.getRewards());
  const [coupons, setCoupons] = useState(loyaltyEngine.getCoupons());
  const [loyaltyConfig, setLoyaltyConfig] = useState(loyaltyEngine.getConfig());
  const [customersList, setCustomersList] = useState(loyaltyEngine.getAllCustomers());

  // Daily Bill Sequence State (Spec Sections 7 & 8)
  const [dailySequenceDate, setDailySequenceDate] = useState(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  });
  const [firstBillNumberInput, setFirstBillNumberInput] = useState('');
  const [dailySeqData, setDailySeqData] = useState(null);
  const [dailySeqWarning, setDailySeqWarning] = useState(null);
  const [dailySeqStatus, setDailySeqStatus] = useState({ type: '', message: '' });
  const [dailySeqLoading, setDailySeqLoading] = useState(false);
  const [seqConfirmDialog, setSeqConfirmDialog] = useState(null);

  const loadDailySequence = async (dateStr) => {
    setDailySeqLoading(true);
    const targetDate = dateStr || dailySequenceDate;
    const res = await backendApi.getDailySequence(targetDate);
    setDailySeqLoading(false);
    if (res && res.success) {
      setDailySeqData(res);
      setDailySeqWarning(res.warning);
      if (res.firstBillNumber) {
        setFirstBillNumberInput(String(res.firstBillNumber));
      }
    } else {
      setDailySeqWarning("Today's bill sequence is not set.");
    }
  };

  useEffect(() => {
    loadDailySequence();
  }, [dailySequenceDate]);

  const handleSaveDailySequence = async (e, confirmOverride = false) => {
    if (e) e.preventDefault();
    setDailySeqStatus({ type: '', message: '' });

    const num = parseInt(firstBillNumberInput, 10);
    if (isNaN(num) || num <= 0) {
      setDailySeqStatus({ type: 'error', message: 'Please enter a valid positive number for today\'s first bill.' });
      return;
    }

    const res = await backendApi.setDailySequence({
      businessDate: dailySequenceDate,
      firstBillNumber: num,
      adminUser,
      confirmOverride
    });

    if (res.requiresConfirmation && !confirmOverride) {
      setSeqConfirmDialog({
        billsCount: res.billsCount,
        message: res.message
      });
      return;
    }

    setSeqConfirmDialog(null);
    if (res.success) {
      setDailySeqStatus({ type: 'success', message: res.message });
      setDailySeqWarning(null);
      loadDailySequence();
    } else {
      setDailySeqStatus({ type: 'error', message: res.message || 'Failed to save daily bill sequence.' });
    }
  };

  // Redemption Desk State
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [redemptionResult, setRedemptionResult] = useState(null);
  const [staffNotesInput, setStaffNotesInput] = useState('');
  const [verifiedPhysicalBillCheckbox, setVerifiedPhysicalBillCheckbox] = useState(false);

  // Search terms
  const [claimsSearch, setClaimsSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Refresh loyalty helper
  const refreshLoyalty = () => {
    setClaims(loyaltyEngine.getClaims());
    setRewards(loyaltyEngine.getRewards());
    setCoupons(loyaltyEngine.getCoupons());
    setCustomersList(loyaltyEngine.getAllCustomers());
    loadDailySequence();
  };


  // --- HANDLERS FOR MENU ---
  const handleToggleAvailable = (id) => {
    const updated = menuItems.map(item => item.id === id ? { ...item, is_available: !item.is_available } : item);
    setMenuItems(updated);
    dataStore.saveMenuItems(updated);
  };

  const handleDeleteItem = (id) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      const updated = menuItems.filter(item => item.id !== id);
      setMenuItems(updated);
      dataStore.saveMenuItems(updated);
    }
  };

  const handleResetMenu = () => {
    if (window.confirm('Restore complete master menu with all 160+ dishes? Custom edits will be reset to default.')) {
      const restored = dataStore.resetMenuItems();
      setMenuItems(restored);
      alert('Master Menu restored successfully with all dishes!');
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name) return;

    const itemToAdd = {
      id: String(Date.now()),
      ...newItem,
      price: newItem.price ? Number(newItem.price) : null,
      sort_order: menuItems.length + 1
    };

    const updated = [...menuItems, itemToAdd];
    setMenuItems(updated);
    dataStore.saveMenuItems(updated);
    setNewItem({ category: 'starters', name: '', description: '', price: '', tag: '', is_veg: false, is_available: true, image: null });
    alert('Menu item added successfully!');
  };

  const handleUploadDishPhoto = (itemId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const updated = menuItems.map(item => item.id === itemId ? { ...item, image: reader.result } : item);
      setMenuItems(updated);
      dataStore.saveMenuItems(updated);
    };
    reader.readAsDataURL(file);
  };

  // --- HANDLERS FOR BOOKINGS ---
  const handleBookingStatus = (id, newStatus) => {
    const updated = bookings.map(b => b.id === id ? { ...b, status: newStatus } : b);
    setBookings(updated);
    dataStore.saveBookings(updated);
  };

  // --- HANDLERS FOR LOYALTY OFFERS (Rule 7 & 31) ---
  const handleToggleOffer = (id) => {
    const updated = loyaltyEngine.toggleOfferActive(id);
    setOffers(updated);
  };

  const handleOpenAddOffer = () => {
    setOfferFormData({
      id: null,
      name: '',
      type: 'percentage_discount',
      discount_percent: 10,
      max_discount: 300,
      description: '',
      expiry_days: 30,
      is_active: true
    });
    setIsOfferModalOpen(true);
  };

  const handleOpenEditOffer = (offer) => {
    setOfferFormData({
      id: offer.id,
      name: offer.name || offer.title || '',
      type: offer.type || (offer.discount_type === 'percent' ? 'percentage_discount' : 'free_item'),
      discount_percent: offer.discount_percent || 10,
      max_discount: offer.max_discount || 300,
      description: offer.description || '',
      expiry_days: offer.expiry_days || 30,
      is_active: offer.is_active !== undefined ? offer.is_active : (offer.active !== undefined ? offer.active : true)
    });
    setIsOfferModalOpen(true);
  };

  const handleSaveOffer = (e) => {
    e.preventDefault();
    if (!offerFormData.name.trim()) {
      alert('Please enter an offer name.');
      return;
    }

    if (offerFormData.id) {
      const updated = loyaltyEngine.updateOffer(offerFormData.id, {
        name: offerFormData.name.trim(),
        type: offerFormData.type,
        discount_percent: offerFormData.type === 'percentage_discount' ? Number(offerFormData.discount_percent) : null,
        max_discount: offerFormData.type === 'percentage_discount' ? Number(offerFormData.max_discount) : null,
        description: offerFormData.description.trim(),
        expiry_days: Number(offerFormData.expiry_days) || 30,
        is_active: offerFormData.is_active
      });
      setOffers(updated);
    } else {
      loyaltyEngine.addOffer({
        name: offerFormData.name.trim(),
        type: offerFormData.type,
        discount_percent: offerFormData.type === 'percentage_discount' ? Number(offerFormData.discount_percent) : null,
        max_discount: offerFormData.type === 'percentage_discount' ? Number(offerFormData.max_discount) : null,
        description: offerFormData.description.trim(),
        expiry_days: Number(offerFormData.expiry_days) || 30
      });
      setOffers(loyaltyEngine.getOffers());
    }

    setIsOfferModalOpen(false);
  };

  const handleDeleteOffer = (id) => {
    if (window.confirm('Are you sure you want to delete this offer from the active pool?')) {
      const updated = loyaltyEngine.deleteOffer(id);
      setOffers(updated);
    }
  };

  // --- HANDLER FOR ADMIN CREDENTIALS CHANGE (Rule 33) ---
  const handleChangeAdminCredentials = (e) => {
    e.preventDefault();
    setAdminCredsStatus({ type: '', message: '' });

    const result = adminAuth.changeCredentials({
      currentPassword: adminCredsForm.currentPassword,
      newUsername: adminCredsForm.newUsername,
      newPassword: adminCredsForm.newPassword,
      confirmPassword: adminCredsForm.confirmPassword
    });

    if (result.success) {
      setAdminCredsStatus({ type: 'success', message: result.message });
      setAdminUser(adminAuth.getCurrentUsername());
      setAdminCredsForm({
        currentPassword: '',
        newUsername: adminAuth.getCurrentUsername(),
        newPassword: '',
        confirmPassword: ''
      });
    } else {
      setAdminCredsStatus({ type: 'error', message: result.message });
    }
  };

  // --- HANDLERS FOR BILL RECEIPT VIEWER ---
  const handleOpenBillViewer = (claim) => {
    setViewingBillClaim(claim);
    setBillZoom(1);
    setBillRotation(0);
  };

  const handleCloseBillViewer = () => {
    setViewingBillClaim(null);
    setBillZoom(1);
    setBillRotation(0);
  };

  // --- HANDLERS FOR CLAIMS & REVIEWS ---
  const handleApproveClaim = (claimId, originalAmount, billNumber, restaurant) => {
    const res = loyaltyEngine.approvePendingClaim(claimId, { originalAmount, billNumber, restaurant });
    if (!res.success) {
      alert(res.message);
    } else {
      alert('Claim approved! Customer loyalty updated.');
      refreshLoyalty();
    }
  };

  const handleRejectClaim = (claimId) => {
    const reason = window.prompt('Enter rejection reason (e.g. invalid bill, not Dasari Darbar, altered receipt):', 'Not a valid Dasari Darbar receipt');
    if (reason) {
      loyaltyEngine.rejectPendingClaim(claimId, reason);
      alert('Claim rejected.');
      refreshLoyalty();
    }
  };

  // --- HANDLERS FOR REDEMPTION DESK ---
  const handleRedeemVoucher = async (e) => {
    if (e) e.preventDefault();
    setRedemptionResult(null);

    const isHighValue = voucherCodeInput.toUpperCase().includes('BIG');
    if (isHighValue && !verifiedPhysicalBillCheckbox) {
      alert("COUNTER VERIFICATION REQUIRED (Section 12):\nPlease verify the customer's original physical ₹2,000+ bill at the counter and check the confirmation box before redeeming this coupon.");
      return;
    }

    // Call backend API for server validation, Supabase update & audit log
    const serverRes = await backendApi.redeemVoucher({
      voucherCode: voucherCodeInput,
      staffIdentifier: `${staffNotesInput || 'Staff Cashier Desk'}${isHighValue ? ' [Physical Bill Verified at Counter]' : ''}`
    });

    // Also sync local engine state
    const localRes = loyaltyEngine.redeemVoucher(voucherCodeInput, staffNotesInput);
    const finalRes = serverRes.success ? serverRes : (localRes.success ? localRes : serverRes);
    setRedemptionResult(finalRes);

    if (finalRes.success) {
      setVoucherCodeInput('');
      setStaffNotesInput('');
      setVerifiedPhysicalBillCheckbox(false);
      refreshLoyalty();
    }
  };

  const handleQuickRedeem = async (code) => {
    const isHighValue = String(code).toUpperCase().includes('BIG');
    if (isHighValue) {
      const confirmed = window.confirm("COUNTER VERIFICATION REQUIRED (Section 12):\n\nHas the customer shown their original physical ₹2,000+ bill at the counter?\n\nPress OK only if you have physically verified the bill.");
      if (!confirmed) return;
    }

    const serverRes = await backendApi.redeemVoucher({
      voucherCode: code,
      staffIdentifier: `Staff Quick Redeem${isHighValue ? ' [Physical Bill Verified]' : ''}`
    });
    const localRes = loyaltyEngine.redeemVoucher(code, 'Staff Quick Redeem');
    const finalRes = serverRes.success ? serverRes : (localRes.success ? localRes : serverRes);
    setRedemptionResult(finalRes);

    if (finalRes.success) {
      refreshLoyalty();
    }
  };


  // --- HANDLERS FOR CONFIGURATION ---
  const handleSaveConfig = (e) => {
    e.preventDefault();
    loyaltyEngine.saveConfig(loyaltyConfig);
    alert('Loyalty System Configuration saved successfully!');
  };

  // --- BACKUP & RESET ---
  const handleExportData = () => {
    const jsonStr = localStoreManager.exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dasaris-darbar-local-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetAllData = () => {
    if (window.confirm('Reset ALL local experimental data (Menu, Bookings, Claims, Rewards, Streaks) back to fresh defaults?')) {
      localStoreManager.resetAllToDefaults();
      setMenuItems(localStoreManager.getMenuItems());
      setBookings(localStoreManager.getBookings());
      setOffers(localStoreManager.getLoyaltyOffers());
      refreshLoyalty();
      alert('All local data has been successfully reset to default state!');
    }
  };

  const pendingClaims = claims.filter(c => c.status === 'pending_review');

  return (
    <div 
      style={{ background: '#F8F9FA', minHeight: '90vh', paddingBottom: '90px' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Admin Header */}
      <div className="admin-header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--gold-green)', fontWeight: '800', letterSpacing: '0.1em' }}>
                OWNER MANAGEMENT PANEL
              </div>
              <h1 style={{ fontSize: '28px', color: 'var(--white)', margin: '4px 0' }}>
                Dasari's Darbar Admin
              </h1>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', color: 'var(--gold-green)' }}>
                Logged in: <strong>Owner Admin</strong>
              </div>
              {onExit && (
                <button 
                  onClick={onExit}
                  style={{
                    background: 'rgba(228, 196, 125, 0.2)',
                    color: 'var(--gold-white)',
                    border: '1px solid rgba(228, 196, 125, 0.4)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ExternalLink size={14} /> View Site
                </button>
              )}
            </div>
          </div>

          {/* Local Data Store Manager Strip */}
          <div style={{
            marginTop: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            border: '1px solid rgba(228, 196, 125, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFF' }}>
              <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: '#4CAF50', boxShadow: '0 0 8px #4CAF50' }}></span>
              <strong style={{ color: 'var(--gold-green)' }}>Local Store & Loyalty Engine:</strong>
              <span style={{ opacity: 0.85, fontSize: '12px' }}>Offline Mode (Asia/Kolkata Calendar Day Enforced)</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleExportData}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#FFF',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Export all current local test data to JSON"
              >
                <Download size={13} /> Export JSON
              </button>
              <button
                type="button"
                onClick={handleResetAllData}
                style={{
                  background: 'rgba(198, 40, 40, 0.25)',
                  color: '#FFCDD2',
                  border: '1px solid rgba(198, 40, 40, 0.4)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Reset all menu, bookings, claims and rewards to default"
              >
                <RefreshCw size={13} /> Reset All Test Data
              </button>
            </div>
          </div>

          {/* Swipe guide on mobile */}
          <div className="admin-swipe-hint">
            👈 Swipe left / right anywhere on screen to switch tabs 👉
          </div>

          {/* Tab Navigation */}
          <div className="admin-nav">
            <button className={`admin-nav-btn ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>
              <Utensils size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> MENU ({menuItems.length})
            </button>

            <button 
              className={`admin-nav-btn ${activeTab === 'claims' ? 'active' : ''}`} 
              onClick={() => setActiveTab('claims')}
              style={{ position: 'relative' }}
            >
              <FileText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> 
              CLAIMS & REVIEWS
              {pendingClaims.length > 0 && (
                <span style={{
                  marginLeft: '6px',
                  background: '#FF9800',
                  color: '#000',
                  fontSize: '10px',
                  fontWeight: '900',
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {pendingClaims.length}
                </span>
              )}
            </button>

            <button className={`admin-nav-btn ${activeTab === 'redemptions' ? 'active' : ''}`} onClick={() => setActiveTab('redemptions')}>
              <Ticket size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> REDEMPTION DESK
            </button>

            <button className={`admin-nav-btn ${activeTab === 'offers' ? 'active' : ''}`} onClick={() => setActiveTab('offers')}>
              <Gift size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> LOYALTY OFFERS ({offers.length})
            </button>

            <button className={`admin-nav-btn ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
              <Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> CUSTOMERS ({customersList.length})
            </button>

            <button className={`admin-nav-btn ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
              <Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> TABLES ({bookings.length})
            </button>

            <button className={`admin-nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> ADMIN SETTINGS
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '24px' }}>
        
        {/* Sequence Warning Banner per Section 8 */}
        {dailySeqWarning && (
          <div style={{
            background: '#FFF3E0',
            border: '1px solid #FFE082',
            borderLeft: '5px solid #FF9800',
            borderRadius: '8px',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#E65100', fontWeight: '700', fontSize: '14px' }}>
              <ShieldAlert size={20} />
              <span>{dailySeqWarning}</span>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                background: '#FF9800',
                color: '#FFF',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Set Bill Sequence Now
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MENU MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'menu' && (
          <div>
            <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--deep-green)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} /> Add New Dish to Menu
              </h3>
              <form onSubmit={handleAddItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-select" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
                    <option value="starters">Starters & Kebabs</option>
                    <option value="mandi">Mandi</option>
                    <option value="pulavs">Pulavs & Biryani</option>
                    <option value="mains">Main Course</option>
                    <option value="breads">Rotis & Fried Rice</option>
                    <option value="desserts">Desserts & Drinks</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Dish Name</label>
                  <input type="text" className="form-input" placeholder="e.g. Basket Chicken" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} required />
                </div>

                <div>
                  <label className="form-label">Price (₹)</label>
                  <input type="number" className="form-input" placeholder="e.g. 351" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
                </div>

                <div>
                  <label className="form-label">Tag / Highlight</label>
                  <select className="form-select" value={newItem.tag} onChange={(e) => setNewItem({ ...newItem, tag: e.target.value })}>
                    <option value="">No Special Tag</option>
                    <option value="bestseller">Bestseller</option>
                    <option value="must_try">Must Try</option>
                    <option value="popular">Popular</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Dish Photo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {newItem.image ? (
                      <div style={{ position: 'relative', width: '42px', height: '42px', flexShrink: 0 }}>
                        <img 
                          src={newItem.image} 
                          alt="Preview" 
                          style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--gold-green)' }} 
                        />
                        <button
                          type="button"
                          onClick={() => setNewItem({ ...newItem, image: null })}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#C62828', color: '#FFF', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: 'none', cursor: 'pointer' }}
                          title="Remove photo"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label style={{
                        flexGrow: 1,
                        border: '1px dashed #B0BEC5',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: 'var(--muted-grey)',
                        background: '#FAF9F6'
                      }}>
                        <Camera size={16} color="var(--deep-green)" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files && e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => setNewItem({ ...newItem, image: reader.result });
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '28px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                    <input type="checkbox" checked={newItem.is_veg} onChange={(e) => setNewItem({ ...newItem, is_veg: e.target.checked })} />
                    Pure Veg
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                    ADD DISH
                  </button>
                </div>
              </form>
            </div>

            <div style={{ background: 'var(--white)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '18px', color: 'var(--deep-green)' }}>
                  Master Menu ({menuItems.length} Dishes)
                </h3>
                <button 
                  type="button" 
                  onClick={handleResetMenu}
                  style={{
                    background: '#FFF3E0',
                    color: '#E65100',
                    border: '1px solid #FFE0B2',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={14} /> Restore 160+ Master Menu
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Dish Name</th>
                      <th>Price</th>
                      <th>Tag</th>
                      <th>Availability</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item.id} style={{ opacity: item.is_available ? 1 : 0.6 }}>
                        <td>
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #CCC', verticalAlign: 'middle' }} 
                            />
                          ) : (
                            <label 
                              style={{ 
                                width: '38px', 
                                height: '38px', 
                                borderRadius: '6px', 
                                background: '#F5F5F5', 
                                border: '1px dashed #B0BEC5', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                cursor: 'pointer',
                                color: '#888'
                              }}
                              title="Upload Photo for this dish"
                            >
                              <Camera size={16} />
                              <input 
                                type="file" 
                                accept="image/*" 
                                style={{ display: 'none' }} 
                                onChange={(e) => handleUploadDishPhoto(item.id, e.target.files[0])} 
                              />
                            </label>
                          )}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: item.is_veg ? '#2E7D32' : '#C62828'
                          }}></span>
                        </td>
                        <td style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '700', color: 'var(--muted-grey)' }}>
                          {item.category}
                        </td>
                        <td style={{ fontWeight: '700', color: 'var(--ink)' }}>{item.name}</td>
                        <td style={{ fontWeight: '700' }}>{item.price ? `₹${item.price}` : 'On Request'}</td>
                        <td>
                          {item.tag && (
                            <span style={{ background: 'var(--brand-red)', color: '#FFF', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                              {item.tag.toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            style={{
                              background: item.is_available ? '#E8F5E9' : '#FFEBEE',
                              color: item.is_available ? '#2E7D32' : '#C62828',
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleToggleAvailable(item.id)}
                          >
                            {item.is_available ? 'IN STOCK' : 'SOLD OUT'}
                          </button>
                        </td>
                        <td>
                          <button style={{ background: 'none', color: '#C62828', cursor: 'pointer', border: 'none' }} onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CLAIMS & PENDING REVIEWS */}
        {/* ========================================================================= */}
        {activeTab === 'claims' && (
          <div>
            {/* SECTION A: PENDING REVIEWS QUEUE */}
            <div style={{ background: 'var(--white)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FFF3E0', color: '#E65100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', color: 'var(--deep-green)', margin: 0 }}>
                      Pending Bill Reviews Queue ({pendingClaims.length})
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--muted-grey)', margin: '2px 0 0 0' }}>
                      Bills routed here due to OCR uncertainty or missing fields. Inspect and approve or reject.
                    </p>
                  </div>
                </div>
              </div>

              {pendingClaims.length === 0 ? (
                <div style={{ background: '#F9F9F9', border: '1px dashed #CCC', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#777', fontSize: '14px' }}>
                  ✓ No bills currently pending review. All submitted bills are processed!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pendingClaims.map((claim) => (
                    <div 
                      key={claim.id} 
                      style={{ 
                        border: '1px solid #FFE082', 
                        background: '#FFFDE7', 
                        borderRadius: '12px', 
                        padding: '16px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        {claim.imagePreview ? (
                          <div 
                            style={{ 
                              position: 'relative', 
                              width: '70px', 
                              height: '90px', 
                              borderRadius: '6px', 
                              overflow: 'hidden', 
                              border: '1.5px solid var(--deep-green)',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                            onClick={() => handleOpenBillViewer(claim)}
                            title="Click to inspect full receipt photo"
                          >
                            <img 
                              src={claim.imagePreview} 
                              alt="Receipt" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'rgba(6,69,45,0.9)',
                              color: '#FFF',
                              fontSize: '10px',
                              fontWeight: '800',
                              textAlign: 'center',
                              padding: '2px 0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px'
                            }}>
                              <Eye size={10} /> VIEW
                            </div>
                          </div>
                        ) : (
                          <div style={{ width: '70px', height: '90px', background: '#EEE', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={24} color="#888" />
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '11px', color: '#B78103', fontWeight: '800' }}>
                            REASON: {claim.reviewReason}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--deep-green)', margin: '2px 0' }}>
                            Customer: {claim.customerName} ({claim.customerPhone})
                          </div>
                          <div style={{ fontSize: '13px', color: '#444' }}>
                            Bill #{claim.billNumber} • Amount: ₹{claim.originalAmount} • Date: {claim.claimKolkataDate}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--muted-grey)', marginTop: '4px' }}>
                            Fingerprint: <code style={{ fontSize: '11px' }}>{claim.fingerprint}</code>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {claim.imagePreview && (
                          <button
                            type="button"
                            onClick={() => handleOpenBillViewer(claim)}
                            style={{
                              background: '#FFF',
                              color: 'var(--deep-green)',
                              border: '1.5px solid var(--deep-green)',
                              padding: '10px 16px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title="View high-resolution customer bill image"
                          >
                            <Eye size={16} /> VIEW BILL RECEIPT
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleApproveClaim(claim.id, claim.originalAmount, claim.billNumber, claim.restaurant)}
                          style={{
                            background: '#2E7D32',
                            color: '#FFF',
                            border: 'none',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Check size={16} /> APPROVE CLAIM
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectClaim(claim.id)}
                          style={{
                            background: '#C62828',
                            color: '#FFF',
                            border: 'none',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <X size={16} /> REJECT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION B: ALL CLAIMS AUDIT LOG */}
            <div style={{ background: 'var(--white)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '18px', color: 'var(--deep-green)' }}>
                  All Bill Claims Audit Log ({claims.length})
                </h3>

                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '36px', padding: '8px 12px 8px 36px', fontSize: '13px' }}
                    placeholder="Search customer, bill #, track..."
                    value={claimsSearch}
                    onChange={(e) => setClaimsSearch(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date (Kolkata)</th>
                      <th>Customer</th>
                      <th>Bill Number</th>
                      <th>Amount</th>
                      <th>Track</th>
                      <th>Status</th>
                      <th>Bill Receipt</th>
                      <th>Fingerprint (Duplicate Guard)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims
                      .filter(c => 
                        c.customerName?.toLowerCase().includes(claimsSearch.toLowerCase()) ||
                        c.billNumber?.toLowerCase().includes(claimsSearch.toLowerCase()) ||
                        c.track?.toLowerCase().includes(claimsSearch.toLowerCase()) ||
                        c.status?.toLowerCase().includes(claimsSearch.toLowerCase())
                      )
                      .map(c => (
                        <tr key={c.id}>
                          <td>{c.claimKolkataDate || c.billDate}</td>
                          <td style={{ fontWeight: '700' }}>{c.customerName}</td>
                          <td style={{ fontWeight: '800', fontFamily: 'monospace', color: 'var(--bright-green)' }}>{c.billNumber}</td>
                          <td style={{ fontWeight: '700' }}>₹{Number(c.originalAmount).toLocaleString('en-IN')}</td>
                          <td>
                            <span style={{
                              background: c.track === 'track1' ? '#E8F5E9' : '#FFEBEE',
                              color: c.track === 'track1' ? '#1B5E20' : '#B71C1C',
                              padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800'
                            }}>
                              {c.track === 'track1' ? 'Track 1 (< ₹2k)' : 'Track 2 (≥ ₹2k)'}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              color: c.status === 'approved' ? '#2E7D32' : (c.status === 'pending_review' ? '#F57F17' : '#C62828'),
                              fontWeight: '800',
                              fontSize: '12px'
                            }}>
                              {c.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {c.imagePreview ? (
                              <button
                                type="button"
                                onClick={() => handleOpenBillViewer(c)}
                                style={{
                                  background: '#E8F5E9',
                                  color: 'var(--deep-green)',
                                  border: '1px solid #A5D6A7',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}
                                title="Click to inspect uploaded receipt image"
                              >
                                <Eye size={13} /> View Photo
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#999' }}>No Photo</span>
                            )}
                          </td>
                          <td style={{ fontSize: '11px', color: '#888', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.fingerprint}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REDEMPTION DESK */}
        {/* ========================================================================= */}
        {activeTab === 'redemptions' && (
          <div>
            {/* Live Voucher Redemption Form */}
            <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(6, 69, 45, 0.1)', color: 'var(--deep-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ticket size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', color: 'var(--deep-green)', margin: 0 }}>
                    Staff / Cashier Voucher Redemption Desk
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--muted-grey)', margin: '2px 0 0 0' }}>
                    Enter or scan the customer's voucher code (DD-RW-XXXXX for Track 1 or DD-T2-XXXXX for Track 2) to apply.
                  </p>
                </div>
              </div>

              <form onSubmit={handleRedeemVoucher} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="form-label">Voucher / Coupon Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. DD-RW-83921 or DD-BIG-10492"
                    value={voucherCodeInput}
                    onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: '800', letterSpacing: '0.1em' }}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Staff Notes (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Table #04, Cashier verified"
                    value={staffNotesInput}
                    onChange={(e) => setStaffNotesInput(e.target.value)}
                  />
                </div>

                {/* Section 12: High-Value ₹2,000+ Coupon Counter Verification Notice */}
                {voucherCodeInput.includes('BIG') && (
                  <div style={{
                    gridColumn: '1 / -1',
                    background: '#FFF8E1',
                    border: '1px solid #FFE082',
                    borderLeft: '4px solid #FF8F00',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#E65100'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', marginBottom: '6px' }}>
                      <ShieldAlert size={18} />
                      COUNTER VERIFICATION REQUIRED (Section 12)
                    </div>
                    <p style={{ margin: '0 0 10px 0', lineHeight: 1.4 }}>
                      The customer <strong>MUST present their original physical ₹2,000+ bill</strong> at the restaurant counter to redeem this high-value offer.
                    </p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#BF360C' }}>
                      <input
                        type="checkbox"
                        checked={verifiedPhysicalBillCheckbox}
                        onChange={(e) => setVerifiedPhysicalBillCheckbox(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      I have physically inspected and verified the customer's original ₹2,000+ bill.
                    </label>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: voucherCodeInput.includes('BIG') ? '1 / -1' : 'auto' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '14px', fontWeight: '800' }}
                  >
                    VERIFY & REDEEM VOUCHER
                  </button>
                </div>
              </form>

              {/* Live Redemption Result Banner */}
              {redemptionResult && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  borderRadius: '10px',
                  background: redemptionResult.success ? '#E8F5E9' : '#FFEBEE',
                  border: redemptionResult.success ? '1px solid #C8E6C9' : '1px solid #FFCDD2',
                  color: redemptionResult.success ? '#2E7D32' : '#C62828'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '15px' }}>
                    {redemptionResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {redemptionResult.success ? 'Redemption Successful!' : 'Redemption Failed'}
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    {redemptionResult.message}
                  </div>
                </div>
              )}
            </div>

            {/* Issued Vouchers & Coupons List */}
            <div style={{ background: 'var(--white)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '18px', color: 'var(--deep-green)', margin: 0 }}>
                  All Issued Vouchers & Coupons
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--muted-grey)' }}>
                  Total: {rewards.length + coupons.length} vouchers
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Voucher Code</th>
                      <th>Type</th>
                      <th>Customer Name</th>
                      <th>Details</th>
                      <th>Counter Verification</th>
                      <th>Status</th>
                      <th>Expiry</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rewards, ...coupons].map((v) => {
                      const isHighValue = String(v.code).includes('BIG') || !v.rewardType;
                      return (
                        <tr key={v.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: '900', color: isHighValue ? '#C62828' : 'var(--bright-green)', fontSize: '14px' }}>
                            {v.code}
                          </td>
                          <td>
                            <span style={{
                              background: !isHighValue ? '#E8F5E9' : '#FFEBEE',
                              color: !isHighValue ? '#1B5E20' : '#B71C1C',
                              padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800'
                            }}>
                              {!isHighValue ? 'Milestone Reward (5 Visits)' : '₹2,000+ High-Value Coupon'}
                            </span>
                          </td>
                          <td style={{ fontWeight: '700' }}>{v.customerName}</td>
                          <td style={{ fontSize: '12px', color: '#555' }}>
                            {v.rewardType || `${v.discountPercent}% OFF (Max ₹${v.maxDiscount})`}
                          </td>
                          <td>
                            {isHighValue ? (
                              <span style={{ fontSize: '11px', color: '#D84315', fontWeight: '700', background: '#FBE9E7', padding: '2px 6px', borderRadius: '4px' }}>
                                Physical Bill Required
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#2E7D32', fontWeight: '600' }}>
                                Standard Staff Check
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{
                              fontWeight: '800',
                              fontSize: '11px',
                              color: v.status === 'AVAILABLE' ? '#2E7D32' : (v.status === 'REDEEMED' ? '#888' : '#C62828')
                            }}>
                              {v.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px' }}>{v.expiryDate}</td>
                          <td>
                            {v.status === 'AVAILABLE' ? (
                              <button
                                type="button"
                                onClick={() => handleQuickRedeem(v.code)}
                                style={{
                                  background: isHighValue ? '#C62828' : 'var(--deep-green)',
                                  color: '#FFF',
                                  border: 'none',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                Redeem Now
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#AAA' }}>Completed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* TAB 4: LOYALTY OFFERS (ADMIN-MANAGED REWARD POOL - Rules 4, 7, 31) */}
        {/* ========================================================================= */}
        {activeTab === 'offers' && (
          <div>
            {/* Active Dine-In Offers Pool */}
            <div style={{ background: 'var(--white)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(6, 69, 45, 0.1)', color: 'var(--deep-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Gift size={18} />
                    </div>
                    <h3 style={{ fontSize: '18px', color: 'var(--deep-green)', margin: 0 }}>
                      Loyalty Offers Pool ({offers.length})
                    </h3>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted-grey)', margin: '4px 0 0 0' }}>
                    Active reward pool randomly awarded to customers when they reach 5 verified visits.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddOffer}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> ADD NEW OFFER
                </button>
              </div>

              {/* Safety Snapshot Notice per Rule 6 & 32 */}
              <div style={{ background: '#E8F5E9', border: '1px solid #C8E6C9', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', fontSize: '12.5px', color: '#2E7D32' }}>
                🛡️ <strong>Reward History Protection Active:</strong> When customers reach 5/5, an immutable snapshot of the assigned reward is permanently stored. Editing or deactivating offers below will never alter previously issued customer rewards.
              </div>
              
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Offer Name</th>
                    <th>Reward Type & Details</th>
                    <th>Status</th>
                    <th>Reward Usage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map(o => {
                    const usageCount = rewards.filter(r => r.originalOfferId === o.id).length;
                    const isPercentage = o.type === 'percentage_discount';
                    return (
                      <tr key={o.id}>
                        <td style={{ fontWeight: '800', color: 'var(--deep-green)', fontSize: '14px' }}>
                          {o.name || o.title}
                        </td>
                        <td>
                          {isPercentage ? (
                            <span style={{ fontSize: '13px', color: '#444' }}>
                              <strong>{o.discount_percent || 10}% OFF</strong> (Max ₹{o.max_discount || 300})
                            </span>
                          ) : (
                            <span style={{ fontSize: '13px', color: '#444' }}>
                              Free Item: <strong>{o.description || 'Complimentary Item'}</strong>
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            style={{
                              background: (o.is_active ?? o.active) ? '#E8F5E9' : '#FFEBEE',
                              color: (o.is_active ?? o.active) ? '#2E7D32' : '#C62828',
                              border: 'none', 
                              padding: '5px 12px', 
                              borderRadius: '20px', 
                              fontSize: '11px', 
                              fontWeight: '800', 
                              cursor: 'pointer'
                            }}
                            onClick={() => handleToggleOffer(o.id)}
                            title="Click to toggle active / deactivated status"
                          >
                            {(o.is_active ?? o.active) ? 'ACTIVE' : 'DEACTIVATED'}
                          </button>
                        </td>
                        <td>
                          <span style={{ fontWeight: '700', color: '#555', fontSize: '13px' }}>
                            {usageCount} issued
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditOffer(o)}
                              title="Edit Offer"
                              style={{
                                background: '#F0F4F8',
                                border: '1px solid #D0D7DE',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                color: 'var(--deep-green)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleOffer(o.id)}
                              style={{
                                background: (o.is_active ?? o.active) ? '#FFF3E0' : '#E8F5E9',
                                border: (o.is_active ?? o.active) ? '1px solid #FFE0B2' : '1px solid #C8E6C9',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                color: (o.is_active ?? o.active) ? '#E65100' : '#2E7D32',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              {(o.is_active ?? o.active) ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOffer(o.id)}
                              title="Delete Offer"
                              style={{
                                background: '#FFEBEE',
                                border: '1px solid #FFCDD2',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                color: '#C62828',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Big Bill Rewards Configuration */}
            <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(165, 38, 42, 0.1)', color: 'var(--brand-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ticket size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', color: 'var(--deep-green)', margin: 0 }}>
                    Big Bill Rewards Configuration (≥ ₹2,000)
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--muted-grey)', margin: '2px 0 0 0' }}>
                    Configure the instant discount coupon generated when bills reach ₹2,000 or more.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveConfig} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                <div>
                  <label className="form-label">Big Bill Threshold (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={loyaltyConfig.track2Threshold}
                    onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, track2Threshold: Number(e.target.value) })}
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted-grey)' }}>Bills equal or above are Big Bill Rewards (default ₹2,000)</span>
                </div>

                <div>
                  <label className="form-label">Discount Percentage (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={loyaltyConfig.track2DiscountPercent}
                    onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, track2DiscountPercent: Number(e.target.value) })}
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted-grey)' }}>Instant discount percentage (default: 10%)</span>
                </div>

                <div>
                  <label className="form-label">Maximum Discount Cap (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={loyaltyConfig.track2MaxDiscount}
                    onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, track2MaxDiscount: Number(e.target.value) })}
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted-grey)' }}>Max discount limit (default: ₹300)</span>
                </div>

                <div>
                  <label className="form-label">Timezone Enforced</label>
                  <input
                    type="text"
                    className="form-input"
                    value={loyaltyConfig.timezone}
                    disabled
                    style={{ background: '#EEE' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted-grey)' }}>Asia/Kolkata Calendar Day</span>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }}>
                    SAVE BIG BILL CONFIGURATION
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ADMIN SETTINGS (Daily Bill Sequence & Owner Credentials) */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* Confirmation Modal for Overriding Sequence when bills exist */}
            {seqConfirmDialog && (
              <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px'
              }}>
                <div style={{
                  background: '#FFF',
                  borderRadius: '16px',
                  padding: '24px',
                  maxWidth: '440px',
                  width: '100%',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#D84315', marginBottom: '12px' }}>
                    <ShieldAlert size={26} />
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Confirm Sequence Update</h4>
                  </div>
                  <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                    {seqConfirmDialog.message}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSeqConfirmDialog(null)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '8px',
                        border: '1px solid #CCC',
                        background: '#F5F5F5',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSaveDailySequence(e, true)}
                      className="btn-primary"
                      style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '700' }}
                    >
                      Yes, Save Sequence
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CARD 1: DAILY BILL SEQUENCE (Sections 7 & 8) */}
            <div style={{ background: 'var(--white)', borderRadius: '14px', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(6, 69, 45, 0.1)', color: 'var(--deep-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '19px', color: 'var(--deep-green)', margin: 0, fontWeight: '800' }}>
                    Daily Bill Sequence
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--muted-grey)', margin: '2px 0 0 0' }}>
                    Set today's starting bill number for sequence validation reference.
                  </p>
                </div>
              </div>

              {/* Section 8 Warning: Unconfigured Sequence */}
              {dailySeqWarning && (
                <div style={{
                  background: '#FFF3E0',
                  border: '1px solid #FFE082',
                  borderLeft: '5px solid #FF9800',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#E65100',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px'
                }}>
                  <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                  <div>
                    {dailySeqWarning}
                    <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#BF360C', marginTop: '2px' }}>
                      Bills without a set sequence will be processed with a sequence warning rather than rejected.
                    </div>
                  </div>
                </div>
              )}

              {/* Status Alert */}
              {dailySeqStatus.message && (
                <div style={{
                  background: dailySeqStatus.type === 'success' ? '#E8F5E9' : '#FFEBEE',
                  color: dailySeqStatus.type === 'success' ? '#2E7D32' : '#C62828',
                  border: dailySeqStatus.type === 'success' ? '1px solid #C8E6C9' : '1px solid #FFCDD2',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '20px'
                }}>
                  {dailySeqStatus.type === 'success' ? '✓ ' : '✕ '}
                  {dailySeqStatus.message}
                </div>
              )}

              {/* Active Sequence Information Box */}
              {dailySeqData && dailySeqData.config && (
                <div style={{
                  background: '#F1F8E9',
                  border: '1px solid #C5E1A5',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px',
                  fontSize: '12.5px'
                }}>
                  <div>
                    <span style={{ color: '#558B2F', display: 'block', fontSize: '11px', fontWeight: '700' }}>TODAY'S STARTING BILL</span>
                    <strong style={{ fontSize: '16px', color: '#1B5E20', fontFamily: 'monospace' }}>#{dailySeqData.firstBillNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#558B2F', display: 'block', fontSize: '11px', fontWeight: '700' }}>BILLS TODAY</span>
                    <strong style={{ fontSize: '16px', color: '#1B5E20' }}>{dailySeqData.billsCountToday} verified</strong>
                  </div>
                  <div>
                    <span style={{ color: '#558B2F', display: 'block', fontSize: '11px', fontWeight: '700' }}>SET BY</span>
                    <strong style={{ color: '#33691E' }}>{dailySeqData.config?.configured_by || 'Admin'}</strong>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveDailySequence}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '6px' }}>
                      Business Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={dailySequenceDate}
                      onChange={(e) => setDailySequenceDate(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '11px', color: 'var(--muted-grey)' }}>
                      Enforced timezone: Asia/Kolkata
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '6px' }}>
                      Today's First Bill Number <span style={{ color: '#C62828' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 5001"
                      value={firstBillNumberInput}
                      onChange={(e) => setFirstBillNumberInput(e.target.value)}
                      style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'monospace' }}
                      required
                    />
                    <span style={{ fontSize: '11px', color: 'var(--muted-grey)' }}>
                      e.g. If yesterday's last was 5000, enter 5001.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={dailySeqLoading}
                    style={{ padding: '12px 28px', fontSize: '14px', fontWeight: '800' }}
                  >
                    <Save size={16} /> SAVE SEQUENCE
                  </button>
                </div>
              </form>

              {/* Section 7 Note */}
              <div style={{
                marginTop: '18px',
                padding: '12px',
                background: '#FAFAFA',
                border: '1px dashed #DDD',
                borderRadius: '8px',
                fontSize: '11.5px',
                color: '#666',
                lineHeight: 1.5
              }}>
                <strong>Section 7 & 8 Rules:</strong> The sequence is a validation/consistency check for customer bill submissions, NOT proof of bill authenticity. If admin forgets to set the sequence, customer bills are not automatically rejected. Only one active sequence exists per business date and changes are recorded in the admin audit trail.
              </div>
            </div>

            {/* CARD 2: OWNER ADMIN CREDENTIALS & SECURITY (Section 25 / Rule 33) */}
            <div style={{ background: 'var(--white)', borderRadius: '14px', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(6, 69, 45, 0.1)', color: 'var(--deep-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '19px', color: 'var(--deep-green)', margin: 0, fontWeight: '800' }}>
                    Owner Admin Credentials & Security
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--muted-grey)', margin: '2px 0 0 0' }}>
                    Logged in as: <strong>{adminUser}</strong>. Re-enter current password to verify identity before saving.
                  </p>
                </div>
              </div>

              {/* Feedback alert */}
              {adminCredsStatus.message && (
                <div style={{
                  background: adminCredsStatus.type === 'success' ? '#E8F5E9' : '#FFEBEE',
                  color: adminCredsStatus.type === 'success' ? '#2E7D32' : '#C62828',
                  border: adminCredsStatus.type === 'success' ? '1px solid #C8E6C9' : '1px solid #FFCDD2',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '20px'
                }}>
                  {adminCredsStatus.type === 'success' ? '✓ ' : '✕ '}
                  {adminCredsStatus.message}
                </div>
              )}

              <form onSubmit={handleChangeAdminCredentials}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ marginBottom: '6px' }}>
                    Current Password <span style={{ color: '#C62828' }}>*</span>
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter current password to verify identity"
                    value={adminCredsForm.currentPassword}
                    onChange={(e) => setAdminCredsForm({ ...adminCredsForm, currentPassword: e.target.value })}
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted-grey)' }}>
                    Mandatory: Changes are blocked if current password is incorrect.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ marginBottom: '6px' }}>
                    New Username <span style={{ color: '#C62828' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Dasaris_Darbar"
                    value={adminCredsForm.newUsername}
                    onChange={(e) => setAdminCredsForm({ ...adminCredsForm, newUsername: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ marginBottom: '6px' }}>
                    New Password <span style={{ color: '#C62828' }}>*</span>
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="At least 6 characters"
                    value={adminCredsForm.newPassword}
                    onChange={(e) => setAdminCredsForm({ ...adminCredsForm, newPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" style={{ marginBottom: '6px' }}>
                    Confirm Password <span style={{ color: '#C62828' }}>*</span>
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Re-enter new password"
                    value={adminCredsForm.confirmPassword}
                    onChange={(e) => setAdminCredsForm({ ...adminCredsForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontWeight: '800' }}
                >
                  <Save size={16} /> UPDATE OWNER CREDENTIALS
                </button>
              </form>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: REGISTERED CUSTOMERS DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'customers' && (
          <div style={{ background: 'var(--white)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--deep-green)' }}>
                Registered Loyalty Accounts Directory ({customersList.length})
              </h3>

              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '36px', padding: '8px 12px 8px 36px', fontSize: '13px' }}
                  placeholder="Search customer name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Mobile Phone</th>
                  <th>Email</th>
                  <th>Visit Rewards Streak</th>
                  <th>Visit Rewards Issued</th>
                  <th>Big Bill Coupons Issued</th>
                </tr>
              </thead>
              <tbody>
                {customersList
                  .filter(c => 
                    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || 
                    c.phone?.includes(customerSearch) ||
                    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
                  )
                  .map(c => {
                    const custRewards = rewards.filter(r => r.customerId === c.id);
                    const custCoupons = coupons.filter(cp => cp.customerId === c.id);
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '700' }}>{c.name}</td>
                        <td>{c.phone}</td>
                        <td style={{ color: 'var(--gold-green)', fontWeight: '600' }}>{c.email}</td>
                        <td>
                          <span style={{ 
                            background: c.track1Streak >= 5 ? '#FFF8E1' : '#E8F5E9', 
                            color: c.track1Streak >= 5 ? '#B78103' : '#1B5E20', 
                            padding: '4px 12px', 
                            borderRadius: '12px', 
                            fontSize: '12px', 
                            fontWeight: '800' 
                          }}>
                            {c.track1Streak || 0} / 5 Visits
                          </span>
                        </td>
                        <td style={{ fontWeight: '700' }}>{custRewards.length} Reward(s)</td>
                        <td style={{ fontWeight: '700' }}>{custCoupons.length} Coupon(s)</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: TABLE BOOKINGS */}
        {/* ========================================================================= */}
        {activeTab === 'bookings' && (
          <div style={{ background: 'var(--white)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--deep-green)', marginBottom: '16px' }}>
              Dine-In Reservations
            </h3>
            
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Table Assigned</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Party Size</th>
                  <th>Time Slot</th>
                  <th>Notes / Request</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td>
                      <span style={{ background: 'var(--deep-green)', color: 'var(--gold-white)', padding: '6px 12px', borderRadius: '16px', fontWeight: '900', fontSize: '13px' }}>
                        Table #{b.table_number || 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700' }}>{b.name}</td>
                    <td>{b.phone}</td>
                    <td>{b.party_size} Guests</td>
                    <td style={{ fontWeight: '700', color: 'var(--gold-white)' }}>{b.booking_time || '19:30'}</td>
                    <td style={{ fontSize: '13px', color: '#666' }}>{b.notes || '—'}</td>
                    <td>
                      <select
                        className="form-select"
                        style={{ padding: '4px 8px', fontSize: '12px', fontWeight: '700' }}
                        value={b.status}
                        onChange={(e) => handleBookingStatus(b.id, e.target.value)}
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT LOYALTY REWARD OFFER (Rules 4, 7, 31) */}
      {/* ========================================================================= */}
      {isOfferModalOpen && (
        <div className="modal-overlay" onClick={() => setIsOfferModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsOfferModalOpen(false)} aria-label="Close modal">
              <X size={18} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(6, 69, 45, 0.1)', color: 'var(--deep-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Gift size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', color: 'var(--deep-green)', margin: 0 }}>
                  {offerFormData.id ? 'Edit Loyalty Offer' : 'Add New Loyalty Offer'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted-grey)', margin: '2px 0 0 0' }}>
                  Manage reward item in the 5-visit milestone pool
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveOffer}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ marginBottom: '6px' }}>Offer Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 10% OFF, 15% OFF, FREE DESSERT, FREE COOL DRINK"
                  value={offerFormData.name}
                  onChange={e => setOfferFormData({ ...offerFormData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '6px' }}>Reward Type</label>
                  <select
                    className="form-input"
                    value={offerFormData.type}
                    onChange={e => setOfferFormData({ ...offerFormData, type: e.target.value })}
                  >
                    <option value="percentage_discount">Percentage Discount</option>
                    <option value="free_item">Free Item</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '6px' }}>Validity (Days)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={offerFormData.expiry_days}
                    onChange={e => setOfferFormData({ ...offerFormData, expiry_days: Number(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              </div>

              {offerFormData.type === 'percentage_discount' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '6px' }}>Discount %</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 10 or 15"
                      value={offerFormData.discount_percent}
                      onChange={e => setOfferFormData({ ...offerFormData, discount_percent: Number(e.target.value) })}
                      min="1"
                      max="100"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '6px' }}>Maximum Discount (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 300"
                      value={offerFormData.max_discount}
                      onChange={e => setOfferFormData({ ...offerFormData, max_discount: Number(e.target.value) })}
                      min="0"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ marginBottom: '6px' }}>Item Description / Dish Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Complimentary Apricot Delight or Double Ka Meetha"
                    value={offerFormData.description}
                    onChange={e => setOfferFormData({ ...offerFormData, description: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={offerFormData.is_active}
                    onChange={e => setOfferFormData({ ...offerFormData, is_active: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--bright-green)' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)' }}>
                    Active (Eligible for random selection when customer hits 5/5 visits)
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsOfferModalOpen(false)}
                  style={{ padding: '10px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '10px 22px' }}
                >
                  <Save size={16} /> Save Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CUSTOMER BILL RECEIPT LIGHTBOX INSPECTION */}
      {/* ========================================================================= */}
      {viewingBillClaim && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={handleCloseBillViewer}
        >
          <div 
            style={{
              background: '#181A1B',
              color: '#FFF',
              borderRadius: '16px',
              width: '95vw',
              maxWidth: '960px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.15)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#222527'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    background: 'rgba(228, 196, 125, 0.2)',
                    color: 'var(--gold-green)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '800'
                  }}>
                    RECEIPT INSPECTOR
                  </span>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#FFF' }}>
                    Bill #{viewingBillClaim.billNumber || 'Unreadable'}
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#AAA' }}>
                  Customer: <strong style={{ color: '#FFF' }}>{viewingBillClaim.customerName}</strong> ({viewingBillClaim.customerPhone}) • Date: {viewingBillClaim.claimKolkataDate || viewingBillClaim.billDate} • Amount: <strong style={{ color: '#81C784' }}>₹{viewingBillClaim.originalAmount}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseBillViewer}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  cursor: 'pointer'
                }}
                title="Close receipt inspector"
              >
                <X size={18} />
              </button>
            </div>

            {/* Toolbar */}
            <div style={{
              padding: '10px 20px',
              background: '#282C2E',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setBillZoom(z => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: '#FFF',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Zoom In"
                >
                  <ZoomIn size={15} /> Zoom In
                </button>
                <button
                  type="button"
                  onClick={() => setBillZoom(z => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: '#FFF',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Zoom Out"
                >
                  <ZoomOut size={15} /> Zoom Out
                </button>
                <button
                  type="button"
                  onClick={() => setBillZoom(1)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#AAA',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  title="Reset Zoom to 100%"
                >
                  {Math.round(billZoom * 100)}% (Reset)
                </button>
                <button
                  type="button"
                  onClick={() => setBillRotation(r => (r + 90) % 360)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: '#FFF',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Rotate 90 Degrees Clockwise"
                >
                  <RotateCw size={15} /> Rotate {billRotation ? `(${billRotation}°)` : ''}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {viewingBillClaim.imagePreview && (
                  <a
                    href={viewingBillClaim.imagePreview}
                    target="_blank"
                    rel="noreferrer"
                    download={`receipt_${viewingBillClaim.billNumber || viewingBillClaim.id}.jpg`}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: '#FFF',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Download size={14} /> Download Image
                  </a>
                )}
              </div>
            </div>

            {/* Content Body: Image Viewport + Details Sidebar */}
            <div style={{
              display: 'flex',
              flex: 1,
              overflow: 'hidden',
              minHeight: '400px'
            }}>
              {/* Main Image Viewport */}
              <div style={{
                flex: '1 1 65%',
                background: '#0D0F11',
                minHeight: '360px',
                maxHeight: '62vh',
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                position: 'relative'
              }}>
                {viewingBillClaim.imagePreview ? (
                  <img
                    src={viewingBillClaim.imagePreview}
                    alt={`Bill ${viewingBillClaim.billNumber}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      transform: `scale(${billZoom}) rotate(${billRotation}deg)`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.15s ease-out',
                      borderRadius: '6px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#777' }}>
                    <FileText size={48} style={{ opacity: 0.5, marginBottom: '10px' }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>No receipt image was uploaded with this claim.</p>
                  </div>
                )}
              </div>

              {/* Details & Actions Sidebar */}
              <div style={{
                flex: '0 0 35%',
                minWidth: '280px',
                background: '#1E2224',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                padding: '20px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--gold-green)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Receipt Data & Verification
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#888' }}>CUSTOMER</div>
                      <div style={{ fontWeight: '700', color: '#FFF', fontSize: '14px' }}>{viewingBillClaim.customerName}</div>
                      <div style={{ color: '#AAA', fontSize: '12px' }}>{viewingBillClaim.customerPhone}</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#888' }}>BILL NUMBER</div>
                      <div style={{ fontWeight: '800', fontFamily: 'monospace', color: 'var(--bright-green)', fontSize: '15px' }}>
                        {viewingBillClaim.billNumber || 'Unreadable'}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#888' }}>CLAIMED AMOUNT</div>
                      <div style={{ fontWeight: '800', color: '#81C784', fontSize: '18px' }}>
                        ₹{Number(viewingBillClaim.originalAmount || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#AAA', marginTop: '2px' }}>
                        {viewingBillClaim.track === 'track1' ? 'Track 1 (< ₹2,000)' : 'Track 2 (≥ ₹2,000)'}
                      </div>
                    </div>

                    {viewingBillClaim.reviewReason && (
                      <div style={{ background: 'rgba(230, 81, 0, 0.15)', border: '1px solid rgba(230, 81, 0, 0.4)', padding: '10px 12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#FFB74D', fontWeight: '800' }}>FLAGGED REASON</div>
                        <div style={{ color: '#FFE0B2', fontSize: '12.5px', marginTop: '3px' }}>
                          {viewingBillClaim.reviewReason}
                        </div>
                      </div>
                    )}

                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#888' }}>CURRENT STATUS</div>
                      <span style={{
                        display: 'inline-block',
                        marginTop: '4px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        background: viewingBillClaim.status === 'approved' ? '#1B5E20' : (viewingBillClaim.status === 'pending_review' ? '#E65100' : '#B71C1C'),
                        color: '#FFF'
                      }}>
                        {viewingBillClaim.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions if Pending */}
                {viewingBillClaim.status === 'pending_review' ? (
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        handleApproveClaim(viewingBillClaim.id, viewingBillClaim.originalAmount, viewingBillClaim.billNumber, viewingBillClaim.restaurant);
                        handleCloseBillViewer();
                      }}
                      style={{
                        background: '#2E7D32',
                        color: '#FFF',
                        border: 'none',
                        padding: '11px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Check size={16} /> APPROVE THIS CLAIM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleRejectClaim(viewingBillClaim.id);
                        handleCloseBillViewer();
                      }}
                      style={{
                        background: '#C62828',
                        color: '#FFF',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <X size={16} /> REJECT CLAIM
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      type="button"
                      onClick={handleCloseBillViewer}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#FFF',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Close Viewer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
