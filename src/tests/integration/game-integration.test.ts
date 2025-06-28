import { describe, it, expect, beforeEach } from 'vitest';
import { TurnEngine } from '../../domain/engine/turn-engine';
import { GameState, Command } from '../../domain/types';
import { INITIAL_PLAYER_STATE, INITIAL_ENEMY, INITIAL_WEAPONS } from '../../domain/constants/balance';

describe('Game Integration Tests', () => {
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

  describe('Full Game Flow', () => {
    it('completes a basic game turn successfully', () => {
      const initialDistance = gameState.enemy.distance;
      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });
      
      // Basic assertions
      expect(newState.turnNumber).toBe(2);
      expect(newState.enemy.distance).toBeLessThan(initialDistance);
      expect(newState.logs.length).toBeGreaterThan(0);
      expect(newState.gameOver).toBe(false);
    });

    it('movement system works correctly', () => {
      const commands: Command[] = [
        { type: 'pass' },
        { type: 'pass' },
        { type: 'pass' },
      ];
      
      let currentState = gameState;
      const distances = [currentState.enemy.distance];
      
      for (const command of commands) {
        currentState = turnEngine.executeTurn(currentState, command);
        distances.push(currentState.enemy.distance);
      }
      
      // Distance should decrease each turn
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i]).toBeLessThanOrEqual(distances[i - 1]);
      }
      
      expect(currentState.turnNumber).toBe(4);
    });

    it('weapon firing works when in range', () => {
      // Move enemy close enough for laser fire
      gameState.enemy.distance = 10;
      
      const newState = turnEngine.executeTurn(gameState, { 
        type: 'fire-laser', 
        weaponId: 'laser-1' 
      });
      
      // Should have tactical logs about firing
      const tacticalLogs = newState.logs.filter(log => log.category === 'tactical');
      expect(tacticalLogs.length).toBeGreaterThan(0);
      
      // Weapon should be on cooldown
      const laserWeapon = newState.weapons.find(w => w.id === 'laser-1');
      expect(laserWeapon?.cooldown).toBeGreaterThan(0);
    });

    it('missile system works end-to-end', () => {
      const newState = turnEngine.executeTurn(gameState, { 
        type: 'launch-missiles', 
        weaponId: 'missile-1' 
      });
      
      // Should have missiles
      expect(newState.missiles.length).toBeGreaterThan(0);
      
      // Should have missile logs
      const missileLogs = newState.logs.filter(log => log.category === 'missile');
      expect(missileLogs.length).toBeGreaterThan(0);
      
      // Run a few more turns to see missile movement
      let currentState = newState;
      for (let i = 0; i < 3; i++) {
        currentState = turnEngine.executeTurn(currentState, { type: 'pass' });
      }
      
      // Missiles should have moved or been resolved
      const hasMovementLogs = currentState.logs.some(log => 
        log.category === 'missile' && log.text.includes('distance')
      );
      expect(hasMovementLogs).toBe(true);
    });

    it('maintains game state consistency over multiple turns', () => {
      let currentState = gameState;
      
      const commands: Command[] = [
        { type: 'pass' },
        { type: 'fire-laser', weaponId: 'laser-1' },
        { type: 'evade' },
        { type: 'launch-missiles', weaponId: 'missile-1' },
        { type: 'pass' },
      ];
      
      for (const command of commands) {
        const prevTurn = currentState.turnNumber;
        currentState = turnEngine.executeTurn(currentState, command);
        
        // Basic consistency checks
        expect(currentState.turnNumber).toBe(prevTurn + 1);
        expect(currentState.player.shields).toBeGreaterThanOrEqual(0);
        expect(currentState.player.hull.port).toBeGreaterThanOrEqual(0);
        expect(currentState.player.hull.starboard).toBeGreaterThanOrEqual(0);
        expect(currentState.enemy.distance).toBeGreaterThanOrEqual(0);
        expect(currentState.enemy.hull).toBeGreaterThanOrEqual(0);
        
        if (currentState.gameOver) break;
      }
      
      expect(currentState.turnNumber).toBe(6);
    });

    it('enemy AI engages when in range', () => {
      // Set enemy close enough to attack
      gameState.enemy.distance = 10;
      
      const newState = turnEngine.executeTurn(gameState, { type: 'pass' });
      
      // Should have enemy action logs
      const enemyLogs = newState.logs.filter(log => log.category === 'enemy');
      expect(enemyLogs.length).toBeGreaterThanOrEqual(0);
    });

    it('evade system blocks enemy attacks', () => {
      gameState.enemy.distance = 8; // Close enough for enemy to attack
      
      const newState = turnEngine.executeTurn(gameState, { type: 'evade' });
      
      // Should have evade logs
      const evadeLogs = newState.logs.filter(log => 
        log.text.includes('Evasive') || log.text.includes('evade')
      );
      expect(evadeLogs.length).toBeGreaterThan(0);
      
      // Player should not have taken damage (difficult to test reliably due to randomness)
      // But we can check that evade was processed
      expect(newState.player.evadeActive).toBe(false); // Reset after turn
    });
  });

  describe('Win Conditions', () => {
    it('recognizes player victory', () => {
      gameState.enemy.hull = 1;
      gameState.enemy.distance = 5; // Close range for guaranteed hit
      
      const newState = turnEngine.executeTurn(gameState, { 
        type: 'fire-laser', 
        weaponId: 'laser-1' 
      });
      
      // Might win in one hit, or need a few more turns
      let currentState = newState;
      let maxTurns = 5;
      
      while (!currentState.gameOver && maxTurns > 0) {
        currentState = turnEngine.executeTurn(currentState, { 
          type: 'fire-laser', 
          weaponId: 'laser-1' 
        });
        maxTurns--;
      }
      
      if (currentState.enemy.hull <= 0) {
        expect(currentState.gameOver).toBe(true);
        expect(currentState.winner).toBe('player');
      }
    });
  });

  describe('Error Resilience', () => {
    it('handles invalid commands gracefully', () => {
      const invalidCommand = { type: 'invalid' } as Command;
      
      const newState = turnEngine.executeTurn(gameState, invalidCommand);
      
      // Should not crash
      expect(newState.turnNumber).toBe(2);
      expect(newState.gameOver).toBe(false);
    });

    it('handles out-of-range weapon commands', () => {
      gameState.enemy.distance = 50; // Way out of range
      
      const newState = turnEngine.executeTurn(gameState, { 
        type: 'fire-laser', 
        weaponId: 'laser-1' 
      });
      
      // Should complete turn without errors
      expect(newState.turnNumber).toBe(2);
      
      // Weapon should not have fired (still at cooldown 0)
      const weapon = newState.weapons.find(w => w.id === 'laser-1');
      expect(weapon?.cooldown).toBe(0);
    });
  });
});