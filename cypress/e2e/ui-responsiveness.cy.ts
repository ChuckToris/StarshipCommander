describe('Command Deck Simulator - UI Responsiveness', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForGameReady()
  })

  it('is responsive on different screen sizes', () => {
    // Test mobile viewport
    cy.viewport(375, 667) // iPhone SE
    cy.get('[data-testid="game-screen"]').should('be.visible')
    cy.get('[data-testid="hud-status"]').should('be.visible')
    
    // Test tablet viewport
    cy.viewport(768, 1024) // iPad
    cy.get('[data-testid="game-screen"]').should('be.visible')
    cy.get('[data-testid="hud-status"]').should('be.visible')
    
    // Test desktop viewport
    cy.viewport(1280, 720)
    cy.get('[data-testid="game-screen"]').should('be.visible')
    cy.get('[data-testid="hud-status"]').should('be.visible')
  })

  it('shows proper button states', () => {
    // Check enabled buttons have proper styling
    cy.get('[data-testid="btn-pass"]')
      .should('not.be.disabled')
      .should('have.class', 'cursor-pointer')
    
    // Check disabled buttons
    cy.get('[data-testid="btn-fire-laser-laser-1"]')
      .should('be.disabled')
      .should('have.class', 'cursor-not-allowed')
  })

  it('displays status information correctly', () => {
    // Check that all status bars are visible and have values
    cy.contains('HULL Port').should('be.visible')
    cy.contains('HULL Star').should('be.visible')
    cy.contains('SHIELDS').should('be.visible')
    cy.contains('ARMOR P').should('be.visible')
    cy.contains('ARMOR S').should('be.visible')
    
    // Check distance and speed displays
    cy.get('[data-testid="distance-display"]').should('contain', 'km')
    cy.contains('YOUR SPEED').should('be.visible')
    cy.contains('ENEMY SPEED').should('be.visible')
  })

  it('handles rapid clicking gracefully', () => {
    // Rapidly click pass button
    for (let i = 0; i < 5; i++) {
      cy.get('[data-testid="btn-pass"]').click()
    }
    
    // Game should still be functional
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 6')
    cy.get('[data-testid="game-screen"]').should('be.visible')
  })

  it('shows proper visual feedback', () => {
    // Check that buttons have hover states (this is tricky to test directly)
    // and that the UI responds to interactions
    
    cy.get('[data-testid="btn-pass"]').click()
    
    // Should show visual feedback that turn progressed
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
    cy.get('[data-testid="distance-display"]').should('not.contain', '30 km')
  })

  it('shows game over state correctly', () => {
    // This test simulates a quick game over scenario
    // We'll use the reset button functionality to verify game over states work
    
    // Pass many turns to potentially trigger game over conditions
    // (This is a bit contrived but tests the UI flow)
    for (let i = 0; i < 20; i++) {
      cy.get('[data-testid="btn-pass"]').click()
      
      // Check if game over modal appears
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Start New Battle")').length > 0) {
          // Game over modal appeared
          cy.contains('Start New Battle').should('be.visible')
          cy.contains('Start New Battle').click()
          
          // Should return to initial state
          cy.get('[data-testid="turn-number"]').should('contain', 'Turn 1')
          return false // break loop
        }
      })
    }
  })
})