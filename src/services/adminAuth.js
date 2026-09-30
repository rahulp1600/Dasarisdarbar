// ============================================================================
// DASARI'S DARBAR - ADMIN AUTHENTICATION SERVICE
// Secure local authentication for restaurant owner & management
// Default Initial Credentials (Specification Rule 33):
// Username: Dasaris_Darbar
// Password: admin@dasari1099
// ============================================================================

const ADMIN_STORAGE_KEY = 'dd_admin_auth';

const DEFAULT_ADMIN = {
  username: 'Dasaris_Darbar',
  password: 'admin@dasari1099',
  role: 'owner',
  updated_at: new Date().toISOString()
};

let inMemoryAdmin = null;

function getStoredAdmin() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.username && parsed.password) {
          return parsed;
        }
      }
    } else if (inMemoryAdmin) {
      return inMemoryAdmin;
    }
  } catch (e) {
    console.error('Error reading admin credentials from storage:', e);
  }
  return DEFAULT_ADMIN;
}

function saveStoredAdmin(adminObj) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminObj));
    } else {
      inMemoryAdmin = adminObj;
    }
  } catch (e) {
    console.error('Error saving admin credentials to storage:', e);
  }
}

export const adminAuth = {
  /**
   * Verify username & password against stored credentials
   */
  verifyLogin: (inputUsername, inputPassword) => {
    if (!inputUsername || !inputPassword) {
      return { success: false, message: 'Please enter both username and password.' };
    }
    const current = getStoredAdmin();
    const userMatch = inputUsername.trim().toLowerCase() === current.username.trim().toLowerCase();
    const passMatch = inputPassword.trim() === current.password.trim();

    if (userMatch && passMatch) {
      return { success: true, message: 'Login successful', username: current.username };
    }
    return { success: false, message: 'Invalid admin username or password.' };
  },

  /**
   * Get current admin username (never exposes password)
   */
  getCurrentUsername: () => {
    const current = getStoredAdmin();
    return current.username || 'Dasaris_Darbar';
  },

  /**
   * Change admin credentials
   * Requires: CURRENT PASSWORD, NEW USERNAME, NEW PASSWORD, CONFIRM PASSWORD
   * Rule 33: If current password is incorrect: Do not allow change.
   */
  changeCredentials: ({ currentPassword, newUsername, newPassword, confirmPassword }) => {
    if (!currentPassword) {
      return { success: false, message: 'Current password is required to verify identity.' };
    }

    const current = getStoredAdmin();

    if (currentPassword.trim() !== current.password.trim()) {
      return { success: false, message: 'Verification failed: Current password is incorrect.' };
    }

    if (!newUsername || newUsername.trim().length < 3) {
      return { success: false, message: 'New username must be at least 3 characters long.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, message: 'New password and confirm password do not match.' };
    }

    const updated = {
      ...current,
      username: newUsername.trim(),
      password: newPassword.trim(),
      updated_at: new Date().toISOString()
    };

    saveStoredAdmin(updated);
    return { success: true, message: 'Admin username and password successfully updated!' };
  },

  /**
   * Reset credentials to initial default (useful for troubleshooting)
   */
  resetToDefault: () => {
    saveStoredAdmin(DEFAULT_ADMIN);
    return { success: true, message: 'Admin credentials reset to defaults.' };
  }
};

export default adminAuth;
