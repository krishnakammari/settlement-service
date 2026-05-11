export interface BookingCompletedEvent {
  event: string;
  bookingId: string;
  userId: string;
  scheduledEnd: string;
  actualEnd: string;
  includedUnits: number;
  actualUnits: number;
  baseFareCents: number;
  preAuthId: string;
  preAuthAmountCents: number;
}

export interface ChargeBreakdown {
  baseFareCents: number;
  overageCents: number;
  lateFeeCents: number;
  totalAmountCents: number;
}

export const CENTS_PER_OVERAGE_UNIT = 25;
export const CENTS_PER_LATE_HOUR = 1500;

export function calculateCharges(event: BookingCompletedEvent): ChargeBreakdown {
  const overageUnits = Math.max(0, event.actualUnits - event.includedUnits);
  const overageCents = overageUnits * CENTS_PER_OVERAGE_UNIT;

  const scheduledEnd = new Date(event.scheduledEnd);
  const actualEnd = new Date(event.actualEnd);
  
  let lateFeeCents = 0;
  if (actualEnd > scheduledEnd) {
    const diffMs = actualEnd.getTime() - scheduledEnd.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60)); // round up per hour started
    lateFeeCents = diffHours * CENTS_PER_LATE_HOUR;
  }

  const totalAmountCents = event.baseFareCents + overageCents + lateFeeCents;

  return {
    baseFareCents: event.baseFareCents,
    overageCents,
    lateFeeCents,
    totalAmountCents
  };
}
