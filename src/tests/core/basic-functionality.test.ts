import { describe, it, expect } from 'vitest';
import { TurnEngine } from '../../domain/engine/turn-engine';
import { DamageCalculator } from '../../domain/combat/damage-calculator';
import { MissileManager } from '../../domain/missiles/missile-manager';
import { CommandFactory } from '../../domain/engine/commands';
import { EnemyAI } from '../../domain/ai/enemy-ai';
import { INITIAL_PLAYER_STATE, INITIAL_ENEMY, INITIAL_WEAPONS } from '../../domain/constants/balance';

describe('Core Game Functionality', () => {
  describe('Basic Systems', () => {
    it('TurnEngine can be instantiated', () => {
      const engine = new TurnEngine();
      expect(engine).toBeDefined();
    });

    it('Movement system works', () => {
      const engine = new TurnEngine();
      const gameState = {
        turnNumber: 1,
        player: { ...INITIAL_PLAYER_STATE },
        enemy: { ...INITIAL_ENEMY },
        weapons: [...INITIAL_WEAPONS],
        missiles: [],
        logs: [],
        gameOver: false,
        winner: null,
      };

      const initialDistance = gameState.enemy.distance;
      const newState = engine.executeTurn(gameState, { type: 'pass' });
      
      expect(newState.turnNumber).toBe(2);
      expect(newState.enemy.distance).toBeLessThan(initialDistance);
    });

    it('Damage calculator works', () => {
      const player = { ...INITIAL_PLAYER_STATE };
      const result = DamageCalculator.applyDamage(player, 50);
      
      expect(result.damageDealt).toBe(50);
      expect(player.shields).toBe(50); // 100 - 50 = 50
    });

    it('Missile manager works', () => {
      const manager = new MissileManager();
      const missiles = manager.launchMissileVolley(1, 2, 30, 20, 10);
      
      expect(missiles.length).toBe(2);
      expect(missiles[0].id).toBe('M1-1');
      expect(missiles[1].id).toBe('M1-2');
    });

    it('Commands can be created', () => {
      const command = CommandFactory.createCommand({ type: 'pass' });
      expect(command).toBeDefined();
      
      const fireCommand = CommandFactory.createCommand({ 
        type: 'fire-laser', 
        weaponId: 'laser-1' 
      });
      expect(fireCommand).toBeDefined();
    });

    it('Enemy AI works', () => {
      const ai = new EnemyAI();
      const enemy = { ...INITIAL_ENEMY };
      const player = { ...INITIAL_PLAYER_STATE };
      
      const result = ai.executeEnemyAttacks(enemy, player, 1);
      expect(result.actions).toBeDefined();
      expect(result.events).toBeDefined();
    });
  });

  describe('Game Flow', () => {
    it('Can play multiple turns', () => {
      const engine = new TurnEngine();
      let gameState = {
        turnNumber: 1,
        player: { ...INITIAL_PLAYER_STATE },
        enemy: { ...INITIAL_ENEMY },
        weapons: [...INITIAL_WEAPONS],
        missiles: [],
        logs: [],
        gameOver: false,
        winner: null,
      };

      const initialDistance = gameState.enemy.distance;
      
      // Play 3 turns
      for (let i = 0; i < 3; i++) {
        gameState = engine.executeTurn(gameState, { type: 'pass' });
      }
      
      expect(gameState.turnNumber).toBe(4);
      expect(gameState.enemy.distance).toBeLessThan(initialDistance);
      expect(gameState.logs.length).toBeGreaterThan(0);
    });

    it('Weapons can fire when in range', () => {
      const engine = new TurnEngine();
      const gameState = {
        turnNumber: 1,
        player: { ...INITIAL_PLAYER_STATE },
        enemy: { ...INITIAL_ENEMY, distance: 10 }, // Close enough for laser
        weapons: [...INITIAL_WEAPONS],
        missiles: [],
        logs: [],
        gameOver: false,
        winner: null,
      };

      const newState = engine.executeTurn(gameState, { 
        type: 'fire-laser', 
        weaponId: 'laser-1' 
      });
      
      expect(newState.turnNumber).toBe(2);
      
      // Weapon should be on cooldown
      const weapon = newState.weapons.find(w => w.id === 'laser-1');
      expect(weapon?.cooldown).toBeGreaterThan(0);
    });

    it('Missiles can be launched', () => {
      const engine = new TurnEngine();
      const gameState = {
        turnNumber: 1,
        player: { ...INITIAL_PLAYER_STATE },
        enemy: { ...INITIAL_ENEMY },
        weapons: [...INITIAL_WEAPONS],
        missiles: [],
        logs: [],
        gameOver: false,
        winner: null,
      };

      const newState = engine.executeTurn(gameState, { 
        type: 'launch-missiles', 
        weaponId: 'missile-1' 
      });
      
      expect(newState.missiles.length).toBeGreaterThan(0);
    });
  });
});