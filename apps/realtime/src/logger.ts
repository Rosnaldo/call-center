import pino from 'pino';

const isProd = process.env.NODE_ENV === 'prod';

const logger = pino({
    name: 'realtime',
    level: isProd ? 'warn' : 'info',
});

export default logger;
