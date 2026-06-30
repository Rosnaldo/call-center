import pino from 'pino';

const logger = pino({
    name: 'realtime',
    level: 'info',
}, process.stdout);

export default logger;
