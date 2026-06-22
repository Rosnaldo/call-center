import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

(globalThis as any).__importMeta = {
    env: {
        VITE_REALTIME_WS_URL: 'ws://test',
        VITE_DAILY_DOMAIN: process.env.VITE_DAILY_DOMAIN,
        VITE_DAILY_API_KEY: process.env.VITE_DAILY_API_KEY,
    },
};
