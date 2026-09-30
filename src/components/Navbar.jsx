import React, { useState } from 'react';
import { Utensils, ShieldCheck, ArrowLeft, Menu as MenuIcon, X, Home, Award, MapPin, QrCode } from 'lucide-react';

export default function Navbar({ activePage, setActivePage, onOpenAdminModal, isAdminLoggedIn, onLogoutAdmin }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="container nav-container">
        
        {/* Left Section: Back Button + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activePage !== 'home' && (
            <button
              type="button"
              onClick={() => setActivePage('home')}
              className="navbar-back-btn"
              title="Back to Home"
            >
              <ArrowLeft size={16} />
              <span className="back-btn-text">BACK</span>
            </button>
          )}

          <div className="logo-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => handleNavClick('home')}>
            <img src="/assets/ddlogo.jpg" alt="Dasari's Darbar Logo" className="logo-img" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="brand-title">
                Dasari's Darbar
              </span>
              <span className="brand-subtitle">
                Veg & Non-Veg Family Restaurant
              </span>
            </div>
            <span className="logo-hint" onClick={(e) => { e.stopPropagation(); onOpenAdminModal(); }} title="Owner Admin Access">
              <ShieldCheck size={12} style={{ marginRight: '3px' }} />
              Admin
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav">
          <ul className="nav-links">
            <li>
              <button 
                className={`nav-link ${activePage === 'home' ? 'active' : ''}`}
                onClick={() => handleNavClick('home')}
              >
                HOME
              </button>
            </li>
            <li>
              <button 
                className={`nav-link ${activePage === 'menu' ? 'active' : ''}`}
                onClick={() => handleNavClick('menu')}
              >
                MENU
              </button>
            </li>
            <li>
              <button 
                className={`nav-link ${activePage === 'loyalty' ? 'active' : ''}`}
                onClick={() => handleNavClick('loyalty')}
              >
                LOYALTY
              </button>
            </li>
            <li>
              <button 
                className={`nav-link ${activePage === 'visitus' ? 'active' : ''}`}
                onClick={() => handleNavClick('visitus')}
              >
                VISIT US
              </button>
            </li>
          </ul>
        </nav>

        {/* Right Section: Desktop CTA / Mobile Menu Trigger */}
        <div className="nav-right-actions">
          {isAdminLoggedIn ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button className="btn-gold" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleNavClick('admin')}>
                ADMIN
              </button>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={onLogoutAdmin}>
                LOGOUT
              </button>
            </div>
          ) : (
            <button className="btn-primary desktop-book-btn" onClick={() => handleNavClick('booking')}>
              <Utensils size={16} />
              BOOK TABLE
            </button>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button 
            type="button" 
            className="mobile-hamburger-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Overlay Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay">
          <div className="mobile-drawer-content">
            <button className={`mobile-drawer-item ${activePage === 'home' ? 'active' : ''}`} onClick={() => handleNavClick('home')}>
              <Home size={18} /> HOME
            </button>
            <button className={`mobile-drawer-item ${activePage === 'menu' ? 'active' : ''}`} onClick={() => handleNavClick('menu')}>
              <Utensils size={18} /> FULL MENU
            </button>
            <button className={`mobile-drawer-item ${activePage === 'loyalty' ? 'active' : ''}`} onClick={() => handleNavClick('loyalty')}>
              <Award size={18} /> DASARI'S REWARDS
            </button>
            <button className={`mobile-drawer-item ${activePage === 'booking' ? 'active' : ''}`} onClick={() => handleNavClick('booking')}>
              <Utensils size={18} /> BOOK TABLE (20 TABLES)
            </button>
            <button className={`mobile-drawer-item ${activePage === 'qrmenu' ? 'active' : ''}`} onClick={() => handleNavClick('qrmenu')}>
              <QrCode size={18} /> TABLE QR MENU
            </button>
            <button className={`mobile-drawer-item ${activePage === 'visitus' ? 'active' : ''}`} onClick={() => handleNavClick('visitus')}>
              <MapPin size={18} /> VISIT US & LOCATION
            </button>
            
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #EEE' }}>
              <button className="mobile-drawer-item" style={{ color: 'var(--brand-red)' }} onClick={() => { setMobileMenuOpen(false); onOpenAdminModal(); }}>
                <ShieldCheck size={18} /> OWNER ADMIN LOGIN
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
