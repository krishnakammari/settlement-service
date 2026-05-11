import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

// Intentionally flaky: roughly 15% of calls should return a timeout or 500 error.
app.post('/capture', (req, res) => {
  const { preAuthId, amountCents, idempotencyKey } = req.body;
  
  if (!preAuthId || !amountCents || !idempotencyKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const rand = Math.random();
  if (rand < 0.075) {
    // 7.5% chance of 500 error
    console.log(`[MOCK GATEWAY] Simulating 500 Error for idempotencyKey: ${idempotencyKey}`);
    return res.status(500).json({ error: 'Internal Gateway Error' });
  } else if (rand < 0.15) {
    // 7.5% chance of timeout (simulate by not responding or responding very late)
    console.log(`[MOCK GATEWAY] Simulating Timeout for idempotencyKey: ${idempotencyKey}`);
    // Simulate timeout by waiting 10 seconds before replying 504
    setTimeout(() => {
      res.status(504).json({ error: 'Gateway Timeout' });
    }, 10000);
    return;
  }

  console.log(`[MOCK GATEWAY] Successful capture for idempotencyKey: ${idempotencyKey}`);
  res.status(200).json({ success: true, transactionId: `txn_${Math.floor(Math.random() * 1000000)}` });
});

const port = process.env.MOCK_PORT || 4000;
app.listen(port, () => {
  console.log(`Mock Gateway running on port ${port}`);
});
