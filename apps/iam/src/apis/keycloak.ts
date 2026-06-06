import properties from "#properties";
import axios from "axios";

export const keycloakApi = axios.create({
    baseURL: `${properties.keycloakUri}/realms/poc`,
})
