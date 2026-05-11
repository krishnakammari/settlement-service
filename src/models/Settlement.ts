import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  baseFareCents: { type: Number, required: true },
  overageCents: { type: Number, required: true },
  lateFeeCents: { type: Number, required: true },
  totalAmountCents: { type: Number, required: true },
  preAuthId: { type: String, required: true },
  status: { type: String, enum: ['SETTLED', 'FAILED'], required: true },
  gatewayFailureReason: { type: String, required: false },
  createdAt: { type: Date, default: Date.now, immutable: true },
}, { timestamps: true });

// Immutable setting on schema level
settlementSchema.pre('save', function() {
  if (!this.isNew) {
    throw new Error('Settlement records are immutable');
  }
});

export const Settlement = mongoose.model('Settlement', settlementSchema);
