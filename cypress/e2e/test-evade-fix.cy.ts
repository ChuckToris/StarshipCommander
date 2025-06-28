describe('Evade Test', () => {
  it('evade button should show active state', () => {
    cy.visit('/')
    
    // Wait for game to load
    cy.get('[data-testid="game-screen"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 1')
    
    // Check evade button is enabled
    cy.get('[data-testid="btn-evade"]').should('not.be.disabled')
    
    // Click evade button
    cy.get('[data-testid="btn-evade"]').click()
    
    // Check that turn incremented (command was executed)
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
    
    // Check that evasive maneuvers message appears  
    cy.contains('Evasive maneuvers active - All enemy attacks blocked').should('be.visible')
    
    // Evade button should be disabled after use
    cy.get('[data-testid="btn-evade"]').should('be.disabled')
  })
})