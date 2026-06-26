import properties from '#properties';
import axios from 'axios';
import { getKcMain } from '../keycloak/singleton';

export const iamApi = axios.create({
    baseURL: properties.iamUri,
});

iamApi.interceptors.request.use(async (config) => {
    if (!config.headers.Authorization) {
        const kc = await getKcMain().getKcClientCredentials();
        config.headers.Authorization = kc.accessToken;
    }
    return config;
});

iamApi.interceptors.response.use(undefined, (error) => {
    if (axios.isAxiosError(error)) {
        console.error({
            status: error.response?.status,
            message: error.response?.data,
            url: error.config?.url,
        });
    } else {
        console.error(error);
    }
    return Promise.reject(error);
});
