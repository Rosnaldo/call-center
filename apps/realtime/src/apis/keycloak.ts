import properties from "#properties";
import axios from "axios";

export const keycloakApi = axios.create({
    baseURL: `${properties.keycloakUri}/realms/poc`,
});

keycloakApi.interceptors.response.use(undefined, (error) => {
    if (axios.isAxiosError(error)) {
        console.error({
            status: error.response?.status,
            message: error.response?.data,
            url: error.config?.url,
        });
    } else {
        console.error(error);
    }
    return Promise.reject(error);
});
