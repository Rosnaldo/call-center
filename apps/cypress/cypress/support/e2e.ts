import './commands';

before(() => {
  cy.task('db:seed');
});
