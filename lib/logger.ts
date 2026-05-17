// lib/logger.ts
import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: ['email', 'password', 'token', 'idToken', 'refreshToken'],
});

export default logger;
