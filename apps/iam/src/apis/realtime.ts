import properties from '#properties';
import axios from 'axios';
import logger from '#logger';

export const realtimeApi = axios.create();

realtimeApi.interceptors.request.use((config) => {
    config.baseURL = properties.realtimeUri;
    return config;
});

realtimeApi.interceptors.response.use(undefined, (error) => {
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
