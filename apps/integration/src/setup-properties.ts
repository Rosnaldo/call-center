import path from 'node:path';
import dotenv from 'dotenv';
import { Properties } from '../../web/src/properties';

dotenv.config({ path: path.resolve(__dirname, '.env') });

Properties.override({
    realtimeWsUrl: 'ws://test',
    backendUrl: 'http://localhost:5002',
    dailyDomain: process.env.VITE_DAILY_DOMAIN ?? '',
    dailyApiKey: process.env.VITE_DAILY_API_KEY ?? '',
});
