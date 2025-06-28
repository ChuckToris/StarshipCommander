/// <reference types="cypress" />

// Custom commands for the Command Deck Simulator

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Wait for game to be ready (initial state loaded)
       */
      waitForGameReady(): Chainable<void>
      
      /**
       * Execute a game command and wait for turn completion
       */
      executeCommand(command: string): Chainable<void>
      
      /**
       * Check if a weapon button is enabled/disabled
       */
      checkWeaponState(weaponId: string, enabled: boolean): Chainable<void>
      
      /**
       * Wait for specific distance
       */
      waitForDistance(distance: number): Chainable<void>
      
      /**
       * Check hull/shields values
       */
      checkPlayerHealth(hull: number, shields: number): Chainable<void>
    }
  }
}

Cypress.Commands.add('waitForGameReady', () => {
  cy.get('[data-testid="game-screen"]', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="hud-status"]').should('be.visible')
  cy.contains('Turn 1').should('be.visible')
})

Cypress.Commands.add('executeCommand', (command: string) => {
  cy.get(`[data-testid="btn-${command}"]`).click()
  // Wait for turn number to increment
  cy.get('[data-testid="turn-number"]').should('not.contain', 'Turn 1')
})

Cypress.Commands.add('checkWeaponState', (weaponId: string, enabled: boolean) => {
  const button = cy.get(`[data-testid="btn-${weaponId}"]`)
  if (enabled) {
    button.should('not.be.disabled')
  } else {
    button.should('be.disabled')
  }
})

Cypress.Commands.add('waitForDistance', (distance: number) => {
  cy.get('[data-testid="distance-display"]').should('contain', `${distance} km`)
})

Cypress.Commands.add('checkPlayerHealth', (hull: number, shields: number) => {
  cy.get('[data-testid="player-hull"]').should('contain', hull)
  cy.get('[data-testid="player-shields"]').should('contain', `${shields}%`)
})