// ============================================================================
// DASARI'S DARBAR - ADMIN AUTHENTICATION SERVICE
// Secure backend-verified authentication for restaurant owner & management
// ZERO PLAINTEXT CREDENTIALS STORED IN FRONTEND
// ============================================================================

import backendApi from './backendApi';

// Purge any legacy plaintext credentials left in browser localStorage
if (typeof localStorage !== 'undefined') {
  try {
    localStorage.removeItem('dd_admin_auth');
  } catch (e) {}
}

let inMemoryUsername = 'Dasaris_Darbar';

export const adminAuth = {
  /**
   * Verify username & password against backend server
  login: async (inputUsername, inputPassword) => {
    return adminAuth.verifyLogin(inputUsername, inputPassword);
  },
  verifyLogin: async (inputUsername, inputPassword) => {
    if (!inputUsername || !inputPassword) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    try {
      const res = await backendApi.adminLogin(inputUsername.trim(), inputPassword.trim());
      if (res && res.success) {
        if (res.username) inMemoryUsername = res.username;
        return { success: true, message: res.message || 'Login successful', username: inMemoryUsername };
      }
      return { success: false, message: res?.message || 'Invalid admin username or password.' };
    } catch (err) {
      return { success: false, message: 'Could not reach server to verify credentials.' };
    }
  },

  /**
   * Probe backend to see if a valid HttpOnly session cookie exists
   */
  checkSession: async () => {
    try {
      const res = await backendApi.checkAdminSession();
      if (res && res.authenticated) {
        if (res.username) inMemoryUsername = res.username;
        return { authenticated: true, username: inMemoryUsername };
      }
      return { authenticated: false };
    } catch (e) {
      return { authenticated: false };
    }
  },

  /**
   * Log out admin from backend (revokes session and clears cookie)
   */
  logout: async () => {
    try {
      await backendApi.adminLogout();
    } catch (e) {}
    return { success: true };
  },

  /**
   * Get current admin username (never exposes passwords)
   */
  getCurrentUsername: () => {
    return inMemoryUsername;
  },

  /**
   * Change admin credentials via secure backend endpoint
   */
  changeCredentials: async ({ currentPassword, newUsername, newPassword, confirmPassword }) => {
    if (!currentPassword) {
      return { success: false, message: 'Current password is required.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, message: 'New password and confirm password do not match.' };
    }

    try {
      const res = await backendApi.changeAdminCredentials({
        currentPassword,
        newUsername: (newUsername || inMemoryUsername).trim(),
        newPassword,
        confirmPassword
      });
      if (res && res.success) {
        if (res.username) inMemoryUsername = res.username;
        return { success: true, message: res.message || 'Credentials updated successfully!' };
      }
      return { success: false, message: res?.message || 'Could not update credentials.' };
    } catch (e) {
      return { success: false, message: 'Server error updating credentials.' };
    }
  }
};

export default adminAuth;
