import properties from '#properties';
import axios from 'axios';

export const realtimeApi = axios.create();

realtimeApi.interceptors.request.use((config) => {
    config.baseURL = properties.realtimeUri;
    return config;
});
