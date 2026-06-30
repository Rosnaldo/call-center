import pino from 'pino';
import { logBroadcaster } from './websocket/log_broadcaster';

const baseLogger = pino(
    {
        level: 'info',
        base: {
            service: 'realtime',
        },
        formatters: {
            level(label) {
                return { level: label };
            },
        },
    },
    pino.multistream([
        { stream: process.stdout },
        { stream: logBroadcaster },
    ]),
);

export const buildLogger = (traceId: string) =>
    baseLogger.child({ traceId });

export default baseLogger;
