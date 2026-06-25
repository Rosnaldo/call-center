import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://free-porn-block.local',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    chromeWebSecurity: false,
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 30000,
    env: {
      KEYCLOAK_BASE: 'https://free-porn-block.local/auth',
      KEYCLOAK_REALM: 'poc',
      KEYCLOAK_CLIENT_ID: 'login',
      CUSTOMER_EMAIL: 'customer@e2e.test',
      CUSTOMER_PASSWORD: 'Test1234!',
      ATTENDANT_EMAIL: 'attendant@e2e.test',
      ATTENDANT_PASSWORD: 'Test1234!',
    },
  },
});
