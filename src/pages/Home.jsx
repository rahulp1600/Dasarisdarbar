import React from 'react';
import { ArrowRight, Award, MapPin, Clock, QrCode, Phone } from 'lucide-react';
import CustomerReviewsSlider from '../components/CustomerReviewsSlider';

export default function Home({ setActivePage }) {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="section-cream" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        <div className="container">
          <div className="hero-card">
            <div>
              <div className="hero-tag">A TABLE FULL OF</div>
              <h1 className="hero-heading">FLAVOUR.</h1>
              <h2 className="hero-subtitle">Authentic Indian favourites, family-style.</h2>
              <p className="hero-description">
                From fiery starters to fragrant mandi and pulavs. Experience rich traditions and heartwarming flavours in the heart of Kothapet.
              </p>
              <div className="hero-cta">
                <button className="btn-primary" onClick={() => setActivePage('menu')} style={{ fontSize: '15px', padding: '14px 32px' }}>
                  VIEW MENU <ArrowRight size={18} />
                </button>
                <button className="btn-secondary" onClick={() => setActivePage('loyalty')} style={{ fontSize: '15px', padding: '12px 28px' }}>
                  LOYALTY <Award size={18} />
                </button>
              </div>
            </div>

            {/* Royal Highlight Card without images */}
            <div className="food-visual-card" style={{ background: 'linear-gradient(135deg, rgba(6, 69, 45, 0.95), rgba(11, 91, 59, 0.95))', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gold-green)', padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: 'var(--shadow-3d)' }}>
              <div style={{ color: 'var(--gold-green)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '8px' }}>THE DARBAR EXPERIENCE</div>
              <h3 style={{ color: '#FFF', fontSize: '22px', fontWeight: '800', margin: '0 0 10px 0' }}>100% Pure Ghee & Natural Spices</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                Every single dish at Dasari's Darbar is prepared fresh using slow-cooked traditional recipes, hand-ground masalas, and zero artificial colors.
              </p>
            </div>
          </div>

          {/* Quick Info Strip */}
          <div className="quick-info-strip">
            <div className="info-box">
              <div className="info-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} /> OPEN DAILY
              </div>
              <div className="info-val">12 PM – 12 AM</div>
            </div>

            <div className="info-box">
              <div className="info-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={14} /> CALL / RESERVATIONS
              </div>
              <div className="info-val">
                <a href="tel:+918143324102" style={{ color: 'var(--deep-green)', textDecoration: 'none', fontWeight: '800' }}>
                  +91 81433 24102
                </a>
              </div>
            </div>

            <div className="info-box">
              <div className="info-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} /> KOTHAPET
              </div>
              <div className="info-val">Hyderabad</div>
            </div>

            <div className="info-box" style={{ cursor: 'pointer' }} onClick={() => setActivePage('qrmenu')}>
              <div className="info-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <QrCode size={14} /> TABLE QR
              </div>
              <div className="info-val" style={{ color: 'var(--brand-red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View menu <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Highlights Section */}
      <section className="section-dark">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div className="eyebrow">OUR SPECIALITIES</div>
              <h2 className="section-title">Crafted for Royal Appetites</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', marginTop: '4px' }}>
                Handpicked customer favourites cooked with pure ghee and secret royal recipes. Swipe right to explore.
              </p>
            </div>
            <button className="btn-gold" onClick={() => setActivePage('menu')}>
              EXPLORE FULL MENU <ArrowRight size={16} />
            </button>
          </div>

          <div className="featured-dish-carousel">
            {[
              {
                id: 'basket_chicken',
                name: 'Basket Chicken',
                badge: 'MUST TRY',
                badgeBg: 'var(--brand-red)',
                desc: 'Crispy, generous, shareable signature fried chicken basket tossed in secret chef spices.',
                price: 351,
                tag: 'CRISPY • SHAREABLE',
                image: '/assets/food_photos/dish_section_4_1.png',
                is_veg: false
              },
              {
                id: 'tandoori_mandi',
                name: 'Tandoori Chicken Mandi',
                badge: 'BESTSELLER',
                badgeBg: 'var(--brand-red)',
                desc: 'Authentic Yemeni mandi rice served with charcoal smoky tandoori chicken roast.',
                price: 450,
                tag: 'AUTHENTIC MANDI',
                image: '/assets/food_photos/dish_section_5_1.png',
                is_veg: false
              },
              {
                id: 'rajugari_pulav',
                name: 'Raju Gari Kodi Pulav',
                badge: 'POPULAR',
                badgeBg: '#2E7D32',
                desc: 'Traditional Godavari style spicy chicken pulao simmered with pure country ghee.',
                price: 360,
                tag: 'PURE GHEE',
                image: '/assets/food_photos/dish_section_6_1.png',
                is_veg: false
              },
              {
                id: 'dum_biryani',
                name: 'Chicken Dum Biryani',
                badge: 'ROYAL SPECIAL',
                badgeBg: '#B87919',
                desc: 'Authentic Hyderabadi dum biryani cooked on slow flame with fragrant long-grain basmati.',
                price: 270,
                tag: 'HYDERABADI DUM',
                image: '/assets/food_photos/dish_section_6_2.png',
                is_veg: false
              },
              {
                id: 'paneer_majestic',
                name: 'Paneer Majestic',
                badge: 'VEG SPECIAL',
                badgeBg: '#2E7D32',
                desc: 'Tender paneer strips tossed in house spiced creamy yogurt sauce with crunchy curry leaves.',
                price: 200,
                tag: "CHEF'S SPECIAL",
                image: '/assets/food_photos/dish_section_3_1.png',
                is_veg: true
              },
              {
                id: 'mutton_mandi',
                name: 'Mutton Juicy Mandi',
                badge: 'GRAND FEAST',
                badgeBg: 'var(--brand-red)',
                desc: 'Tender, succulent slow-cooked mutton piece served over aromatic Arabian Mandi rice.',
                price: 309,
                tag: 'TENDER MUTTON',
                image: '/assets/mutton_mandi.jpg',
                is_veg: false
              }

            ].map((dish) => (
              <div key={dish.id} className="menu-card featured-dish-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div className="menu-item-title" style={{ marginTop: 0 }}>
                    {dish.name}
                    <span className={dish.is_veg ? 'veg-icon' : 'nonveg-icon'} title={dish.is_veg ? 'Veg' : 'Non-Veg'} style={{ marginLeft: '8px' }}></span>
                  </div>
                  <span className="card-badge" style={{ position: 'static', background: dish.badgeBg, fontSize: '10px', padding: '4px 10px' }}>
                    {dish.badge}
                  </span>
                </div>
                <p className="menu-item-desc" style={{ flexGrow: 1, marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>{dish.desc}</p>
                <div className="menu-card-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                  <span className="menu-price" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--gold-white)' }}>₹{dish.price}</span>
                  <span className="view-btn" style={{ fontSize: '11px', fontWeight: '700' }}>{dish.tag}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Customer Reviews Sliding Carousel */}
      <CustomerReviewsSlider />

      {/* Rewards Banner */}
      <section className="section-cream">
        <div className="container" style={{ background: 'var(--white)', padding: '48px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-3d)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--gold-white)' }}>DASARI'S REWARDS</div>
            <h2 style={{ fontSize: '32px', color: 'var(--deep-green)', marginBottom: '8px' }}>Every visit leaves a mark.</h2>
            <p style={{ color: 'var(--muted-grey)', fontSize: '15px' }}>Collect stamps on every visit and unlock free Biryani, Desserts, & up to 15% OFF discounts!</p>
          </div>
          <button className="btn-primary" onClick={() => setActivePage('loyalty')} style={{ padding: '14px 32px', fontSize: '15px' }}>
            JOIN LOYALTY PROGRAM <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
