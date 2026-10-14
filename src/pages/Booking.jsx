import React, { useState, useEffect } from 'react';
import { Utensils, MessageSquare, CheckCircle, Calendar, Clock, Users, Tag, Sparkles, Check, Info } from 'lucide-react';
import { dataStore } from '../services/store';
import backendApi from '../services/backendApi';
import { RESERVATION_SLOTS } from '../utils/reservationSlots';

export default function Booking() {
  const todayDateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const todayISOStr = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('4');
  const [bookingTime, setBookingTime] = useState('19:30');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  // Table Reservation Offers State
  const [availableOffers, setAvailableOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);

  // Load and validate active offers for today
  useEffect(() => {
    async function loadOffers() {
      // 1. Check local store active offers
      const localActive = dataStore.getActiveReservationOffers();

      // 2. Fetch from backend if available
      let backendActive = null;
      try {
        backendActive = await backendApi.getActiveReservationOffers();
      } catch (e) {
        console.warn('Backend reservation offers fetch error:', e.message);
      }

      const activeList = (backendActive && backendActive.length > 0) ? backendActive : localActive;

      // Strict client-side filter: only offers currently active and within valid date window
      const validForToday = activeList.filter(offer => {
        if (!offer.active) return false;
        if (offer.start_date && offer.start_date > todayISOStr) return false;
        if (offer.end_date && offer.end_date < todayISOStr) return false;
        return true;
      });

      setAvailableOffers(validForToday);
      if (validForToday.length > 0) {
        setSelectedOffer(validForToday[0]); // Default to first available active offer
      } else {
        setSelectedOffer(null);
      }
    }

    loadOffers();
  }, [todayISOStr]);

  const handleBooking = async (e) => {
    e.preventDefault();

    const selectedSlotObj = RESERVATION_SLOTS.find(s => s.value === bookingTime);
    const displayTime = selectedSlotObj ? selectedSlotObj.timeFormatted : bookingTime;

    const offerSnapshot = selectedOffer ? {
      id: selectedOffer.id,
      title: selectedOffer.title,
      description: selectedOffer.description,
      discount_percentage: Number(selectedOffer.discount_percentage) || null
    } : null;

    const bookingData = {
      name,
      phone,
      party_size: Number(partySize),
      booking_date: todayISOStr,
      booking_time: bookingTime,
      notes,
      offer_id: selectedOffer?.id || null,
      offer_title: selectedOffer?.title || null,
      offer_discount_percentage: selectedOffer?.discount_percentage || null,
      offer_snapshot: offerSnapshot
    };

    await dataStore.addBooking(bookingData);
    setIsSuccess(true);

    // Format WhatsApp reservation REQUEST message
    // Clearly distinguishes a request from a confirmed reservation
    const restaurantPhone = '918143324102';
    const message = `Hello Dasari's Darbar! I would like to REQUEST a table reservation for TODAY (${todayDateStr}):
- Guest Name: ${name}
- Phone: ${phone}
- Party Size: ${partySize} Guest(s)
- Time Slot: ${displayTime}
${selectedOffer ? `- Applied Offer Request: ${selectedOffer.title} (${selectedOffer.discount_percentage}% OFF)` : ''}
${notes ? `- Special Request: ${notes}` : ''}

*Please Note: This is a reservation request pending confirmation by restaurant staff. Opening WhatsApp does not confirm the reservation.*`;

    const waUrl = `https://wa.me/${restaurantPhone}?text=${encodeURIComponent(message)}`;
    setWhatsappUrl(waUrl);

    // Redirect to WhatsApp after 1.2 seconds
    setTimeout(() => {
      window.open(waUrl, '_blank');
    }, 1200);
  };

  const selectedSlot = RESERVATION_SLOTS.find(s => s.value === bookingTime);

  return (
    <div className="section-dark" style={{ minHeight: '80vh', paddingTop: '40px', paddingBottom: '60px' }}>
      <div className="container" style={{ maxWidth: '760px' }}>

        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="eyebrow">DINE-IN TABLE RESERVATIONS</div>
          <h1 className="section-title" style={{ fontSize: '42px', marginBottom: '10px' }}>
            Reserve Your Table For Today
          </h1>
          
          {/* Same-Day Notice Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            color: 'var(--gold-white)',
            padding: '10px 20px',
            borderRadius: '30px',
            marginTop: '8px',
            fontSize: '14px',
            fontWeight: '700'
          }}>
            <Calendar size={18} /> SAME-DAY RESERVATIONS ONLY • TODAY ({todayDateStr.toUpperCase()})
          </div>
        </div>

        {/* 1. Promotional Offer Banner Near Top of Booking Section */}
        {availableOffers.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 69, 45, 0.95) 0%, rgba(4, 46, 30, 0.98) 100%)',
            border: '1.5px solid var(--gold-green)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            color: '#FFF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{
                background: 'var(--gold-green)',
                color: '#06452D',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '900',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                letterSpacing: '0.05em'
              }}>
                <Sparkles size={13} /> EXCLUSIVE DINE-IN PROMOTION
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                Valid for new bookings today
              </span>
            </div>

            {availableOffers.map(offer => {
              const isSelected = selectedOffer && selectedOffer.id === offer.id;
              return (
                <div
                  key={offer.id}
                  onClick={() => setSelectedOffer(isSelected ? null : offer)}
                  style={{
                    background: isSelected ? 'rgba(228, 196, 125, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: isSelected ? '1.5px solid var(--gold-green)' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.2s ease',
                    marginBottom: availableOffers.length > 1 ? '10px' : '0'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '800', fontSize: '17px', color: 'var(--gold-white)' }}>
                        {offer.title}
                      </span>
                      <span style={{
                        background: '#E65100',
                        color: '#FFF',
                        fontSize: '12px',
                        fontWeight: '900',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        {offer.discount_percentage}% OFF
                      </span>
                    </div>
                    {offer.description && (
                      <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                        {offer.description}
                      </p>
                    )}
                  </div>

                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: isSelected ? 'var(--gold-green)' : 'transparent',
                    border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isSelected && <Check size={16} color="#06452D" strokeWidth={3} />}
                  </div>
                </div>
              );
            })}

            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={13} />
              <span>
                {selectedOffer
                  ? `Offer "${selectedOffer.title}" (${selectedOffer.discount_percentage}% OFF) will be included in your WhatsApp reservation request.`
                  : 'Click the card to apply this promotional offer to your reservation request.'}
              </span>
            </div>
          </div>
        )}

        {/* 2. Main Reservation Card */}
        <div style={{ background: 'var(--cream)', color: 'var(--ink)', padding: '36px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-3d)' }}>
          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '24px 10px' }}>
              <CheckCircle size={60} style={{ color: 'var(--bright-green)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '28px', color: 'var(--deep-green)', fontWeight: '800', marginBottom: '12px' }}>
                Table Reservation Request Submitted!
              </h3>

              <div style={{
                display: 'inline-block',
                background: '#FFF3E0',
                color: '#D97706',
                border: '1px solid #FCD34D',
                padding: '6px 18px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '800',
                letterSpacing: '0.04em',
                marginBottom: '20px'
              }}>
                STATUS: WAITING FOR CONFIRMATION
              </div>

              <p style={{ color: '#1F2937', fontSize: '16px', marginBottom: selectedOffer ? '12px' : '22px', lineHeight: 1.6 }}>
                Your table request for <strong>{name}</strong> at <strong>{selectedSlot ? selectedSlot.timeFormatted : bookingTime} Today</strong> is ready.
              </p>

              {selectedOffer && (
                <p style={{ color: 'var(--deep-green)', fontSize: '15px', marginBottom: '22px', lineHeight: 1.5 }}>
                  <strong>Requested Offer:</strong> {selectedOffer.title} ({selectedOffer.discount_percentage}% OFF)
                </p>
              )}

              <div style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '12px',
                padding: '20px 24px',
                maxWidth: '540px',
                margin: '0 auto 28px auto',
                textAlign: 'left',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ fontWeight: '800', fontSize: '15px', color: '#92400E', marginBottom: '10px' }}>
                  Important Note:
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151', lineHeight: 1.55 }}>
                  If you have already sent the message on WhatsApp, that's great! Please wait for confirmation from our staff.
                </p>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151', lineHeight: 1.55 }}>
                  If you have not sent the message yet, please{' '}
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#06452D', fontWeight: '700', textDecoration: 'underline' }}
                    >
                      send it on WhatsApp
                    </a>
                  ) : (
                    'send it on WhatsApp'
                  )}{' '}
                  to complete your request.
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#1F2937', fontWeight: '600', lineHeight: 1.55 }}>
                  Your table and discount are confirmed only after our staff confirms them.
                </p>
              </div>

              <div>
                <button 
                  className="btn-primary" 
                  onClick={() => setIsSuccess(false)}
                  style={{ padding: '12px 28px', fontSize: '14px', fontWeight: '700', letterSpacing: '0.04em' }}
                >
                  RESERVE ANOTHER TABLE
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBooking}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Srinivas Rao"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Party Size</label>
                  <select
                    className="form-select"
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                  >
                    <option value="1">1 Person</option>
                    <option value="2">2 Persons</option>
                    <option value="4">4 Persons</option>
                    <option value="6">6 Persons</option>
                    <option value="8">8+ Persons (Large Family)</option>
                  </select>
                </div>

                {/* 3. Table Reservation Time Slots (Exactly 20 Slots from 12:30 PM to 10:00 PM) */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Time Slot Today *</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted-grey)', fontWeight: 'normal' }}>
                      20 slots available (12:30 PM – 10:00 PM)
                    </span>
                  </label>
                  <select
                    className="form-select"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    required
                  >
                    {RESERVATION_SLOTS.map(slot => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Offer Selected Summary Pill */}
              {selectedOffer && (
                <div style={{
                  background: 'rgba(6, 69, 45, 0.08)',
                  border: '1px solid var(--gold-green)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  color: 'var(--deep-green)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={16} color="var(--gold-green)" />
                    <span>
                      Applying Offer: <strong>{selectedOffer.title}</strong> ({selectedOffer.discount_percentage}% OFF)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOffer(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#C62828',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '700'
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Special Notes / Requests (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="e.g. High chair needed, window preference, birthday celebration"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>

              <div style={{ marginBottom: '14px', fontSize: '12px', color: 'var(--muted-grey)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} />
                <span>
                  Submitting forwards your booking request to Dasari's Darbar staff via WhatsApp for live table confirmation.
                </span>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '16px' }}>
                <MessageSquare size={20} /> SEND RESERVATION REQUEST VIA WHATSAPP
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
