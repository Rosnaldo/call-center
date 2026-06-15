import properties from '#properties';
import axios from 'axios';

export const iamApi = axios.create({
    baseURL: properties.iamUri,
});
