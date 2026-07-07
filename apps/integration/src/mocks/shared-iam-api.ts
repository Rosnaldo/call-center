import axios from 'axios';

// Shared axios instance backing every mocked "realtime calls iam" module
// (realtime-calls-service, realtime-apis-iam). Tests configure it once via
// setBaseURL/setAuthToken and every mock that imports `api` picks it up.
export const api = axios.create();

export function setBaseURL(url: string): void {
    api.defaults.baseURL = url;
}

export function setAuthToken(token: string): void {
    api.defaults.headers.common['Authorization'] = token;
}
