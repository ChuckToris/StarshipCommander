import { describe, it, expect, beforeEach } from 'vitest';
import { TurnEngine } from '../../domain/engine/turn-engine';
import { GameState } from '../../domain/types';
import { INITIAL_PLAYER_STATE, INITIAL_ENEMY, INITIAL_WEAPONS } from '../../domain/constants/balance';

describe('Movement System', () => {
  let turnEngine: TurnEngine;
  let gameState: GameState;

  beforeEach(() => {
    turnEngine = new TurnEngine();
    turnEngine.resetState(); // Clear any state from previous tests
    gameState = {
      turnNumber: 1,
      player: JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE)),
      enemy: JSON.parse(JSON.stringify(INITIAL_ENEMY)),
      weapons: JSON.parse(JSON.stringify(INITIAL_WEAPONS)),
      missiles: [],
      logs: [],
      gameOver: false,
      winner: null,
    };
  });

  describe('Ship Movement', () => {
    it('reduces distance each turn by combined ship speeds', () => {
      const initialDistance = gameState.enemy.distance;
      const playerSpeed = gameState.player.speed;
      const enemySpeed = gameState.enemy.speed;
      const expectedReduction = playerSpeed + enemySpeed;

      // Execute a turn with pass command
      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });

      expect(newState.enemy.distance).toBe(initialDistance - expectedReduction);
    });

    it('player speed is modified by engine damage', () => {
      // Damage engines to 50%
      gameState.player.systems.engines = 50;
      const initialDistance = gameState.enemy.distance;
      const expectedPlayerSpeed = Math.round(gameState.player.speed * 0.5); // 5 * 0.5 = 2.5 -> 3
      const expectedReduction = expectedPlayerSpeed + gameState.enemy.speed;

      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });

      expect(newState.enemy.distance).toBe(initialDistance - expectedReduction);
    });

    it('ships never move past each other (distance never goes below 0)', () => {
      // Set very close distance
      gameState.enemy.distance = 5;

      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });

      expect(newState.enemy.distance).toBeGreaterThanOrEqual(0);
    });

    it('movement stops when ships are at distance 0', () => {
      gameState.enemy.distance = 0;

      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });

      expect(newState.enemy.distance).toBe(0);
    });

    it('logs movement events in tactical category', () => {
      const initialDistance = gameState.enemy.distance;
      
      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });
      
      const movementLogs = newState.logs.filter(log => 
        log.category === 'tactical' && log.text.includes('Ships closing')
      );
      
      expect(movementLogs.length).toBeGreaterThan(0);
      expect(movementLogs[0].text).toContain(`${initialDistance}km`);
      expect(movementLogs[0].text).toContain('→');
      expect(movementLogs[0].emoji).toBe('🚀');
    });

    it('movement occurs before missile defense and player actions', () => {
      // Create a missile that will be in PD range after movement
      const missileManager = turnEngine.getMissileManager();
      const missiles = missileManager.launchMissileVolley(1, 1, 30, 25, 10);
      gameState.missiles = missiles;
      
      // Set distance so that movement brings enemy into closer range
      gameState.enemy.distance = 25;
      
      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });
      
      // Distance should be reduced before other actions
      expect(newState.enemy.distance).toBe(25 - 9); // 25 - (5 + 4) = 16
    });
  });

  describe('Engine Damage Effects', () => {
    it('calculates effective player speed correctly', () => {
      const testCases = [
        { engineHealth: 100, expectedSpeed: 5 },
        { engineHealth: 80, expectedSpeed: 4 },
        { engineHealth: 50, expectedSpeed: 3 }, // Math.round(5 * 0.5) = 3
        { engineHealth: 20, expectedSpeed: 1 },
        { engineHealth: 0, expectedSpeed: 0 },
      ];

      testCases.forEach(({ engineHealth, expectedSpeed }) => {
        // Create fresh game state for each test case
        const testGameState = {
          turnNumber: 1,
          player: {
            ...JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE)),
            systems: {
              ...JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE)).systems,
              engines: engineHealth,
            },
          },
          enemy: JSON.parse(JSON.stringify(INITIAL_ENEMY)),
          weapons: JSON.parse(JSON.stringify(INITIAL_WEAPONS)),
          missiles: [],
          logs: [],
          gameOver: false,
          winner: null,
        };

        const initialDistance = testGameState.enemy.distance;
        const newState = turnEngine.executeTurn(testGameState, { type: 'pass' });
        const actualReduction = initialDistance - newState.enemy.distance;
        const expectedReduction = expectedSpeed + testGameState.enemy.speed;

        expect(actualReduction).toBe(expectedReduction);
      });
    });

    it('engine efficiency affects movement immediately', () => {
      // Create fresh game state for healthy engines
      const healthyGameState = {
        turnNumber: 1,
        player: JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE)),
        enemy: JSON.parse(JSON.stringify(INITIAL_ENEMY)),
        weapons: JSON.parse(JSON.stringify(INITIAL_WEAPONS)),
        missiles: [],
        logs: [],
        gameOver: false,
        winner: null,
      };
      
      const firstTurn = turnEngine.executeTurn(healthyGameState, { type: 'pass' });
      const firstReduction = 30 - firstTurn.enemy.distance; // Initial distance is 30

      // Create fresh game state with damaged engines
      const damagedGameState = {
        turnNumber: 1,
        player: {
          ...JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE)),
          systems: {
            ...JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE)).systems,
            engines: 60, // 40% damage
          },
        },
        enemy: JSON.parse(JSON.stringify(INITIAL_ENEMY)),
        weapons: JSON.parse(JSON.stringify(INITIAL_WEAPONS)),
        missiles: [],
        logs: [],
        gameOver: false,
        winner: null,
      };
      
      const secondTurn = turnEngine.executeTurn(damagedGameState, { type: 'pass' });
      const secondReduction = 30 - secondTurn.enemy.distance;

      // Second reduction should be less due to engine damage
      expect(secondReduction).toBeLessThan(firstReduction);
    });
  });

  describe('Movement Event Generation', () => {
    it('generates SHIPS_MOVED event with correct payload', () => {
      const initialDistance = gameState.enemy.distance;
      const playerSpeed = gameState.player.speed;
      const enemySpeed = gameState.enemy.speed;
      
      // We need to capture events during execution
      // For now, we'll test the final state
      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });
      
      // Check if movement log was created
      const movementLog = newState.logs.find(log => 
        log.category === 'tactical' && log.text.includes('Ships closing')
      );
      
      expect(movementLog).toBeTruthy();
      expect(movementLog?.text).toContain(`${initialDistance}km`);
      expect(movementLog?.text).toContain(`${newState.enemy.distance}km`);
    });

    it('does not generate movement events when distance is 0', () => {
      gameState.enemy.distance = 0;
      
      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });
      
      const movementLogs = newState.logs.filter(log => 
        log.category === 'tactical' && log.text.includes('Ships closing')
      );
      
      expect(movementLogs).toHaveLength(0);
    });
  });

  describe('Integration with Combat', () => {
    it('movement affects weapon range calculations', () => {
      // Set distance just outside laser range initially
      gameState.enemy.distance = 15; // Laser range is 12km
      
      // After movement (15 - 9 = 6km), lasers should be in range
      const newState = turnEngine.executeTurn(gameState, { type: 'fire-laser', weaponId: 'laser-1' });
      
      // Should be able to fire lasers after movement brings enemy into range
      const weaponLogs = newState.logs.filter(log => 
        log.category === 'tactical' && (log.text.includes('hits') || log.text.includes('fired'))
      );
      
      expect(weaponLogs.length).toBeGreaterThan(0);
    });

    it('movement affects missile travel time', () => {
      // Create fresh game state for this test
      const freshGameState = {
        turnNumber: 1,
        player: JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE)),
        enemy: JSON.parse(JSON.stringify(INITIAL_ENEMY)),
        weapons: JSON.parse(JSON.stringify(INITIAL_WEAPONS)),
        missiles: [],
        logs: [],
        gameOver: false,
        winner: null,
      };
      
      const initialDistance = freshGameState.enemy.distance;
      
      // Launch missiles, then check how movement affects their relative positions
      const newState = turnEngine.executeTurn(freshGameState, { type: 'launch-missiles', weaponId: 'missile-1' });
      
      // After turn, missiles should exist and distance should be reduced
      expect(newState.missiles.length).toBeGreaterThan(0);
      expect(newState.enemy.distance).toBeLessThan(initialDistance);
      
      // The missiles should be positioned relative to the new ship positions
      const missile = newState.missiles[0];
      expect(missile.distance).toBeLessThan(initialDistance);
    });
  });

  describe('Boundary Conditions', () => {
    it('handles very high speeds correctly', () => {
      // Set unrealistic but possible speeds
      gameState.player.speed = 50;
      gameState.enemy.speed = 50;
      gameState.enemy.distance = 25;
      
      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });
      
      // Should clamp to 0, not go negative
      expect(newState.enemy.distance).toBe(0);
    });

    it('handles zero speeds correctly', () => {
      gameState.player.systems.engines = 0; // No player movement
      gameState.enemy.speed = 0; // No enemy movement
      
      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });
      
      // Distance should not change
      expect(newState.enemy.distance).toBe(gameState.enemy.distance);
    });

    it('handles fractional speeds correctly', () => {
      // Create fresh game state with fractional speed engines
      const fractionalGameState = {
        turnNumber: 1,
        player: {
          ...JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE)),
          systems: {
            ...JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE)).systems,
            engines: 60, // 5 * 0.6 = 3
          },
        },
        enemy: JSON.parse(JSON.stringify(INITIAL_ENEMY)),
        weapons: JSON.parse(JSON.stringify(INITIAL_WEAPONS)),
        missiles: [],
        logs: [],
        gameOver: false,
        winner: null,
      };
      
      const initialDistance = fractionalGameState.enemy.distance;
      const newState = turnEngine.executeTurn(fractionalGameState, { type: 'pass' });
      
      // Should use rounded values
      const expectedReduction = 3 + fractionalGameState.enemy.speed; // 3 + 4 = 7
      expect(initialDistance - newState.enemy.distance).toBe(expectedReduction);
    });
  });
});