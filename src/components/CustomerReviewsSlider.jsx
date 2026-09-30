import React, { useState, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, MessageSquare, ExternalLink, ShieldCheck, Heart } from 'lucide-react';

const REVIEWS = [
  {
    id: 1,
    name: 'Raghu_Hyd food lab',
    badge: 'Local Guide · 78 reviews · 117 photos',
    rating: 5,
    date: 'Edited a month ago',
    text: 'Dasari Darbar at Kotapet is an excellent place for family dinners, get-togethers with friends, and special occasions. The food is delicious, the service is prompt and courteous, and the overall dining experience is outstanding. The restaurant is spacious, offering comfortable seating for both regular dining and mandi-style meals, making it suitable for families and large groups. Kids also enjoy the atmosphere, which adds to the overall experience.',
    tag: 'Family & Mandi Dining',
    initial: 'R',
    avatarBg: '#0B5B3B'
  },
  {
    id: 2,
    name: 'Saikumar Reddy',
    badge: '4 reviews',
    rating: 5,
    date: '2 months ago',
    text: 'Amazing food and excellent taste! Highly recommended',
    tag: 'Highly Recommended',
    initial: 'S',
    avatarBg: '#E4C47D',
    textColor: '#06452D'
  },
  {
    id: 3,
    name: 'MANIDEEP GOUD NIMMALA',
    badge: 'Local Guide · 125 reviews · 3,844 photos',
    rating: 5,
    date: 'a day ago · NEW',
    text: 'Overall experience was good and we tried Chicken Mandi it was tasty',
    tag: 'Chicken Mandi',
    initial: 'M',
    avatarBg: '#A5262A'
  },
  {
    id: 4,
    name: 'Shakeel Pasha',
    badge: 'Local Guide · 173 reviews · 97 photos',
    rating: 5,
    date: 'a month ago',
    text: 'Overall loaded with tasty 🤤 food 💖 ...',
    tag: 'Tasty Food',
    initial: 'S',
    avatarBg: '#8B1E22'
  },
  {
    id: 5,
    name: 'Basavala Deepak',
    badge: '1 review',
    rating: 5,
    date: 'a month ago',
    text: 'Excellent service and special chicken biryani must try. Food: 5 | Service: 5 | Atmosphere: 5',
    tag: 'Special Chicken Biryani',
    initial: 'B',
    avatarBg: '#06452D'
  }
];

const GMAPS_REVIEW_URL = "https://www.google.com/maps/place/DASARI'S+DARBAR/@17.3665151,78.5422924,16.55z/data=!4m8!3m7!1s0x3bcb99005423798b:0x6d29f258f4c62afe!8m2!3d17.3663577!4d78.544067!9m1!1b1!16s%2Fg%2F11nr3d_4fc?entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D";

export default function CustomerReviewsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);

  // Autoplay timer: auto-advances every 4 seconds unless paused
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % REVIEWS.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % REVIEWS.length);
  };

  // Touch swipe support
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  const current = REVIEWS[currentIndex];

  return (
    <section 
      className="section-dark" 
      style={{ 
        padding: '70px 0',
        background: 'linear-gradient(180deg, #04271A 0%, #06452D 50%, #032116 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="eyebrow" style={{ color: 'var(--gold-green)', letterSpacing: '0.2em' }}>
            TESTIMONIALS & REVIEWS
          </div>
          <h2 className="section-title" style={{ fontSize: '36px', color: '#FFF', margin: '6px 0 10px' }}>
            What Our Customers Say
          </h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(228, 196, 125, 0.15)', border: '1px solid rgba(228, 196, 125, 0.3)', padding: '6px 16px', borderRadius: '30px' }}>
            <div style={{ display: 'flex', gap: '2px', color: '#FFC107' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={15} fill="#FFC107" strokeWidth={0} />
              ))}
            </div>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#FFF' }}>
              4.8 on Google Reviews
            </span>
          </div>
        </div>

        {/* Carousel Slider Card */}
        <div style={{ maxWidth: '780px', margin: '0 auto', position: 'relative' }}>
          <div 
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(228, 196, 125, 0.35)',
              borderRadius: '24px',
              padding: '36px 32px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(16px)',
              color: '#FFF',
              minHeight: '260px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.4s ease'
            }}
          >
            {/* Top row: Avatar, Name, Rating & Tag */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: current.avatarBg,
                    color: current.textColor || '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '900',
                    fontSize: '18px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    border: '1px solid var(--gold-green)'
                  }}>
                    {current.initial}
                  </div>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: '#FFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {current.name}
                      <ShieldCheck size={16} color="var(--gold-green)" />
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                      {current.badge} • <span style={{ color: 'rgba(228, 196, 125, 0.8)' }}>{current.date}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[...Array(current.rating)].map((_, i) => (
                      <Star key={i} size={16} fill="#FFC107" color="#FFC107" />
                    ))}
                  </div>
                  {current.tag && (
                    <span style={{
                      background: 'rgba(228, 196, 125, 0.2)',
                      color: 'var(--gold-green)',
                      border: '1px solid rgba(228, 196, 125, 0.35)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10.5px',
                      fontWeight: '800'
                    }}>
                      {current.tag}
                    </span>
                  )}
                </div>
              </div>

              {/* Review Text */}
              <p style={{
                fontSize: '15.5px',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.92)',
                fontStyle: 'normal',
                margin: '12px 0 0 0'
              }}>
                "{current.text}"
              </p>
            </div>

            {/* Bottom dots & controls row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              {/* Dot Indicators */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {REVIEWS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      width: currentIndex === idx ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      background: currentIndex === idx ? 'var(--gold-green)' : 'rgba(255,255,255,0.25)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    aria-label={`Go to review ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Previous / Next Arrow Controls */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrev}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  aria-label="Previous Review"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  aria-label="Next Review"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Prominent 'Write a Review' Button directly below the slider redirecting to Google Maps */}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <a
              href={GMAPS_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 32px',
                borderRadius: '30px',
                fontSize: '15px',
                fontWeight: '800',
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(228, 196, 125, 0.35)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(228, 196, 125, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(228, 196, 125, 0.35)';
              }}
            >
              <MessageSquare size={18} />
              WRITE A REVIEW ON GOOGLE
              <ExternalLink size={15} style={{ opacity: 0.8 }} />
            </a>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
              Opens directly in Google Maps • Share your dining experience
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
