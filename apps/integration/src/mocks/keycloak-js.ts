export default class Keycloak {
    authenticated = false;
    token: string | undefined;

    init() { return Promise.resolve(false); }
    login() { return Promise.resolve(); }
    logout() { return Promise.resolve(); }
    updateToken() { return Promise.resolve(false); }
}
