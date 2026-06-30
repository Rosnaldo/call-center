import properties from '#properties';
import axios from 'axios';
import { buildLogger } from '#logger';

export function createRealtimeClient(traceId: string) {
    const logger = buildLogger(traceId);
    const client = axios.create({ baseURL: properties.realtimeUri });

    client.interceptors.request.use((config) => {
        config.headers['x-trace-id'] = traceId;
        return config;
    });

    client.interceptors.response.use(undefined, (error) => {
        if (axios.isAxiosError(error)) {
            logger.error({
                status: error.response?.status,
                message: error.response?.data,
                url: error.config?.url,
            }, 'realtimeApi error');
        } else {
            logger.error(error, 'realtimeApi error');
        }
        return Promise.reject(error);
    });

    return client;
}
