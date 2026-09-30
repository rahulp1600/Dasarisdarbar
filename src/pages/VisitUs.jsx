import React from 'react';
import { MapPin, Clock, Phone, ExternalLink, Navigation, ShoppingBag } from 'lucide-react';

export default function VisitUs({ setActivePage }) {
  const openDirections = () => {
    window.open('https://maps.google.com/?q=Dasaris+Darbar+Kothapet+Hyderabad', '_blank');
  };

  return (
    <div className="section-dark" style={{ minHeight: '80vh', paddingTop: '40px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div className="eyebrow">LOCATION & CONTACT</div>
          <h1 className="section-title" style={{ fontSize: '48px' }}>Visit Us</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', marginTop: '6px' }}>
            We'd love to host you and your family for a royal dining experience.
          </p>
        </div>

        {/* Visit Us Grid (Mockup Page 6 Layout) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '40px', alignItems: 'center' }}>
          
          {/* Live Google Maps Interactive Container */}
          <div style={{ 
            background: 'rgba(255,255,255,0.06)', 
            borderRadius: 'var(--radius-lg)', 
            height: '420px', 
            position: 'relative', 
            boxShadow: 'var(--shadow-3d)', 
            overflow: 'hidden',
            border: '2px solid rgba(228, 196, 125, 0.3)'
          }}>
            <iframe
              title="Dasari's Darbar Google Maps"
              src="https://maps.google.com/maps?q=Dasari's+Darbar+Plot+A/2+Margadarshi+Colony+Kothapet+Hyderabad&t=&z=16&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block' }}
              allowFullScreen=""
              loading="lazy"
            />
            
            <a
              href="https://maps.google.com/?q=Dasaris+Darbar+Kothapet+Hyderabad"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--deep-green)',
                color: 'var(--gold-white)',
                padding: '8px 20px',
                borderRadius: 'var(--radius-full)',
                fontWeight: '800',
                fontSize: '13px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                border: '1px solid rgba(228, 196, 125, 0.4)'
              }}
            >
              <Navigation size={14} /> Open in Google Maps ↗
            </a>
          </div>

          {/* Details Column */}
          <div>
            <div className="eyebrow" style={{ color: 'var(--gold-green)' }}>DASARI'S DARBAR</div>
            <h2 style={{ fontSize: '38px', color: 'var(--white)', marginBottom: '8px', lineHeight: '1.1' }}>
              Veg & Non Veg<br />Family Restaurant
            </h2>

            <div style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '16px', color: 'rgba(255,255,255,0.85)' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <MapPin size={22} style={{ color: 'var(--gold-green)', flexShrink: 0 }} />
                <span>
                  Plot A/2, Margadarshi Colony, Road No. 1, Telephone Colony, Kothapet, Hyderabad
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Clock size={22} style={{ color: 'var(--gold-green)', flexShrink: 0 }} />
                <span>OPEN • 12:00 PM – 12:00 AM</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Phone size={22} style={{ color: 'var(--gold-green)', flexShrink: 0 }} />
                <a 
                  href="tel:+918143324102" 
                  style={{ color: 'var(--white)', textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}
                >
                  +91 81433 24102
                </a>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '22px', display: 'flex', justifyContent: 'center' }}>
                  <ExternalLink size={18} style={{ color: 'var(--gold-green)', flexShrink: 0 }} />
                </div>
                <a 
                  href="https://www.instagram.com/dasarisdarbar.hyd/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontWeight: '600' }}
                >
                  Instagram: @dasarisdarbar.hyd ↗
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '28px' }}>
              <button className="btn-primary" onClick={openDirections} style={{ padding: '14px 24px', fontSize: '14px' }}>
                <Navigation size={18} /> GET DIRECTIONS
              </button>
              <button className="btn-gold" onClick={() => setActivePage('menu')} style={{ padding: '14px 24px', fontSize: '14px' }}>
                <ShoppingBag size={18} /> ORDER DINE-IN
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
