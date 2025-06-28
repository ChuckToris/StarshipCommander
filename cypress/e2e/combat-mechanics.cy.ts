describe('Command Deck Simulator - Combat Mechanics', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForGameReady()
  })

  it('demonstrates weapon range mechanics', () => {
    // Start at 30km - weapons should be out of range except missiles
    cy.get('[data-testid="distance-display"]').should('contain', '30 km')
    
    // Try to hover over disabled laser to see tooltip
    cy.get('[data-testid="btn-fire-laser-laser-1"]').should('be.disabled')
    
    // Pass turns to get into range
    let currentTurn = 1
    while (currentTurn < 10) {
      cy.get('[data-testid="btn-pass"]').click()
      currentTurn++
      
      // Check if we're in laser range (12km)
      cy.get('[data-testid="distance-display"]').then(($el) => {
        const distanceText = $el.text()
        const distance = parseInt(distanceText.replace(' km', ''))
        
        if (distance <= 12) {
          // Should be able to fire laser now
          cy.get('[data-testid="btn-fire-laser-laser-1"]').should('not.be.disabled')
          return false // break the loop
        }
      })
    }
  })

  it('shows missile system working', () => {
    // Missiles should work at any range
    cy.get('[data-testid="btn-launch-missiles-missile-1"]').should('not.be.disabled')
    
    // Launch missiles
    cy.get('[data-testid="btn-launch-missiles-missile-1"]').click()
    
    // Turn should increment
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
    
    // Missile launcher should now be on cooldown
    cy.get('[data-testid="btn-launch-missiles-missile-1"]').should('be.disabled')
    
    // Continue turns to see missiles travel and potentially impact
    for (let i = 0; i < 5; i++) {
      cy.get('[data-testid="btn-pass"]').click()
    }
  })

  it('demonstrates movement system', () => {
    // Record initial distance  
    cy.get('[data-testid="distance-display"]').should('contain', '30 km')
    
    // Pass a turn
    cy.get('[data-testid="btn-pass"]').click()
    cy.get('[data-testid="turn-number"]').should('contain', 'Turn 2')
    
    // Distance should decrease from initial 30km
    cy.get('[data-testid="distance-display"]').should('not.contain', '30 km')
    cy.get('[data-testid="distance-display"]').should('contain', 'km')
  })

  it('shows damage and health systems', () => {
    // Check initial health values
    cy.contains('100%').should('be.visible') // Shields should be at 100%
    
    // Get close enough for combat
    for (let i = 0; i < 10; i++) {
      cy.get('[data-testid="btn-pass"]').click()
      
      // Check if distance is very low (combat range)
      cy.get('[data-testid="distance-display"]').then(($el) => {
        const distance = parseInt($el.text().replace(' km', ''))
        if (distance <= 5) {
          return false // stop loop
        }
      })
    }
    
    // At this point we should be in close combat
    // Continue turns to potentially take damage
    for (let i = 0; i < 5; i++) {
      cy.get('[data-testid="btn-pass"]').click()
    }
  })

  it('shows point defense system', () => {
    // Launch missiles to trigger point defense
    cy.get('[data-testid="btn-launch-missiles-missile-1"]').click()
    
    // Continue turns - point defense should engage when missiles get close
    for (let i = 0; i < 8; i++) {
      cy.get('[data-testid="btn-pass"]').click()
    }
    
    // Check if there are any missile-related logs or point defense activity
    // (This is more of a visual/log check since PD happens automatically)
  })
})