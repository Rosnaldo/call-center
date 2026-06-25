describe('Login Flow', () => {
  it('customer logs in via Keycloak and lands on customer page', () => {
    const email = Cypress.env('CUSTOMER_EMAIL');
    const password = Cypress.env('CUSTOMER_PASSWORD');

    cy.visit('/');

    cy.keycloakLogin(email, password);

    cy.url({ timeout: 30000 }).should('not.include', '/auth/');
    cy.url({ timeout: 30000 }).should('include', '/customer');

    cy.contains('Maria Cliente').should('be.visible');
  });
});
