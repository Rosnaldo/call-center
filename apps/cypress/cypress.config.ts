import { defineConfig } from 'cypress';
import { MongoClient } from 'mongodb';

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
    setupNodeEvents(on) {
      on('task', {
        async 'db:seed'() {
          const client = new MongoClient('mongodb://admin:secret@localhost:27017/mydatabase?authSource=admin');
          try {
            await client.connect();
            const db = client.db('mydatabase');
            const users = db.collection('users');
            const now = new Date();

            await users.deleteMany({ email: { $in: ['customer@e2e.test', 'attendant@e2e.test'] } });
            await users.insertMany([
              {
                firstName: 'Maria',
                lastName: 'Cliente',
                slug: 'maria-cliente',
                email: 'customer@e2e.test',
                role: 'customer',
                tokens: 100,
                createdAt: now,
                updatedAt: now,
              },
              {
                firstName: 'João',
                lastName: 'Atendente',
                slug: 'joao-atendente',
                email: 'attendant@e2e.test',
                role: 'attendant',
                tokens: 0,
                createdAt: now,
                updatedAt: now,
              },
            ]);
          } finally {
            await client.close();
          }
          return null;
        },
      });
    },
  },
});
