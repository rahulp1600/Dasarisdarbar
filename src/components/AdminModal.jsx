import React, { useState, useEffect } from 'react';
import { Lock, User, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';

import adminAuth from '../services/adminAuth';

export default function AdminModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const res = adminAuth.verifyLogin(username, password);
    if (res.success) {
      onLoginSuccess();
      setUsername('');
      setPassword('');
      onClose();
    } else {
      setError(res.message || 'Invalid owner username or password.');
    }
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(6, 69, 45, 0.1)', color: 'var(--deep-green)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
            <ShieldCheck size={26} />
          </div>
          <h3 style={{ fontSize: '22px', color: 'var(--deep-green)', margin: '0 0 4px 0' }}>Owner Admin Portal</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted-grey)', margin: 0 }}>
            Enter owner credentials to manage menu, visits & bookings.
          </p>
        </div>

        {error && (
          <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ marginBottom: '6px' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-grey)' }} />
              <input
                type="text"
                name="admin_user_field"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
          </div>


          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-grey)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="admin_pass_field"
                className="form-input"
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted-grey)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '15px' }}>
            LOG IN TO ADMIN PANEL
          </button>
        </form>
      </div>
    </div>
  );
}
