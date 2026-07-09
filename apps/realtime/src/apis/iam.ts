// Relative import, not '#properties' — the integration test suite's Jest
// config merges realtime and IAM aliases under one moduleNameMapper, and
// both apps use the bare '#properties' specifier for their own singleton.
// Jest can't disambiguate by importer, so a relative import is the only way
// this reliably resolves to *realtime's* Properties (the one
// apps/integration/tests/helpers/realtime-server.ts overrides iamUri on).
import properties from '../properties';
import { buildLogger } from '#logger';
import axios from 'axios';
import { getServiceToken } from './service_token';

// Deliberately a function, not a module-level singleton — it reads
// properties.iamUri fresh on every call, so it picks up
// Properties.override({ iamUri }) (see apps/integration/tests/helpers/realtime-server.ts)
// even when called long after this module was first loaded. traceId is
// optional for contexts with no request to attribute the call to (ex: daily_manager).
export function createIamClient(traceId = 'system') {
    const log = buildLogger(traceId);
    const client = axios.create({ baseURL: properties.iamUri });

    client.interceptors.request.use(async (config) => {
        if (!config.headers.Authorization) {
            config.headers.Authorization = await getServiceToken();
        }
        config.headers['x-trace-id'] = traceId;
        return config;
    });

    client.interceptors.response.use(undefined, (error) => {
        if (axios.isAxiosError(error)) {
            log.error({ status: error.response?.status, message: error.response?.data, url: error.config?.url }, 'iamApi error');
        } else {
            log.error(error, 'iamApi error');
        }
        return Promise.reject(error);
    });

    return client;
}
