import properties from '#properties';
import axios from 'axios';

export const realtimeApi = axios.create();

realtimeApi.interceptors.request.use((config) => {
    config.baseURL = properties.realtimeUri;
    return config;
});

realtimeApi.interceptors.response.use(undefined, (error) => {
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
