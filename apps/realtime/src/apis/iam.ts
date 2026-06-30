import properties from '#properties';
import logger, { buildLogger } from '#logger';
import axios from 'axios';
import { getServiceToken } from './service_token';

export function createIamClient(traceId: string) {
    const log = buildLogger(traceId);
    const client = axios.create({ baseURL: properties.iamUri });

    client.interceptors.request.use(async (config) => {
        if (!config.headers.Authorization) {
            config.headers.Authorization = await getServiceToken();
        }
        config.headers['x-trace-id'] = traceId;
        return config;
    });

    client.interceptors.response.use(undefined, (error) => {
        if (axios.isAxiosError(error)) {
            log.error({ status: error.response?.status, message: error.response?.data, url: error.config?.url }, 'iamApi error');
        } else {
            log.error(error, 'iamApi error');
        }
        return Promise.reject(error);
    });

    return client;
}

// singleton sem traceId — usado em contextos sem request (ex: daily_manager)
export const iamApi = axios.create({ baseURL: properties.iamUri });

iamApi.interceptors.request.use(async (config) => {
    if (!config.headers.Authorization) {
        config.headers.Authorization = await getServiceToken();
    }
    return config;
});

iamApi.interceptors.response.use(undefined, (error) => {
    if (axios.isAxiosError(error)) {
        logger.error({ status: error.response?.status, message: error.response?.data, url: error.config?.url }, 'iamApi error');
    } else {
        logger.error(error, 'iamApi error');
    }
    return Promise.reject(error);
});
