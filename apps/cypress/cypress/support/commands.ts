declare global {
  namespace Cypress {
    interface Chainable {
      keycloakLogin(email: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('keycloakLogin', (email: string, password: string) => {
  cy.get('#username').should('be.visible').clear().type(email);
  cy.get('#password').should('be.visible').clear().type(password);
  cy.get('#kc-form-login button[type="submit"]').click();
});

export {};
