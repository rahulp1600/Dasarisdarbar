/**
 * Frontend API Service for Dasari Darbar Backend
 * Connects React UI to Node.js / Express Backend (which coordinates Python OCR & Supabase)
 */

const BACKEND_URL = (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:5001'
    : (import.meta.env.VITE_BACKEND_URL || 'https://dasarisdarbar.onrender.com')
);

export const backendApi = {
  baseUrl: BACKEND_URL,

  async checkHealth() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, {
        signal: AbortSignal.timeout(5000)
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
    const controller = new AbortController();
    // 90 second timeout allows Render free tier cold-starts and Tesseract processing
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      let res;
      const fetchOptions = {
        method: 'POST',
        signal: controller.signal
      };

      let base64Payload = imageBase64;
      if (!base64Payload && file && typeof FileReader !== 'undefined') {
        base64Payload = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      if (base64Payload) {
        res = await fetch(url, {
          ...fetchOptions,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            customerName,
            imageBase64: base64Payload
          })
        });
      } else if (file) {
        const formData = new FormData();
        formData.append('bill_image', file);
        formData.append('customerId', customerId);
        formData.append('customerName', customerName);

        res = await fetch(url, {
          ...fetchOptions,
          body: formData
        });
      }

      clearTimeout(timeoutId);

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = {
          success: false,
          message: res.status >= 500
            ? 'Verification server encountered an error. Please try again shortly.'
            : `Server responded with status ${res.status}.`
        };
      }

      return data;
    } catch (e) {
      clearTimeout(timeoutId);

      if (e.name === 'AbortError') {
        return {
          success: false,
          code: 'REQUEST_TIMEOUT',
          message: 'Request timed out. Please check your connection and try again.'
        };
      }

      console.error('Network error claiming bill:', e);
      return {
        success: false,
        code: 'NETWORK_ERROR',
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

