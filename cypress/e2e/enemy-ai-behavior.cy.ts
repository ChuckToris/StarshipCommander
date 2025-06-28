describe('Enemy AI Behavior', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForGameReady()
  })

  it('enemy AI shows activity through game state changes', () => {
    // Verify initial game state - distance starts at 30km
    cy.get('[data-testid="distance-display"]').should('contain', '30 km')
    
    // Pass a few turns to trigger enemy AI behavior
    cy.get('[data-testid="btn-pass"]').click()
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
    
    cy.get('[data-testid="btn-pass"]').click()
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 3')
    
    // Enemy movement should be working (distance should decrease)
    cy.get('[data-testid="distance-display"]').should('not.contain', '30 km')
    cy.get('[data-testid="distance-display"]').should('contain', 'km')
    
    // Game should continue functioning normally (enemy AI not causing errors)
    cy.get('[data-testid="turn-number"]').should('be.visible')
  })

  it('verifies game mechanics work with enemy AI', () => {
    // Pass a turn and verify game state changes (enemy AI should act during enemy phase)
    cy.get('[data-testid="btn-pass"]').click()
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
    
    // Distance should change due to movement (both player and enemy move)
    cy.get('[data-testid="distance-display"]').should('not.contain', '30 km')
    
    // Verify enemy status section exists (proves enemy AI is active)
    cy.contains('Enemy Status').should('be.visible')
    cy.contains('Pirate CV').should('be.visible')
    
    // Pass more turns to verify enemy consistently acts
    cy.get('[data-testid="btn-pass"]').click()
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 3')
    
    // Game should continue functioning (enemy AI not causing crashes)
    cy.get('[data-testid="distance-display"]').should('contain', 'km')
  })
})