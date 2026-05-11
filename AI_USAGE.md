# AI Usage

## AI Tools Used
- Google Gemini 3.1 Pro (High) (as Antigravity, an advanced agentic coding assistant)

## Prompts that worked well
1. "Imagine a booking platform where customers reserve a service for a period of time. When a booking ends, the platform needs to calculate what the customer owes... The Problem... Your Payment Gateway Mock..." (This provided excellent context and constraints, setting up the entire architecture correctly on the first attempt).
2. Fixing issues iteratively: When `p-retry` failed due to ESM issues, replacing it with `async-retry` via prompt implicitly drove the code edit.

## Where AI was wrong & How I caught it
- **Mongoose pre-save hook typings**: The AI initially used `.pre('save', function(next) { ... return next(new Error(...)) })` which caused a TypeScript compilation error because the callback parameter signatures for hooks changed in Mongoose 6/7. I caught this because `npm test` failed the TypeScript compile step natively with Jest, specifically failing `src/models/Settlement.ts:19:12 - error TS2349: This expression is not callable.` I fixed it by refactoring the hook to throw an error synchronously instead.
- **ESM Modules in Jest**: The AI included `uuid` and `p-retry` which are pure ESM packages in their latest versions, causing Jest (configured for CommonJS) to fail with `Unexpected token 'export'`. I caught this via test output. It was fixed by replacing `uuid` with Node's native `crypto.randomUUID()` and `p-retry` with `async-retry`.
