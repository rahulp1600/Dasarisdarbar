import React from 'react';
import { MapPin, Clock, Phone, Instagram } from 'lucide-react';

export default function Footer({ setActivePage }) {
  return (
    <footer className="footer">
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', marginBottom: '40px' }}>
        <div>
          <img src="/assets/ddlogo.jpg" alt="Dasari's Darbar" style={{ height: '56px', borderRadius: '8px', marginBottom: '16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', maxWidth: '300px' }}>
            Authentic Indian favourites, family-style. From fiery starters to fragrant mandi and pulavs.
          </p>
        </div>

        <div>
          <h4 style={{ color: 'var(--gold-green)', fontSize: '16px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Links</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
            <li><a href="#menu" onClick={(e) => { e.preventDefault(); setActivePage('menu'); }}>Full Menu</a></li>
            <li><a href="#loyalty" onClick={(e) => { e.preventDefault(); setActivePage('loyalty'); }}>Dasari's Rewards</a></li>
            <li><a href="#booking" onClick={(e) => { e.preventDefault(); setActivePage('booking'); }}>Book a Table</a></li>
            <li><a href="#qrmenu" onClick={(e) => { e.preventDefault(); setActivePage('qrmenu'); }}>Table QR Menu</a></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: 'var(--gold-green)', fontSize: '16px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Location & Contact</h4>
          <p style={{ display: 'flex', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '10px' }}>
            <MapPin size={18} style={{ color: 'var(--gold-green)', flexShrink: 0 }} />
            Plot A/2, Margadarshi Colony, Road No. 1, Telephone Colony, Kothapet, Hyderabad
          </p>
          <p style={{ display: 'flex', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '10px' }}>
            <Phone size={18} style={{ color: 'var(--gold-green)', flexShrink: 0 }} />
            <a href="tel:+918143324102" style={{ color: 'var(--white)', textDecoration: 'none', fontWeight: '700' }}>
              +91 81433 24102
            </a>
          </p>
          <p style={{ display: 'flex', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
            <Clock size={18} style={{ color: 'var(--gold-green)', flexShrink: 0 }} />
            Open Daily: 12:00 PM – 12:00 AM
          </p>
        </div>

        <div>
          <h4 style={{ color: 'var(--gold-green)', fontSize: '16px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Follow & Order</h4>
          <p style={{ display: 'flex', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '12px' }}>
            <Instagram size={18} style={{ color: 'var(--gold-green)' }} />
            <a 
              href="https://www.instagram.com/dasarisdarbar.hyd/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold-green)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
            >
              @dasarisdarbar.hyd
            </a>
          </p>
        </div>
      </div>

      <div className="container" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
        © {new Date().getFullYear()} Dasari's Darbar Veg & Non Veg Family Restaurant. All rights reserved.
      </div>
    </footer>
  );
}
