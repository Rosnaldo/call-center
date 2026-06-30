import properties from '#properties';
import logger from '#logger';
import axios from 'axios';
import { getServiceToken } from './service_token';

export const iamApi = axios.create({
    baseURL: properties.iamUri,
});

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
