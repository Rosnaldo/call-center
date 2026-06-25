describe('Call Flow — Customer calls Attendant', () => {

  it('customer selects an attendant and initiates a call', () => {
    // 1. Attendant logs in first so they appear as online
    cy.session('attendant', () => {
      cy.visit('/');
      cy.keycloakLogin(
        Cypress.env('ATTENDANT_EMAIL'),
        Cypress.env('ATTENDANT_PASSWORD'),
      );
      cy.url({ timeout: 30000 }).should('include', '/attendant');
      cy.contains('João Atendente').should('be.visible');
    });

    // 2. Customer logs in
    cy.session('customer', () => {
      cy.visit('/');
      cy.keycloakLogin(
        Cypress.env('CUSTOMER_EMAIL'),
        Cypress.env('CUSTOMER_PASSWORD'),
      );
      cy.url({ timeout: 30000 }).should('include', '/customer');
      cy.contains('Maria Cliente').should('be.visible');
    });

    cy.visit('/');
    cy.url({ timeout: 30000 }).should('include', '/customer');

    // 3. Attendant should appear in the available attendants list
    cy.get('#attendants-desk-panel', { timeout: 15000 }).should('be.visible');
    cy.get('#attendants-desk-panel').contains('João Atendente').should('be.visible');

    // 4. Customer clicks "Chamar" to select the attendant
    cy.get('[id^="call-start-"]').first().click();

    // 5. Lobby view should open with the start call button
    cy.get('#call-lobby-view', { timeout: 10000 }).should('be.visible');
    cy.get('#lobby-start-call', { timeout: 10000 }).should('be.visible');

    // 6. Customer clicks "Call" to initiate the call
    cy.get('#lobby-start-call').click();

    // 7. View transitions to awaiting-answer (cancel button appears)
    cy.get('#lobby-cancel-call', { timeout: 10000 }).should('be.visible');
  });
});
