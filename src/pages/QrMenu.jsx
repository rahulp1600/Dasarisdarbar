import React from 'react';
import { QrCode, Smartphone, ArrowRight, Check } from 'lucide-react';

export default function QrMenu({ setActivePage }) {
  return (
    <div className="section-dark" style={{ minHeight: '80vh', paddingTop: '40px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div className="eyebrow">TABLE QR EXPERIENCE</div>
          <h1 className="section-title" style={{ fontSize: '48px' }}>One scan. The full Dasari's Darbar menu.</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', marginTop: '6px' }}>
            Designed for quick, elegant table-side browsing. No app download or sign-up needed.
          </p>
        </div>

        {/* QR Experience Grid (From Mockup Page 4) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '36px', alignItems: 'center' }}>
          
          {/* Scan Box */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)', padding: '40px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--gold-green)', marginBottom: '16px' }}>SCAN THE TABLE QR</div>
            
            <div style={{ background: '#FFF', padding: '24px', borderRadius: '16px', display: 'inline-block', marginBottom: '24px', boxShadow: 'var(--shadow-3d)' }}>
              {/* QR Code graphic SVG */}
              <svg width="180" height="180" viewBox="0 0 100 100" fill="none">
                <rect width="100" height="100" fill="white"/>
                <path d="M10 10h30v30H10zM50 10h40v20H50zM10 50h20v40H10zM40 40h20v20H40zM70 40h20v50H70zM40 70h20v20H40z" fill="#06452D"/>
                <circle cx="25" cy="25" r="7" fill="#A5262A"/>
                <circle cx="25" cy="70" r="7" fill="#A5262A"/>
              </svg>
            </div>

            <div>
              <button className="btn-gold" onClick={() => setActivePage('menu')} style={{ padding: '12px 28px', fontSize: '14px' }}>
                OPEN DIGITAL MENU <ArrowRight size={16} />
              </button>
            </div>
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
              No app • no signup required
            </div>
          </div>

          {/* Digital Mobile Mockup Phone */}
          <div style={{ background: 'var(--cream)', color: 'var(--ink)', borderRadius: '32px', padding: '32px', border: '8px solid #111', boxShadow: 'var(--shadow-3d)', position: 'relative' }}>
            <div style={{ width: '60px', height: '6px', background: '#DDD', borderRadius: '3px', margin: '0 auto 20px auto' }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontWeight: '800', color: 'var(--bright-green)', fontSize: '18px' }}>Dasari's Darbar</span>
              <Smartphone size={20} style={{ color: 'var(--muted-grey)' }} />
            </div>

            <h3 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--deep-green)' }}>Explore the Menu</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--white)', padding: '14px 18px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-white)' }}>STARTERS</div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>Basket Chicken</div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--bright-green)' }} />
              </div>

              <div style={{ background: 'var(--white)', padding: '14px 18px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-white)' }}>ROYAL MANDI</div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>Mutton Juicy Mandi</div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--bright-green)' }} />
              </div>


              <div style={{ background: 'var(--white)', padding: '14px 18px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-white)' }}>PULAVS</div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>Raju Gari Kodi Pulav</div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--bright-green)' }} />
              </div>

              <div style={{ background: 'var(--white)', padding: '14px 18px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-white)' }}>DESSERTS</div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>Apricot Delight</div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--bright-green)' }} />
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', fontWeight: '800', color: 'var(--muted-grey)', letterSpacing: '0.1em' }}>
              MENU • VIEW ONLY
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
