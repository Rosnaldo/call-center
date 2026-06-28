import properties from "#properties";
import axios from "axios";
import logger from '#logger';

export const keycloakApi = axios.create({
    baseURL: `${properties.keycloakUri}/realms/poc`,
});

keycloakApi.interceptors.response.use(undefined, (error) => {
    if (axios.isAxiosError(error)) {
        logger.error({
            status: error.response?.status,
            message: error.response?.data,
            url: error.config?.url,
        }, 'keycloakApi error');
    } else {
        logger.error(error, 'keycloakApi error');
    }
    return Promise.reject(error);
});
