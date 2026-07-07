import { api } from './shared-iam-api';

// Replaces apps/realtime/src/apis/iam.ts in tests — the real module fetches a
// service token from Keycloak (getServiceToken), which isn't reachable here.
// Both createIamClient(traceId) and iamApi are redirected to the same shared
// axios instance the test configures via setBaseURL/setAuthToken.
export const createIamClient = (_traceId: string) => api;

export const iamApi = api;
