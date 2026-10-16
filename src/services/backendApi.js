/**
 * Frontend API Service for Dasari Darbar Backend
 * Connects React UI to Node.js / Express Backend (which coordinates Python OCR & Supabase)
 * Fully supports HttpOnly secure session cookies & CSRF protection
 */

const BACKEND_URL = (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:5001'
    : ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || (typeof process !== 'undefined' && process.env?.VITE_BACKEND_URL) || 'https://dasarisdarbar.onrender.com')
);

let currentCsrfToken = null;

export function setCsrfToken(token) {
  currentCsrfToken = token;
}

export function getCsrfToken() {
  return currentCsrfToken;
}

/**
 * Internal helper for authenticated Admin API calls
 */
async function adminFetch(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = {
    ...(options.headers || {}),
    ...(currentCsrfToken ? { 'x-csrf-token': currentCsrfToken } : {})
  };

  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  return response;
}

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

  // --- ADMIN AUTHENTICATION & SESSIONS ---

  async adminLogin(username, password) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data && data.success && data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      return data;
    } catch (e) {
      return { success: false, message: 'Could not connect to authentication server.' };
    }
  },

  async checkAdminSession() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/session`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data && data.authenticated && data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      return data;
    } catch (e) {
      return { authenticated: false };
    }
  },

  async adminLogout() {
    try {
      const res = await adminFetch('/api/admin/logout', {
        method: 'POST'
      });
      setCsrfToken(null);
      return await res.json();
    } catch (e) {
      setCsrfToken(null);
      return { success: true };
    }
  },

  async changeAdminCredentials(payload) {
    try {
      const res = await adminFetch('/api/admin/change-credentials', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.success && data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      return data;
    } catch (e) {
      return { success: false, message: 'Server error updating credentials: ' + e.message };
    }
  },

  // --- LOYALTY CUSTOMER APIS ---

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
      const res = await adminFetch('/api/admin/redeem', {
        method: 'POST',
        body: JSON.stringify({ voucherCode, staffIdentifier })
      });
      return await res.json();
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
      const res = await adminFetch('/api/admin/verified-bills');
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async getAuditLogs() {
    try {
      const res = await adminFetch('/api/admin/audit-logs');
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async getAdminClaims() {
    try {
      const res = await adminFetch('/api/admin/claims');
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async getDailySequence(date) {
    try {
      const url = date 
        ? `/api/admin/daily-sequence?date=${encodeURIComponent(date)}`
        : `/api/admin/daily-sequence`;
      const res = await adminFetch(url);
      return res.ok ? await res.json() : { success: false, isConfigured: false, warning: "Today's bill sequence is not set." };
    } catch (e) {
      return { success: false, isConfigured: false, warning: "Today's bill sequence is not set." };
    }
  },

  async setDailySequence({ businessDate, firstBillNumber, adminUser, confirmOverride = false }) {
    try {
      const res = await adminFetch('/api/admin/daily-sequence', {
        method: 'POST',
        body: JSON.stringify({ businessDate, firstBillNumber, adminUser, confirmOverride })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not connect to backend to save sequence: ' + e.message };
    }
  },

  async getOffers() {
    try {
      const res = await adminFetch('/api/admin/offers');
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async saveOffer(offerData) {
    try {
      const res = await adminFetch('/api/admin/offers', {
        method: 'POST',
        body: JSON.stringify(offerData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not save offer: ' + e.message };
    }
  },

  async toggleOfferStatus(id, active, adminUser = 'Dasaris_Darbar') {
    try {
      const res = await adminFetch(`/api/admin/offers/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active, adminUser })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not toggle offer status: ' + e.message };
    }
  },

  async deleteOffer(id, adminUser = 'Dasaris_Darbar') {
    try {
      const res = await adminFetch(`/api/admin/offers/${encodeURIComponent(id)}?adminUser=${encodeURIComponent(adminUser)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not delete offer: ' + e.message };
    }
  },

  async saveTrackAllocations(track, allocations) {
    try {
      const res = await adminFetch(`/api/admin/offers/allocations/${encodeURIComponent(track)}`, {
        method: 'PUT',
        body: JSON.stringify({ allocations })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not update allocations: ' + e.message };
    }
  },

  // --- PUBLIC & ADMIN TABLE RESERVATION OFFERS ---

  async getActiveReservationOffers() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/reservation-offers`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
      }
      return null;
    } catch (e) {
      console.warn('Backend getActiveReservationOffers fallback:', e.message);
      return null;
    }
  },

  async getAdminReservationOffers() {
    try {
      const res = await adminFetch('/api/admin/reservation-offers');
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json;
        }
      }
      // If admin endpoint returned empty or unauthenticated, check public offers endpoint
      const pubRes = await fetch(`${BACKEND_URL}/api/reservation-offers`);
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        if (pubData && pubData.success && Array.isArray(pubData.data) && pubData.data.length > 0) {
          return pubData;
        }
      }
      return { success: false, data: [] };
    } catch (e) {
      try {
        const pubRes = await fetch(`${BACKEND_URL}/api/reservation-offers`);
        if (pubRes.ok) return await pubRes.json();
      } catch (err2) {}
      return { success: false, data: [] };
    }
  },

  async saveReservationOffer(offerData) {
    try {
      const res = await adminFetch('/api/admin/reservation-offers', {
        method: 'POST',
        body: JSON.stringify(offerData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not save reservation offer: ' + e.message };
    }
  },

  async toggleReservationOfferStatus(id, active, adminUser = 'Dasaris_Darbar') {
    try {
      const res = await adminFetch(`/api/admin/reservation-offers/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active, adminUser })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not toggle reservation offer status: ' + e.message };
    }
  },

  async deleteReservationOffer(id, adminUser = 'Dasaris_Darbar') {
    try {
      const res = await adminFetch(`/api/admin/reservation-offers/${encodeURIComponent(id)}?adminUser=${encodeURIComponent(adminUser)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not delete reservation offer: ' + e.message };
    }
  },

  // --- MENU MANAGEMENT ---

  async getMenu() {
    try {
      const res = await adminFetch('/api/admin/menu');
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async updateMenuItem(id, updates, adminUser = 'Dasaris_Darbar') {
    try {
      const res = await adminFetch(`/api/admin/menu/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ ...updates, adminUser })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not reach server to update menu item: ' + e.message };
    }
  },

  async updateMenuItemPrice(id, price, adminUser = 'Dasaris_Darbar', name = undefined) {
    try {
      const res = await adminFetch(`/api/admin/menu/${encodeURIComponent(id)}/price`, {
        method: 'PUT',
        body: JSON.stringify({ price, adminUser, name })
      });
      return await res.json();
    } catch (e) {
      try {
        const res2 = await adminFetch('/api/admin/menu/price', {
          method: 'POST',
          body: JSON.stringify({ id, price, adminUser, name })
        });
        return await res2.json();
      } catch (err2) {
        return { success: false, message: 'Could not reach server to update menu price: ' + e.message };
      }
    }
  },

  // --- TABLE RESERVATIONS (BOOKINGS) ---

  async getBookings() {
    try {
      const res = await adminFetch('/api/admin/bookings');
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async updateBookingStatus(id, status, adminUser = 'Dasaris_Darbar') {
    try {
      const res = await adminFetch(`/api/admin/bookings/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminUser })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not update booking status: ' + e.message };
    }
  },

  async createBooking(bookingData) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not submit booking to server: ' + e.message };
    }
  },

  async deleteBooking(id, adminUser = 'Dasaris_Darbar') {
    try {
      const res = await adminFetch(`/api/admin/bookings/${encodeURIComponent(id)}?adminUser=${encodeURIComponent(adminUser)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Could not reach server to delete booking: ' + e.message };
    }
  }
};

export default backendApi;
