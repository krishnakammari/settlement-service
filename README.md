# Settlement Service

This is the settlement service component of the booking platform. When a booking ends, this service computes the final charge, captures it via a pre-authorization held on a mock payment gateway, records the result immutably in MongoDB, and emits a `BookingSettled` event.

## Running the Application

This repository comes with a `docker-compose.yml` file to make running it locally as easy as possible. You only need Docker installed.

```bash
docker-compose up --build
```

This will spin up:
1. `mongodb` on port 27017
2. `mock-gateway` on port 4000
3. `settlement-service` on port 3000

Alternatively, if you have a local MongoDB running, you can run `npm install` and then `npm start` (with concurrently configured) or `docker-compose up mongodb` and `npm start`.

## Running Tests

Tests verify the billing calculation rules and the idempotency behavior under retry constraints with the mocked gateway.

```bash
npm test
```

## Key Design Decisions & Tradeoffs

1. **Idempotency**: Implemented by utilizing MongoDB `unique` constraint on the `bookingId` in the `Settlement` schema. Additionally, an initial lookup is done to quickly return a successful response if the event has already been processed. The idempotent key sent to the gateway is built using the booking ID: `capture_${event.bookingId}`.
2. **Retry Mechanism**: Utilized `async-retry` with exponential backoff to handle the intentionally flaky mock gateway (which fails with 5xx or times out 15% of the time).
3. **Immutability**: Implemented at the Mongoose schema layer by throwing an error inside the `pre('save')` hook if the document `isNew` flag is false.
4. **Structured Logging**: Using `winston`. A trace ID is generated (or read from incoming headers) using `crypto.randomUUID()` and passed implicitly down the call stack using Node's `AsyncLocalStorage`.
5. **Tradeoffs**:
   - The mock payment gateway's timeout is set to 10 seconds. In order to quickly fail and retry, an `AbortController` aborts the `fetch` request after 2 seconds inside `payment.ts`.
   - The application does not currently feature an actual event bus like Kafka or RabbitMQ. I noted where the `BookingSettled` event would be emitted.
   
## What I would do with more time
- Fully implement a message broker (e.g. RabbitMQ/Kafka) to asynchronously consume `BookingCompleted` and publish `BookingSettled`.
- Improve metric emission for payment success/failure rates.
- Improve testing coverage to include MongoDB failure edge-cases.
- Add an OpenAPI spec for the REST endpoints.