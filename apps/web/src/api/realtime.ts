import axios from 'axios';
import properties from '../properties';
import authSession from '../auth/session';

// realtime is only ever reached over websocket from here otherwise — this is
// the one plain HTTP call into it, so derive its base URL from the ws one
// (same host/path-prefix in every env, see .env.* files) rather than adding
// a whole separate config value for a single endpoint.
const toHttpUrl = (wsUrl: string): string => wsUrl.replace(/^ws/, 'http');

export const apiRealtime = axios.create();

apiRealtime.interceptors.request.use(async (config) => {
  config.baseURL = toHttpUrl(properties.realtimeWsUrl);
  const token = await authSession.getToken();
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});
