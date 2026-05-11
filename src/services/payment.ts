import retry from 'async-retry';
import { logger } from '../logger';

export interface CaptureRequest {
  preAuthId: string;
  amountCents: number;
  idempotencyKey: string;
}

export class PaymentGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}

export const capturePayment = async (request: CaptureRequest): Promise<{ success: boolean; transactionId?: string }> => {
  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000/capture';

  const runCapture = async () => {
    // Use AbortController for setting a client-side timeout so we don't wait 10s if the mock sleeps
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gateway returned status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.warn(`Payment capture attempt failed`, { error: err.message, idempotencyKey: request.idempotencyKey });
      throw new Error(`Payment capture failed: ${err.message}`);
    }
  };

  return retry(
    async (bail) => {
      return await runCapture();
    },
    {
      retries: 5,
      minTimeout: 500,
      maxTimeout: 2000,
      onRetry: (error, attempt) => {
        logger.warn(`Retrying capturePayment: attempt ${attempt} failed.`);
      }
    }
  );
};
