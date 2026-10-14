/**
 * Table Reservation Time Slots for Dasari's Darbar
 *
 * Requirements:
 * - Support same-day reservations from 12:30 PM through 10:00 PM.
 * - Generate every 30-minute slot, inclusive of both endpoints.
 * - The complete list must contain 20 slots, with no missing times.
 */

export function generateReservationSlots() {
  const slots = [];
  const START_MINS = 12 * 60 + 30; // 750 (12:30 PM)
  const END_MINS = 22 * 60;        // 1320 (10:00 PM)
  const STEP_MINS = 30;

  for (let mins = START_MINS; mins <= END_MINS; mins += STEP_MINS) {
    const hours24 = Math.floor(mins / 60);
    const minutes = mins % 60;
    const value = `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const timeFormatted = `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;

    let mealTag = '';
    if (mins >= 750 && mins <= 840) mealTag = ' (Lunch)';
    else if (mins > 840 && mins < 1080) mealTag = ' (Afternoon)';
    else if (mins >= 1080 && mins <= 1290) mealTag = ' (Dinner)';
    else if (mins >= 1300) mealTag = ' (Late Dinner)';

    slots.push({
      value,
      label: `${timeFormatted}${mealTag}`,
      timeFormatted
    });
  }

  return slots;
}

export const RESERVATION_SLOTS = generateReservationSlots();
export default RESERVATION_SLOTS;
