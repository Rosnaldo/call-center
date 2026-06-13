import axios from 'axios';
import { keycloak } from './keycloak';

export const apiBack = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

apiBack.interceptors.request.use(async (config) => {
  if (keycloak.authenticated) {
    await keycloak.updateToken(30);
    config.headers.Authorization = `${keycloak.token}`;
  }
  return config;
});
