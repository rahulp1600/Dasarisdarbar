import React, { useState } from 'react';
import { dataStore } from '../services/store';
import { Search, UtensilsCrossed } from 'lucide-react';

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [filterVeg, setFilterVeg] = useState('all'); // 'all', 'veg', 'non-veg'
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = dataStore.getMenuItems();

  const filteredItems = menuItems.filter(item => {
    if (!item.is_available) return false;
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (filterVeg === 'veg' && !item.is_veg) return false;
    if (filterVeg === 'non-veg' && item.is_veg) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !item.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const categories = [
    { id: 'all', label: 'ALL DISHES', count: menuItems.length },
    { id: 'soups', label: 'SOUPS', count: menuItems.filter(i => i.category === 'soups').length },
    { id: 'starters', label: 'STARTERS & KEBABS', count: menuItems.filter(i => i.category === 'starters').length },
    { id: 'mandi', label: 'MANDI', count: menuItems.filter(i => i.category === 'mandi').length },
    { id: 'pulavs', label: 'PULAVS & BIRYANI', count: menuItems.filter(i => i.category === 'pulavs').length },
    { id: 'mains', label: 'MAIN COURSE', count: menuItems.filter(i => i.category === 'mains').length },
    { id: 'breads', label: 'ROTIS & FRIED RICE', count: menuItems.filter(i => i.category === 'breads').length },
    { id: 'desserts', label: 'DESSERTS & DRINKS', count: menuItems.filter(i => i.category === 'desserts').length }
  ];

  // Dynamic Top Section Visual Images (Updates dynamically when switching category tabs or diet filters)
  const getSectionVisuals = () => {
    if (filterVeg === 'veg') {
      return [
        { img: '/assets/food_photos/dish_soup_veg.png', title: 'Veg Corn & Clear Soups', sub: 'Pure vegetable broths from ₹110', tag: 'VEG SOUPS' },
        { img: '/assets/food_photos/dish_section_3_1.png', title: 'Paneer 65 & Manchuria', sub: 'Paneer Majestic & Babycorn 65 from ₹160', tag: 'VEG STARTERS' },
        { img: '/assets/food_photos/dish_section_4_1.png', title: 'Paneer Butter Masala & Dal', sub: 'Veg Kolhapuri, Kadai & Naans from ₹190', tag: 'VEG CURRIES' }
      ];
    }

    if (filterVeg === 'non-veg') {
      return [
        { img: '/assets/food_photos/dish_soup_chicken.png', title: 'Chicken Hot & Sour Soups', sub: 'Rich spicy chicken broths from ₹140', tag: 'NON-VEG SOUPS' },
        { img: '/assets/food_photos/dish_section_4_1.png', title: 'Basket Chicken & 65', sub: 'Chicken Majestic, Lollipops & Ghee Roast from ₹230', tag: 'CHICKEN STARTERS' },
        { img: '/assets/food_photos/dish_section_5_1.png', title: 'Tandoori Mandi & Mutton Fry', sub: 'Rajugari Kodi Pulao & Dum Biryani from ₹240', tag: 'MANDI & BIRYANI' }
      ];
    }

    switch (activeCategory) {
      case 'soups':
        return [
          { img: '/assets/food_photos/dish_soup_veg.png', title: 'Veg Corn & Manchow', sub: 'Fresh vegetable broths from ₹110', tag: 'VEG SOUPS' },
          { img: '/assets/food_photos/dish_soup_chicken.png', title: 'Chicken Manchow & Garlic', sub: 'Spicy chicken broths from ₹140', tag: 'NON-VEG SOUPS' }
        ];
      case 'starters':
        return [
          { img: '/assets/food_photos/dish_section_3_1.png', title: 'Paneer 65 & Manchuria', sub: 'Paneer Majestic, Babycorn 65 & Gobi 65 from ₹160', tag: 'VEG STARTERS' },
          { img: '/assets/food_photos/dish_section_4_1.png', title: 'Basket Chicken & Lollipops', sub: 'Chicken 65, Majestic & Ghee Roast from ₹230', tag: 'CHICKEN STARTERS' },
          { img: '/assets/food_photos/dish_section_5_1.png', title: 'Tandoori Chicken & Kebabs', sub: 'Chicken Tikka, Malai Kebab & Paneer Tikka from ₹210', tag: 'CHARCOAL KEBABS' }
        ];
      case 'mandi':
        return [
          { img: '/assets/mutton_mandi.jpg', title: 'Authentic Mutton Mandi', sub: 'Mutton 1Pc & Family Mandi Platters from ₹309', tag: 'ROYAL MUTTON MANDI' },
          { img: '/assets/food_photos/dish_section_5_1.png', title: 'Tandoori & Chicken Mandi', sub: '1Pc, 2Pc & Family Mandi Platters from ₹240', tag: 'CHICKEN MANDI' }
        ];

      case 'pulavs':
        return [
          { img: '/assets/food_photos/dish_section_6_1.png', title: 'Rajugari & Gongura Pulao', sub: 'Ulavacharu Kodi, Royyala & Teenmar Pulao from ₹250', tag: 'HYDERABADI PULAVS' },
          { img: '/assets/food_photos/dish_section_6_2.png', title: 'Dum Biryani & Mutton Fry Biryani', sub: 'Chicken, Paneer & Family Packs from ₹240', tag: 'ROYAL BIRYANI' }
        ];
      case 'mains':
        return [
          { img: '/assets/food_photos/dish_section_4_1.png', title: 'Paneer Butter Masala', sub: 'Veg Kolhapuri, Dal Tadka & Kadai Veg from ₹190', tag: 'VEG CURRIES' },
          { img: '/assets/food_photos/dish_section_5_1.png', title: 'Butter Chicken & Kaju Curry', sub: 'Handi Chicken, Mutton Curry & Special Masala from ₹260', tag: 'NON-VEG CURRIES' }
        ];
      case 'breads':
        return [
          { img: '/assets/food_photos/dish_section_4_1.png', title: 'Butter Naan & Garlic Naan', sub: 'Tandoori Roti, Cheese Naan & Kulchas from ₹25', tag: 'TANDOORI BREADS' },
          { img: '/assets/food_photos/dish_section_6_1.png', title: 'Chicken & Veg Fried Rice', sub: 'Schezwan Fried Rice & Soft Noodles from ₹180', tag: 'FRIED RICE & NOODLES' }
        ];
      case 'desserts':
        return [
          { img: '/assets/food_photos/dish_soup_veg.png', title: 'Apricot Delight & Double Ka Meetha', sub: 'Kadu Ki Kheer, Qurbani & Gulab Jamun from ₹40', tag: 'HYDERABADI DESSERTS' },
          { img: '/assets/food_photos/dish_soup_chicken.png', title: 'Goli Soda & Soft Drinks', sub: 'Chilled marble sodas & beverages from ₹20', tag: 'REFRESHING DRINKS' }
        ];
      default:
        return [
          { img: '/assets/food_photos/dish_soup_veg.png', title: 'Fresh Soups & Starters', sub: 'Veg & Non-Veg appetizers', tag: 'SOUPS & STARTERS' },
          { img: '/assets/food_photos/dish_section_3_1.png', title: 'Hyderabadi Mandi & Pulavs', sub: 'Rajugari & Gongura specialties', tag: 'ROYAL RICE' },
          { img: '/assets/food_photos/dish_section_4_1.png', title: 'Makhani & Kaju Curries', sub: 'Rotis, Naans & North Indian curries', tag: 'MAIN COURSE' },
          { img: '/assets/food_photos/dish_section_5_1.png', title: 'Apricot Delight & Desserts', sub: 'Authentic sweets & Goli Soda', tag: 'DESSERTS & DRINKS' }
        ];
    }
  };

  const currentVisuals = getSectionVisuals();

  return (
    <div className="section-dark" style={{ minHeight: '85vh', paddingTop: '40px', paddingBottom: '80px' }}>
      <div className="container">
        {/* Top Header Banner Card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(6, 69, 45, 0.95) 0%, rgba(11, 91, 59, 0.95) 100%)', borderRadius: 'var(--radius-lg)', padding: '36px 28px', marginBottom: '36px', border: '1px solid var(--gold-green)', boxShadow: 'var(--shadow-3d)' }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--gold-green)' }}>THE ROYAL MENU BOOK</div>
            <h1 className="section-title" style={{ fontSize: '38px', color: 'var(--white)', marginBottom: '12px' }}>
              Dasari's Darbar Menu
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', marginBottom: '24px', maxWidth: '600px' }}>
              Explore our complete collection of {menuItems.length} authentic dishes — cooked with pure ghee, hand-ground spices, and traditional recipes.
            </p>

            {/* Instant Search Input */}
            <div style={{ position: 'relative', maxWidth: '440px' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-green)' }} />
              <input
                type="text"
                placeholder="Search dish name (e.g. Basket Chicken, Mandi, Paneer)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 46px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--gold-green)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'var(--white)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Top Section Highlight Visual Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${currentVisuals.length > 2 ? '240px' : '320px'}, 1fr))`, gap: '20px', marginBottom: '36px' }}>
          {currentVisuals.map((visual, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '18px', border: '1px solid rgba(228, 196, 125, 0.3)', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(10px)', transition: 'transform 0.3s ease', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(228, 196, 125, 0.15)', border: '1px solid var(--gold-green)', color: 'var(--gold-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UtensilsCrossed size={22} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--gold-green)', fontWeight: '800', letterSpacing: '0.1em' }}>{visual.tag}</div>
                <div style={{ fontWeight: '800', fontSize: '15px', color: '#FFF', margin: '2px 0' }}>{visual.title}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{visual.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Category Tabs & Veg/Non-Veg Filter Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '36px', background: 'rgba(255,255,255,0.04)', padding: '16px 24px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="category-tabs" style={{ marginBottom: 0 }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <button
              style={{
                background: filterVeg === 'all' ? 'var(--gold-green)' : 'transparent',
                color: filterVeg === 'all' ? 'var(--ink)' : 'var(--white)',
                padding: '8px 18px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '800', cursor: 'pointer'
              }}
              onClick={() => setFilterVeg('all')}
            >
              ALL DISHES
            </button>
            <button
              style={{
                background: filterVeg === 'veg' ? '#2E7D32' : 'transparent',
                color: 'var(--white)',
                padding: '8px 18px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onClick={() => setFilterVeg('veg')}
            >
              <span className="veg-icon" style={{ borderColor: '#FFF' }}></span> VEG ONLY
            </button>
            <button
              style={{
                background: filterVeg === 'non-veg' ? 'var(--brand-red)' : 'transparent',
                color: 'var(--white)',
                padding: '8px 18px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onClick={() => setFilterVeg('non-veg')}
            >
              <span className="nonveg-icon" style={{ borderColor: '#FFF' }}></span> NON-VEG
            </button>
          </div>
        </div>

        {/* Clean Dish Cards Grid (No individual item photo thumbnails on every card as requested) */}
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', borderRadius: '16px' }}>
            No dishes found matching this search or filter criteria.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  backdropFilter: 'blur(8px)',
                  position: 'relative',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.borderColor = 'var(--gold-green)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                {/* Header row: Dish Name & Veg/NonVeg Dot Icon */}


                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.is_veg ? (
                      <span className="veg-icon" title="Vegetarian"></span>
                    ) : (
                      <span className="nonveg-icon" title="Non-Vegetarian"></span>
                    )}
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--white)', lineHeight: '1.2' }}>{item.name}</h3>
                  </div>

                  {item.tag && (
                    <span style={{
                      background: item.tag === 'popular' ? '#2E7D32' : item.tag === 'bestseller' ? 'var(--gold-white)' : 'var(--brand-red)',
                      color: 'var(--white)',
                      fontSize: '9px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {item.tag.replace('_', ' ')}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', flexGrow: 1, lineHeight: '1.4' }}>
                  {item.description || 'Authentic regional preparation served hot.'}
                </p>

                {/* Price & Diet Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', marginTop: 'auto' }}>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--gold-green)' }}>
                    {item.price ? `₹${item.price}` : 'Price on Request'}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {item.is_veg ? 'VEGETARIAN' : 'NON-VEG'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
