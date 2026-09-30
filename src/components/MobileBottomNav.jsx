import React from 'react';
import { Home, Utensils, Award, MapPin, Calendar, Users, CheckCircle } from 'lucide-react';

export default function MobileBottomNav({ activePage, setActivePage, adminTab, setAdminTab }) {
  // If viewing admin dashboard on mobile, show admin-specific quick switch tabs
  if (activePage === 'admin') {
    const adminItems = [
      { id: 'menu', label: 'Menu', icon: Utensils },
      { id: 'visits', label: 'Visits', icon: CheckCircle },
      { id: 'customers', label: 'Users', icon: Users },
      { id: 'loyalty', label: 'Offers', icon: Award },
      { id: 'bookings', label: 'Tables', icon: Calendar },
    ];

    return (
      <nav className="mobile-bottom-nav admin-bottom-nav">
        {adminItems.map((item) => {
          const Icon = item.icon;
          const isActive = (adminTab || 'menu') === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setAdminTab && setAdminTab(item.id)}
              className={`mobile-nav-item ${isActive ? 'active admin-active' : ''}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'loyalty', label: 'Rewards', icon: Award },
    { id: 'booking', label: 'Book Table', icon: Calendar },
    { id: 'visitus', label: 'Visit Us', icon: MapPin },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
