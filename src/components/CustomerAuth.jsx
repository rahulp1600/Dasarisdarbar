import React, { useState } from 'react';
import { Mail, Lock, User, Phone, Eye, EyeOff, Sparkles, Award, ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';
import { localStoreManager } from '../services/store';
import { supabase } from '../services/supabase';

export default function CustomerAuth({ onLoginSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Real Supabase Google OAuth Sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (!supabase) {
        throw new Error('Supabase client is not configured. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/loyalty'
        }
      });

      if (error) {
        throw error;
      }
      // Browser automatically redirects to accounts.google.com
    } catch (err) {
      console.error('Google Sign In Error:', err);
      if (err.message && err.message.toLowerCase().includes('provider is not enabled')) {
        setErrorMsg('Google Sign-In is not enabled yet in your Supabase Dashboard. Go to Authentication -> Providers -> Google and toggle it ON with your Google Client ID.');
      } else {
        setErrorMsg(err.message || 'Failed to redirect to Google Sign-In.');
      }
      setIsLoading(false);
    }
  };

  // Real Supabase Email + Password Sign In / Sign Up
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          });
          if (error) {
            // Check if local store has credentials fallback
            const localResult = localStoreManager.loginCustomerWithEmail(email, password);
            if (localResult.success) {
              setIsLoading(false);
              if (onLoginSuccess) onLoginSuccess(localResult.customer);
              return;
            }
            throw error;
          }
          if (data?.user) {
            const customerObj = {
              id: data.user.id,
              name: data.user.user_metadata?.full_name || email.split('@')[0],
              email: data.user.email,
              phone: data.user.user_metadata?.phone || ''
            };
            localStoreManager.loginCustomerWithGoogle(customerObj);
            setIsLoading(false);
            if (onLoginSuccess) onLoginSuccess(customerObj);
            return;
          }
        } else {
          const result = localStoreManager.loginCustomerWithEmail(email, password);
          if (!result.success) throw new Error(result.message);
          if (onLoginSuccess) onLoginSuccess(result.customer);
        }
      } else {
        // Sign Up Mode
        if (supabase) {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: name,
                phone: phone
              }
            }
          });
          if (error) throw error;
          if (data?.user) {
            const customerObj = {
              id: data.user.id,
              name: name || email.split('@')[0],
              email: data.user.email,
              phone: phone
            };
            localStoreManager.loginCustomerWithGoogle(customerObj);
            setIsLoading(false);
            if (onLoginSuccess) onLoginSuccess(customerObj);
            return;
          }
        } else {
          const result = localStoreManager.registerCustomerWithEmail({
            name,
            email,
            password,
            phone
          });
          if (!result.success) throw new Error(result.message);
          if (onLoginSuccess) onLoginSuccess(result.customer);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '480px',
      margin: '20px auto 40px',
      background: 'linear-gradient(165deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)',
      border: '1px solid rgba(228, 196, 125, 0.3)',
      borderRadius: '24px',
      padding: '36px 30px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
      backdropFilter: 'blur(16px)',
      color: '#FFF'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(228,196,125,0.2) 0%, rgba(6,69,45,0.4) 100%)',
          border: '1px solid var(--gold-green)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gold-green)',
          marginBottom: '14px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
        }}>
          <Award size={28} />
        </div>
        <div style={{ fontSize: '11px', color: 'var(--gold-green)', fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          DASARI'S DARBAR REWARDS
        </div>
        <h2 style={{ fontSize: '26px', color: '#FFF', margin: '6px 0 8px', fontWeight: '800' }}>
          {mode === 'signin' ? 'Sign In to Loyalty' : 'Create Rewards Account'}
        </h2>
        <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.4 }}>
          {mode === 'signin' 
            ? 'Access your bill claims, visit streak stamps, and instant dining discounts.'
            : 'Join our loyalty program to earn free Biryanis and 10% instant discounts.'}
        </p>
      </div>

      {/* Google Sign-in Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: '#FFFFFF',
          color: '#3C4043',
          border: '1px solid #DADCE0',
          borderRadius: '30px',
          padding: '12px 20px',
          fontSize: '14.5px',
          fontWeight: '700',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          marginBottom: '22px'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        margin: '0 0 22px',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '12px',
        fontWeight: '700',
        letterSpacing: '0.05em'
      }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }}></div>
        <span style={{ padding: '0 12px' }}>OR USE EMAIL</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }}></div>
      </div>

      {/* Tabs: Sign In / Create Account */}
      <div style={{
        display: 'flex',
        background: 'rgba(0,0,0,0.25)',
        padding: '4px',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button
          type="button"
          onClick={() => { setMode('signin'); setErrorMsg(''); }}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: '9px',
            border: 'none',
            background: mode === 'signin' ? 'var(--bright-green)' : 'transparent',
            color: '#FFF',
            fontWeight: mode === 'signin' ? '800' : '600',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode('signup'); setErrorMsg(''); }}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: '9px',
            border: 'none',
            background: mode === 'signup' ? 'var(--bright-green)' : 'transparent',
            color: '#FFF',
            fontWeight: mode === 'signup' ? '800' : '600',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Create Account
        </button>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div style={{
          background: 'rgba(165, 38, 42, 0.2)',
          border: '1px solid rgba(165, 38, 42, 0.5)',
          color: '#FFCDD2',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          {errorMsg}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {mode === 'signup' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sai Kumar"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
            Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sai@example.com"
              required
              style={{
                width: '100%',
                padding: '11px 14px 11px 40px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFF',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {mode === 'signup' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
              Phone Number (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '11px 40px 11px 40px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFF',
                fontSize: '14px',
                outline: 'none'
              }}
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
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer'
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '30px',
            fontSize: '14px',
            fontWeight: '800',
            marginTop: '8px',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(165, 38, 42, 0.4)'
          }}
        >
          {mode === 'signin' ? 'Sign In & Open Bill Upload' : 'Create Account & Open Bill Upload'}
          <ArrowRight size={16} style={{ marginLeft: '6px' }} />
        </button>
      </form>

    </div>
  );
}
