import { calculateCharges, BookingCompletedEvent } from '../src/services/billing';

describe('calculateCharges', () => {
  it('should calculate base fare correctly with no overage and no late fee', () => {
    const event: BookingCompletedEvent = {
      event: 'BookingCompleted',
      bookingId: 'bk_1',
      userId: 'user_1',
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd: '2026-04-10T18:00:00Z',
      includedUnits: 200,
      actualUnits: 150,
      baseFareCents: 8500,
      preAuthId: 'auth_xyz',
      preAuthAmountCents: 50000
    };

    const result = calculateCharges(event);
    expect(result.baseFareCents).toBe(8500);
    expect(result.overageCents).toBe(0);
    expect(result.lateFeeCents).toBe(0);
    expect(result.totalAmountCents).toBe(8500);
  });

  it('should calculate overage correctly ($0.25 per unit)', () => {
    const event: BookingCompletedEvent = {
      event: 'BookingCompleted',
      bookingId: 'bk_1',
      userId: 'user_1',
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd: '2026-04-10T18:00:00Z',
      includedUnits: 200,
      actualUnits: 237,
      baseFareCents: 8500,
      preAuthId: 'auth_xyz',
      preAuthAmountCents: 50000
    };

    const result = calculateCharges(event);
    expect(result.overageCents).toBe(37 * 25); // 925
    expect(result.totalAmountCents).toBe(8500 + 925);
  });

  it('should calculate late fee correctly ($15 per hour started past scheduled end)', () => {
    const event: BookingCompletedEvent = {
      event: 'BookingCompleted',
      bookingId: 'bk_1',
      userId: 'user_1',
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd: '2026-04-10T19:30:00Z',
      includedUnits: 200,
      actualUnits: 200,
      baseFareCents: 8500,
      preAuthId: 'auth_xyz',
      preAuthAmountCents: 50000
    };

    const result = calculateCharges(event);
    // 1.5 hours late -> 2 hours started -> 2 * 1500 = 3000
    expect(result.lateFeeCents).toBe(3000);
    expect(result.totalAmountCents).toBe(8500 + 3000);
  });
});
