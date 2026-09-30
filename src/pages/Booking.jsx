import React, { useState } from 'react';
import { Utensils, MessageSquare, CheckCircle, Calendar, Clock, Users } from 'lucide-react';
import { dataStore } from '../services/store';

export default function Booking() {
  const todayDateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const todayISOStr = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('4');
  const [bookingTime, setBookingTime] = useState('19:30');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleBooking = async (e) => {
    e.preventDefault();

    const bookingData = {
      name,
      phone,
      party_size: Number(partySize),
      booking_date: todayISOStr,
      booking_time: bookingTime,
      notes
    };

    await dataStore.addBooking(bookingData);
    setIsSuccess(true);

    // Format WhatsApp message
    const restaurantPhone = '918143324102';
    const message = `Hello Dasari's Darbar! I would like to reserve a table for TODAY (${todayDateStr}):
- Guest Name: ${name}
- Phone: ${phone}
- Party Size: ${partySize} Guest(s)
- Time Slot: ${bookingTime}
${notes ? `- Special Request: ${notes}` : ''}`;

    const waUrl = `https://wa.me/${restaurantPhone}?text=${encodeURIComponent(message)}`;

    // Redirect to WhatsApp after 1 second
    setTimeout(() => {
      window.open(waUrl, '_blank');
    }, 1000);
  };

  return (
    <div className="section-dark" style={{ minHeight: '80vh', paddingTop: '40px', paddingBottom: '60px' }}>
      <div className="container" style={{ maxWidth: '720px' }}>
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="eyebrow">DINE-IN TABLE RESERVATIONS</div>
          <h1 className="section-title" style={{ fontSize: '42px' }}>Reserve Your Table For Today</h1>
          
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
            marginTop: '12px',
            fontSize: '14px',
            fontWeight: '700'
          }}>
            <Calendar size={18} /> SAME-DAY RESERVATIONS ONLY • TODAY ({todayDateStr.toUpperCase()})
          </div>
        </div>

        <div style={{ background: 'var(--cream)', color: 'var(--ink)', padding: '36px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-3d)' }}>
          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <CheckCircle size={64} style={{ color: 'var(--bright-green)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '28px', color: 'var(--deep-green)', marginBottom: '12px' }}>
                Table Reservation Submitted!
              </h3>
              <p style={{ color: 'var(--muted-grey)', fontSize: '16px', marginBottom: '20px', maxWidth: '500px', margin: '0 auto 24px auto' }}>
                Your reservation for <strong>{name}</strong> at <strong>{bookingTime} Today</strong> has been saved. Opening WhatsApp to confirm with our staff...
              </p>

              <div>
                <button 
                  className="btn-primary" 
                  onClick={() => setIsSuccess(false)}
                  style={{ padding: '12px 28px' }}
                >
                  RESERVE ANOTHER TABLE
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBooking}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
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
                  <label className="form-label">Phone Number</label>
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

                <div className="form-group">
                  <label className="form-label">Time Slot Today</label>
                  <select
                    className="form-select"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                  >
                    <option value="12:30">12:30 PM (Lunch)</option>
                    <option value="13:00">1:00 PM (Lunch)</option>
                    <option value="13:30">1:30 PM (Lunch Peak)</option>
                    <option value="14:00">2:00 PM (Late Lunch)</option>
                    <option value="19:00">7:00 PM (Dinner Early)</option>
                    <option value="19:30">7:30 PM (Dinner Prime)</option>
                    <option value="20:00">8:00 PM (Dinner Prime)</option>
                    <option value="20:30">8:30 PM (Dinner Peak)</option>
                    <option value="21:00">9:00 PM (Late Dinner)</option>
                  </select>
                </div>
              </div>

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

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '16px' }}>
                <MessageSquare size={20} /> CONFIRM RESERVATION VIA WHATSAPP
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
