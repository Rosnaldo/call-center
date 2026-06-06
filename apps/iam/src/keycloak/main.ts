import KcAdminClient from '@keycloak/keycloak-admin-client';

import Properties from '#properties';
import { ServiceResponseException } from '#exceptions/service_response';

const originalFetch = global.fetch;

global.fetch = async (url, options) => {
  console.log('[FETCH]', options?.method, url);
  return originalFetch(url, options);
};

const getKcAdminClient = () => {
    return new KcAdminClient({
        baseUrl: Properties.keycloakUri,
        realmName: 'poc',
    });
};

export class KeycloakMain {
    private constructor() {}

    static async construir(): Promise<KeycloakMain> {
        return new KeycloakMain();
    }

    public getKcClientCredentials = async (): Promise<KcAdminClient> => {
        try {
            const clientCredentials = getKcAdminClient();
            await clientCredentials.auth({
                grantType: 'client_credentials',
                clientId: Properties.keycloakClientApiId,
                clientSecret: Properties.keycloakClientApiSecret,
            });

            return clientCredentials;
        } catch (error: unknown) {
            throw new ServiceResponseException('Erro getKcClientCredentials');
        }
    };
};
