import properties from '#properties';
import axios from 'axios';

export const dailyApi = axios.create({
    baseURL: 'https://api.daily.co/v1',
    headers: {
        Authorization: `Bearer ${properties.dailyApiKey}`,
    },
});
