import pino from 'pino';

const baseLogger = pino({
    level: 'info',
    base: {
        service: 'iam',
    },
    formatters: {
        level(label) {
            return { level: label };
        },
    },
}, process.stdout);

export const buildLogger = (traceId: string) =>
    baseLogger.child({ traceId });

export default baseLogger;
