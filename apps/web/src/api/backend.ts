import axios from 'axios';
import { keycloak } from './keycloak';
import properties from '../properties';

export const apiBack = axios.create({
  baseURL: properties.backendUrl,
});

apiBack.interceptors.request.use(async (config) => {
  if (keycloak.authenticated) {
    await keycloak.updateToken(30);
    config.headers.Authorization = `${keycloak.token}`;
  }
  return config;
});
