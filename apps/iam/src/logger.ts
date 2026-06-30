import pino from 'pino';

const logger = pino({
    name: 'iam',
    level: 'info',
});

export default logger;
