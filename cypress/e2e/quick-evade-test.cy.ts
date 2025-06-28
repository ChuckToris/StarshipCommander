describe('Quick Evade Test', () => {
  it('evade works', () => {
    cy.visit('/')
    cy.get('[data-testid="game-screen"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="btn-evade"]').click()
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
  })
})