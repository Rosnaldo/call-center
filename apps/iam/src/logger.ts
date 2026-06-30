import pino from 'pino';

const isProd = process.env.NODE_ENV === 'prod';

const logger = pino({
    name: 'iam',
    level: isProd ? 'warn' : 'info',
});

export default logger;
