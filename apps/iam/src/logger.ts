import pino from 'pino';

const logger = pino({
    name: 'iam',
    level: 'info',
}, process.stdout);

export default logger;
