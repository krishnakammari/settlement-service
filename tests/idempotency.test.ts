import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import * as paymentService from '../src/services/payment';
import { Settlement } from '../src/models/Settlement';

describe('Idempotency and Settlement Processing', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Settlement.deleteMany({});
    jest.clearAllMocks();
  });

  it('should process settlement and be idempotent upon retry', async () => {
    // Mock the capturePayment method
    const captureMock = jest.spyOn(paymentService, 'capturePayment').mockResolvedValue({ success: true, transactionId: 'txn_123' });

    const eventPayload = {
      event: "BookingCompleted",
      bookingId: "bk_8f2a",
      userId: "user_123",
      scheduledEnd: "2026-04-10T18:00:00Z",
      actualEnd: "2026-04-10T19:30:00Z",
      includedUnits: 200,
      actualUnits: 237,
      baseFareCents: 8500,
      preAuthId: "auth_xyz",
      preAuthAmountCents: 50000
    };

    // First request
    const response1 = await request(app)
      .post('/events/booking-completed')
      .send(eventPayload)
      .expect(200);

    expect(response1.body.message).toBe('Settlement complete');
    expect(response1.body.settlement.status).toBe('SETTLED');
    expect(captureMock).toHaveBeenCalledTimes(1);

    // Second request with same payload
    const response2 = await request(app)
      .post('/events/booking-completed')
      .send(eventPayload)
      .expect(200);

    // Should return "Already processed" and not call the payment gateway again
    expect(response2.body.message).toBe('Already processed');
    expect(response2.body.settlement.status).toBe('SETTLED');
    expect(captureMock).toHaveBeenCalledTimes(1); // Still 1
  });
});
