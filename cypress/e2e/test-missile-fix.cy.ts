describe('Missile Button Test', () => {
  it('missile button should be enabled at start', () => {
    cy.visit('/')
    
    // Wait for game to load
    cy.get('[data-testid="game-screen"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 1')
    
    // Check missile button is enabled
    cy.get('[data-testid="btn-launch-missiles-missile-1"]').should('not.be.disabled')
    
    // Click missile button
    cy.get('[data-testid="btn-launch-missiles-missile-1"]').click()
    
    // Verify turn incremented
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
  })
})