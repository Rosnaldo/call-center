import properties from '#properties';
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
