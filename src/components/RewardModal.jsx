import React from 'react';
import { Gift, Award, Sparkles, X, Check, Copy } from 'lucide-react';

export default function RewardModal({ isOpen, onClose, reward }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !reward) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(reward.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          background: 'linear-gradient(145deg, #072B1E 0%, #031810 100%)', 
          color: '#FFF', 
          border: '1px solid rgba(212, 175, 55, 0.4)',
          borderRadius: '24px',
          textAlign: 'center',
          maxWidth: '440px',
          padding: '36px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
        }}
      >
        <button 
          className="modal-close" 
          onClick={onClose}
          style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '8px' }}
        >
          <X size={20} />
        </button>

        {/* Animated Trophy Icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
          color: '#FFF',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: '0 0 30px rgba(212, 175, 55, 0.5)'
        }}>
          <Award size={40} />
        </div>

        <div style={{ fontSize: '12px', fontWeight: '800', color: '#D4AF37', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>
          🎉 CONGRATULATIONS!
        </div>

        <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#FFF', marginBottom: '8px' }}>
          {reward.title}
        </h2>

        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
          {reward.description}
        </p>

        {/* Voucher Code Box */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '2px dashed rgba(212, 175, 55, 0.6)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
            YOUR EXCLUSIVE VOUCHER CODE
          </div>

          <div style={{ fontSize: '24px', fontWeight: '900', color: '#81C784', letterSpacing: '0.15em', fontFamily: 'monospace', marginBottom: '12px' }}>
            {reward.code}
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            style={{
              background: copied ? '#2E7D32' : 'rgba(212, 175, 55, 0.2)',
              color: copied ? '#FFF' : '#D4AF37',
              border: '1px solid #D4AF37',
              padding: '8px 18px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'COPIED TO CLIPBOARD' : 'COPY REWARD CODE'}
          </button>
        </div>

        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
          📌 Present this code to your waiter or cashier at Dasari's Darbar to claim your reward!
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-gold"
          style={{ width: '100%', justifyContent: 'center', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '800' }}
        >
          GREAT, GOT IT!
        </button>
      </div>
    </div>
  );
}
