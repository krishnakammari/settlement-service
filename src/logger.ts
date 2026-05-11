import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

export const asyncLocalStorage = new AsyncLocalStorage<Map<string, string>>();

const formatLog = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  const store = asyncLocalStorage.getStore();
  const traceId = store?.get('traceId') || 'no-trace-id';
  
  return JSON.stringify({
    timestamp,
    level,
    traceId,
    message,
    ...metadata
  });
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    formatLog
  ),
  transports: [
    new winston.transports.Console()
  ]
});
