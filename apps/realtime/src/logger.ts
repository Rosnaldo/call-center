import pino from 'pino';

const logger = pino({
    name: 'realtime',
    level: 'info',
});

export default logger;
