/**
 * Frontend API Service for Dasari Darbar Backend
 * Connects React UI to Node.js / Express Backend (which coordinates Python OCR & Supabase)
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001';

export const backendApi = {
  baseUrl: BACKEND_URL,

  async checkHealth() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) return await res.json();
      return { status: 'degraded', error: `HTTP ${res.status}` };
    } catch (e) {
      return { status: 'offline', error: e.message };
    }
  },

  async getLoyaltyStatus(customerId) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/loyalty/status?customerId=${encodeURIComponent(customerId)}`);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      console.warn('Backend getLoyaltyStatus offline:', e.message);
      return null;
    }
  },

  async claimBill({ customerId, customerName, imageBase64, file }) {
    const url = `${BACKEND_URL}/api/loyalty/claim`;

    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('bill_image', file);
        formData.append('customerId', customerId);
        formData.append('customerName', customerName);

        res = await fetch(url, {
          method: 'POST',
          body: formData
        });
      } else {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            customerName,
            imageBase64
          })
        });
      }

      const data = await res.json();
      return data;
    } catch (e) {
      console.error('Network error claiming bill:', e);
      return {
        success: false,
        message: 'Unable to reach verification server. Please check your internet connection and try again.',
        error: e.message
      };
    }
  },

  async redeemVoucher({ voucherCode, staffIdentifier = 'Staff Cashier' }) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherCode, staffIdentifier })
      });
      const data = await res.json();
      return data;
    } catch (e) {
      return {
        success: false,
        message: 'Could not contact backend server for redemption verification.',
        error: e.message
      };
    }
  },

  async getVerifiedBills() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/verified-bills`);
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async getAuditLogs() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/audit-logs`);
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async getAdminClaims() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/claims`);
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async getDailySequence(date) {
    try {
      const url = date 
        ? `${BACKEND_URL}/api/admin/daily-sequence?date=${encodeURIComponent(date)}`
        : `${BACKEND_URL}/api/admin/daily-sequence`;
      const res = await fetch(url);
      return res.ok ? await res.json() : { success: false, isConfigured: false, warning: "Today's bill sequence is not set." };
    } catch (e) {
      return { success: false, isConfigured: false, warning: "Today's bill sequence is not set." };
    }
  },

  async setDailySequence({ businessDate, firstBillNumber, adminUser, confirmOverride = false }) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/daily-sequence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDate, firstBillNumber, adminUser, confirmOverride })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not connect to backend to save sequence: ' + e.message };
    }
  },

  async getOffers() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/offers`);
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async saveOffer(offerData) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not save offer: ' + e.message };
    }
  }
};

export default backendApi;

