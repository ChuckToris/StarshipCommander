describe('Command Deck Simulator - Basic Game Flow', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForGameReady()
  })

  it('loads the game correctly', () => {
    // Check main UI elements are present
    cy.contains('Command Deck Simulator').should('be.visible')
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 1')
    cy.get('[data-testid="distance-display"]').should('contain', '30 km')
    
    // Check status bars are present
    cy.get('[data-testid="hud-status"]').should('be.visible')
    cy.contains('HULL Port').should('be.visible')
    cy.contains('SHIELDS').should('be.visible')
    
    // Check command buttons are present
    cy.get('[data-testid="btn-pass"]').should('be.visible')
    cy.get('[data-testid="btn-evade"]').should('be.visible')
  })

  it('can pass a turn', () => {
    // Pass turn and verify turn number increments
    cy.get('[data-testid="btn-pass"]').click()
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
    
    // Distance should decrease due to movement
    cy.get('[data-testid="distance-display"]').should('not.contain', '30 km')
  })

  it('can use evade command', () => {
    // Click evade button
    cy.get('[data-testid="btn-evade"]').click()
    
    // Turn should increment (command was executed)
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
    
    // Evade button should be enabled again for next turn
    cy.get('[data-testid="btn-evade"]').should('not.be.disabled')
  })

  it('shows weapon cooldowns', () => {
    // Missiles should be enabled at start (they have unlimited range)
    cy.get('[data-testid="btn-launch-missiles-missile-1"]').should('not.be.disabled')
    
    // Fire the weapon
    cy.get('[data-testid="btn-launch-missiles-missile-1"]').click()
    
    // After firing, weapon should have cooldown and be disabled
    cy.get('[data-testid="btn-launch-missiles-missile-1"]').should('be.disabled')
    
    // Check that turn incremented
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
  })

  it('shows range limitations', () => {
    // Initially at 30km, all weapons should be out of range except missiles
    cy.get('[data-testid="distance-display"]').should('contain', '30 km')
    
    // Laser should be disabled (range 12km)
    cy.get('[data-testid="btn-fire-laser-laser-1"]').should('be.disabled')
    
    // Pass several turns to get closer
    for (let i = 0; i < 3; i++) {
      cy.get('[data-testid="btn-pass"]').click()
    }
    
    // Should be closer now
    cy.get('[data-testid="distance-display"]').should('not.contain', '30 km')
  })

  it('can reset the game', () => {
    // Take some actions first
    cy.get('[data-testid="btn-pass"]').click()
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
    
    // Reset game
    cy.contains('Reset Game').click()
    
    // Should be back to initial state
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 1')
    cy.get('[data-testid="distance-display"]').should('contain', '30 km')
  })
})