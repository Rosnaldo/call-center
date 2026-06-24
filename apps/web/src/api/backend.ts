import axios from 'axios';
import properties from '../properties';
import authSession from '../auth/session';

export const apiBack = axios.create();

apiBack.interceptors.request.use(async (config) => {
  config.baseURL = properties.backendUrl;
  const token = await authSession.getToken();
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});
