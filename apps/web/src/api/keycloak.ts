import Keycloak from 'keycloak-js';
import properties from '../properties';

export const keycloak = new Keycloak({
    url: properties.keycloakUrl,
    realm: properties.keycloakRealm,
    clientId: properties.keycloakClientId,
});
