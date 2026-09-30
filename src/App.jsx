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

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [adminTab, setAdminTab] = useState('menu');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

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
      setActivePage('admin');
    } else {
      setIsAdminModalOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setActivePage('admin');
  };

  const handleLogoutAdmin = () => {
    setIsAdminLoggedIn(false);
    setActivePage('home');
  };

  return (
    <div className="app-layout">
      <Navbar 
        activePage={activePage}
        setActivePage={setActivePage}
        onOpenAdminModal={handleOpenAdminModal}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogoutAdmin={handleLogoutAdmin}
      />

      <main style={{ flexGrow: 1 }}>
        {activePage === 'home' && <Home setActivePage={setActivePage} />}
        {activePage === 'menu' && <Menu />}
        {activePage === 'loyalty' && <Loyalty />}
        {activePage === 'booking' && <Booking />}
        {activePage === 'qrmenu' && <QrMenu setActivePage={setActivePage} />}
        {activePage === 'visitus' && <VisitUs setActivePage={setActivePage} />}
        {activePage === 'admin' && (
          isAdminLoggedIn ? (
            <AdminDashboard 
              activeTab={adminTab} 
              setActiveTab={setAdminTab} 
              onExit={() => setActivePage('home')}
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

      <Footer setActivePage={setActivePage} />

      <MobileBottomNav 
        activePage={activePage} 
        setActivePage={setActivePage} 
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

