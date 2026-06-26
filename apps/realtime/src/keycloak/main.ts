import KcAdminClient from '@keycloak/keycloak-admin-client';
import properties from '#properties';

const getKcAdminClient = () => {
    return new KcAdminClient({
        baseUrl: properties.keycloakUri,
        realmName: 'poc',
    });
};

export class KeycloakMain {
    private constructor() {}

    static async construir(): Promise<KeycloakMain> {
        return new KeycloakMain();
    }

    public getKcClientCredentials = async (): Promise<KcAdminClient> => {
        const clientCredentials = getKcAdminClient();
        await clientCredentials.auth({
            grantType: 'client_credentials',
            clientId: properties.keycloakClientId,
            clientSecret: properties.keycloakClientSecret,
        });
        return clientCredentials;
    };
}
