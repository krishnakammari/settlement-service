import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import { asyncLocalStorage, logger } from './logger';
import { Settlement } from './models/Settlement';
import { calculateCharges, BookingCompletedEvent } from './services/billing';
import { capturePayment } from './services/payment';

export const app = express();

app.use(bodyParser.json());

// Middleware to inject traceId
app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'] as string || crypto.randomUUID();
  const store = new Map<string, string>();
  store.set('traceId', traceId);
  asyncLocalStorage.run(store, () => {
    next();
  });
});

app.post('/events/booking-completed', async (req, res) => {
  try {
    const event = req.body as BookingCompletedEvent;
    logger.info('Received BookingCompleted event', { bookingId: event.bookingId });

    // Idempotency check
    const existingSettlement = await Settlement.findOne({ bookingId: event.bookingId });
    if (existingSettlement) {
      logger.info('Settlement already processed for booking', { bookingId: event.bookingId });
      return res.status(200).json({ message: 'Already processed', settlement: existingSettlement });
    }

    const chargeBreakdown = calculateCharges(event);
    logger.info('Calculated charges', { chargeBreakdown });

    let gatewayFailureReason = null;
    let status = 'FAILED';

    try {
      await capturePayment({
        preAuthId: event.preAuthId,
        amountCents: chargeBreakdown.totalAmountCents,
        idempotencyKey: `capture_${event.bookingId}`
      });
      status = 'SETTLED';
      logger.info('Payment captured successfully', { bookingId: event.bookingId });
    } catch (error: any) {
      gatewayFailureReason = error.message;
      logger.error('Failed to capture payment after retries', { error: error.message });
      // Depending on requirements, we can choose to record the failed settlement or throw 500.
      // Persisting a FAILED settlement is usually better to record the outcome.
    }

    // Attempt to persist the settlement
    // Using a MongoDB unique constraint on bookingId provides safety against race conditions
    const settlement = new Settlement({
      bookingId: event.bookingId,
      userId: event.userId,
      baseFareCents: chargeBreakdown.baseFareCents,
      overageCents: chargeBreakdown.overageCents,
      lateFeeCents: chargeBreakdown.lateFeeCents,
      totalAmountCents: chargeBreakdown.totalAmountCents,
      preAuthId: event.preAuthId,
      status,
      gatewayFailureReason
    });

    try {
      await settlement.save();
      logger.info('Settlement saved', { settlementId: settlement._id });
    } catch (saveError: any) {
      // If a parallel request saved first, this throws a duplicate key error
      if (saveError.code === 11000) {
         logger.info('Concurrent request already processed settlement', { bookingId: event.bookingId });
         const existing = await Settlement.findOne({ bookingId: event.bookingId });
         return res.status(200).json({ message: 'Already processed', settlement: existing });
      }
      throw saveError;
    }

    if (status === 'SETTLED') {
       // Emit BookingSettled event
       logger.info('Emitting BookingSettled event', { bookingId: event.bookingId });
       // In a real system, this might go to Kafka/RabbitMQ or an HTTP webhook.
    }

    if (status === 'FAILED') {
       return res.status(500).json({ error: 'Failed to capture payment', settlement });
    }

    res.status(200).json({ message: 'Settlement complete', settlement });
  } catch (error: any) {
    logger.error('Error processing booking completed event', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/settlements/:bookingId', async (req, res) => {
  try {
    const settlement = await Settlement.findOne({ bookingId: req.params.bookingId });
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' });
    }
    res.status(200).json(settlement);
  } catch (error: any) {
    logger.error('Error fetching settlement', { error: error.stack });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
