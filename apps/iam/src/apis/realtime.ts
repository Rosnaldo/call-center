import properties from '#properties';
import axios from 'axios';

export const realtimeApi = axios.create({
    baseURL: properties.realtimeUri,
});
