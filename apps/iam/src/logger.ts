import pino from 'pino';

const level = process.env.NODE_ENV === 'prod' ? 'info' : 'debug';

const baseLogger = pino({
  level,
  base: {
    service: 'iam',
  },
});

export const buildLogger = (traceId: string) =>
  baseLogger.child({ traceId });

export default baseLogger;