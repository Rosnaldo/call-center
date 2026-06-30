import pino from 'pino';
import { logBroadcaster } from './websocket/log_broadcaster';

const logger = pino(
    { name: 'realtime', level: 'info' },
    pino.multistream([
        { stream: process.stdout },
        { stream: logBroadcaster },
    ]),
);

export default logger;
