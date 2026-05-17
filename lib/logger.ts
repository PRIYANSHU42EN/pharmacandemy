// lib/logger.ts
import pino from 'pino';

// Suppress url.parse deprecation warnings to keep production dashboards green and clean
if (typeof process !== "undefined" && typeof process.emitWarning === "function") {
  const originalEmitWarning = process.emitWarning;
  if (!(originalEmitWarning as any)._isUrlParseSuppressor) {
    const wrapped = function (warning: any, ...args: any[]) {
      if (typeof warning === "string" && warning.includes("url.parse")) {
        return;
      }
      if (warning instanceof Error && warning.name === "DeprecationWarning" && warning.message.includes("url.parse")) {
        return;
      }
      return originalEmitWarning.call(process, warning, ...args as any);
    };
    (wrapped as any)._isUrlParseSuppressor = true;
    process.emitWarning = wrapped;
  }
}

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: ['email', 'password', 'token', 'idToken', 'refreshToken'],
});

export default logger;
