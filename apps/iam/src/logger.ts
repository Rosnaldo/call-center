import pino from 'pino';

const baseLogger = pino({
  level: 'info',
  base: {
    service: 'realtime',
  },
});

export const buildLogger = (traceId: string) =>
  baseLogger.child({ traceId });

export default baseLogger;