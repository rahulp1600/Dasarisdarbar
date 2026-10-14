import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminModal from './components/AdminModal';
import MobileBottomNav from './components/MobileBottomNav';
import { dataStore } from './services/store';

import Home from './pages/Home';
import Menu from './pages/Menu';
import Loyalty from './pages/Loyalty';
import Booking from './pages/Booking';
import QrMenu from './pages/QrMenu';
import VisitUs from './pages/VisitUs';
import AdminDashboard from './pages/AdminDashboard';

import './styles/main.css';

function getPageFromLocation() {
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const slug = hash || path;

  if (slug === 'menu') return 'menu';
  if (slug === 'loyalty') return 'loyalty';
  if (slug === 'booking') return 'booking';
  if (slug === 'qrmenu' || slug === 'qr-menu') return 'qrmenu';
  if (slug === 'visitus' || slug === 'visit-us') return 'visitus';
  if (slug === 'admin') return 'admin';
  return 'home';
}

export default function App() {
  const [activePage, setActivePage] = useState(() => getPageFromLocation());
  const [adminTab, setAdminTab] = useState('menu');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Sync state navigation with browser URL bar and history
  const navigateToPage = (target) => {
    const page = typeof target === 'function' ? target(activePage) : target;
    setActivePage(page);

    const targetPath = page === 'home' ? '/' : `/${page}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Keep activePage in sync with browser Back / Forward buttons and QR direct visits
    const handleLocationChange = () => {
      const page = getPageFromLocation();
      setActivePage(page);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  useEffect(() => {
    dataStore.syncWithSupabase();

    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (isAppLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#032116',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFF',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          border: '2px solid #E4C47D',
          padding: '4px',
          boxShadow: '0 0 30px rgba(228, 196, 125, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.05)'
        }}>
          <img 
            src="/assets/ddlogo.jpg" 
            alt="Dasari's Darbar" 
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <div style={{
          marginTop: '20px',
          fontFamily: 'Cinzel, serif',
          fontSize: '24px',
          fontWeight: '900',
          letterSpacing: '0.08em',
          color: '#FFF'
        }}>
          DASARI'S DARBAR
        </div>
        <div style={{
          fontSize: '12px',
          letterSpacing: '0.2em',
          color: '#E4C47D',
          textTransform: 'uppercase',
          marginTop: '4px',
          fontWeight: '700'
        }}>
          Veg & Non Veg Family Restaurant
        </div>
        <div style={{
          marginTop: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.7)'
        }}>
          <div style={{
            width: '18px',
            height: '18px',
            border: '2px solid rgba(228, 196, 125, 0.3)',
            borderTopColor: '#E4C47D',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span>Loading restaurant experience...</span>
        </div>
      </div>
    );
  }

  const handleOpenAdminModal = () => {
    if (isAdminLoggedIn) {
      navigateToPage('admin');
    } else {
      setIsAdminModalOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    navigateToPage('admin');
  };

  const handleLogoutAdmin = () => {
    setIsAdminLoggedIn(false);
    navigateToPage('home');
  };

  return (
    <div className="app-layout">
      <Navbar 
        activePage={activePage}
        setActivePage={navigateToPage}
        onOpenAdminModal={handleOpenAdminModal}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogoutAdmin={handleLogoutAdmin}
      />

      <main style={{ flexGrow: 1 }}>
        {activePage === 'home' && <Home setActivePage={navigateToPage} />}
        {activePage === 'menu' && <Menu />}
        {activePage === 'loyalty' && <Loyalty />}
        {activePage === 'booking' && <Booking />}
        {activePage === 'qrmenu' && <QrMenu setActivePage={navigateToPage} />}
        {activePage === 'visitus' && <VisitUs setActivePage={navigateToPage} />}
        {activePage === 'admin' && (
          isAdminLoggedIn ? (
            <AdminDashboard 
              activeTab={adminTab} 
              setActiveTab={setAdminTab} 
              onExit={() => navigateToPage('home')}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px' }}>
              <h2>Access Denied</h2>
              <p>Please log in through the owner portal by clicking the logo in the header.</p>
              <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => setIsAdminModalOpen(true)}>
                OPEN OWNER LOGIN
              </button>
            </div>
          )
        )}
      </main>

      <Footer setActivePage={navigateToPage} />

      <MobileBottomNav
        activePage={activePage}
        setActivePage={navigateToPage}
        adminTab={adminTab}
        setAdminTab={setAdminTab}
      />

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

