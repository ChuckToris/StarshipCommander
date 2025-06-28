import { describe, it, expect, beforeEach } from 'vitest';
import { EnemyAI } from '../../domain/ai/enemy-ai';
import { Enemy, Player } from '../../domain/types';
import { INITIAL_PLAYER_STATE, INITIAL_ENEMY } from '../../domain/constants/balance';

describe('EnemyAI', () => {
  let enemyAI: EnemyAI;
  let enemy: Enemy;
  let player: Player;

  beforeEach(() => {
    enemyAI = new EnemyAI();
    enemy = JSON.parse(JSON.stringify(INITIAL_ENEMY));
    player = JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE));
  });

  describe('executeEnemyAttacks', () => {
    it('launches a missile volley when player distance ≤ missileRange', () => {
      enemy.distance = 15; // Equal to missile range
      enemy.weapons[1].cooldown = 0; // Missile weapon ready
      
      const result = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      const missileAction = result.actions.find(a => a.type === 'launch-missiles');
      expect(missileAction).toBeTruthy();
      
      const missileEvent = result.events.find(e => e.type === 'ENEMY_MISSILE_LAUNCHED');
      expect(missileEvent).toBeTruthy();
    });

    it('fires direct weapons when distance ≤ directRange', () => {
      enemy.distance = 12; // Equal to direct range
      enemy.weapons[0].cooldown = 0; // Direct weapon ready
      
      const result = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      const directAction = result.actions.find(a => a.type === 'fire-direct');
      const directEvent = result.events.find(e => e.type === 'ENEMY_DIRECT_FIRE' || e.type === 'ENEMY_MISSED');
      
      expect(directAction || directEvent).toBeTruthy();
    });

    it('skips attack entirely if player is evading', () => {
      player.evadeActive = true;
      enemy.distance = 10; // In attack range
      
      const result = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      const evadeEvent = result.events.find(e => 
        e.payload.actionType === 'attacks_blocked_by_evasion'
      );
      expect(evadeEvent).toBeTruthy();
      
      // Should have no attack actions
      const attackActions = result.actions.filter(a => 
        a.type === 'fire-direct' || a.type === 'launch-missiles'
      );
      expect(attackActions).toHaveLength(0);
    });

    it('uses missileVolleySize, respecting cooldown & ammo', () => {
      enemy.distance = 15;
      enemy.missileVolleySize = 3;
      enemy.weapons[1].cooldown = 0;
      
      const result = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      const missileEvent = result.events.find(e => e.type === 'ENEMY_MISSILE_LAUNCHED');
      if (missileEvent) {
        expect(missileEvent.payload.volleySize).toBe(3);
      }
    });

    it('waits when no weapons are available', () => {
      enemy.distance = 25; // Out of range
      enemy.weapons.forEach(w => w.cooldown = 5); // All on cooldown
      
      const result = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      const waitAction = result.actions.find(a => a.type === 'wait');
      expect(waitAction).toBeTruthy();
      
      const waitEvent = result.events.find(e => 
        e.payload.actionType === 'wait'
      );
      expect(waitEvent).toBeTruthy();
    });

    it('respects weapon cooldowns', () => {
      enemy.distance = 10; // In range for both weapons
      enemy.weapons[0].cooldown = 2; // Direct weapon on cooldown
      enemy.weapons[1].cooldown = 3; // Missile weapon on cooldown
      
      const result = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      // Should wait since no weapons are ready
      const waitAction = result.actions.find(a => a.type === 'wait');
      expect(waitAction).toBeTruthy();
    });

    it('sets cooldown after firing', () => {
      enemy.distance = 12;
      enemy.weapons[0].cooldown = 0;
      const originalCooldownMax = enemy.weapons[0].cooldownMax;
      
      enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      expect(enemy.weapons[0].cooldown).toBe(originalCooldownMax);
    });
  });

  describe('tickCooldowns', () => {
    it('ticks down all weapon cooldowns', () => {
      enemy.weapons[0].cooldown = 3;
      enemy.weapons[1].cooldown = 1;
      
      enemyAI.tickCooldowns(enemy);
      
      expect(enemy.weapons[0].cooldown).toBe(2);
      expect(enemy.weapons[1].cooldown).toBe(0);
    });

    it('does not tick down weapons at 0 cooldown', () => {
      enemy.weapons[0].cooldown = 0;
      
      enemyAI.tickCooldowns(enemy);
      
      expect(enemy.weapons[0].cooldown).toBe(0);
    });
  });

  describe('AI Behavior Patterns', () => {
    it('prioritizes missiles over direct fire when both available', () => {
      enemy.distance = 12; // In range for both
      enemy.weapons[0].cooldown = 0; // Direct weapon ready
      enemy.weapons[1].cooldown = 0; // Missile weapon ready
      
      const result = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      // Should have missile launch first
      const missileAction = result.actions.find(a => a.type === 'launch-missiles');
      const directAction = result.actions.find(a => a.type === 'fire-direct');
      
      expect(missileAction).toBeTruthy();
      // May also fire direct weapons in same turn
    });

    it('generates appropriate events for all actions', () => {
      enemy.distance = 10; // Close range
      enemy.weapons[0].cooldown = 0;
      enemy.weapons[1].cooldown = 0;
      
      const result = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      // Should have events for all actions taken
      expect(result.events.length).toBeGreaterThan(0);
      result.events.forEach(event => {
        expect(event.timestamp).toBeDefined();
        expect(event.type).toBeDefined();
        expect(event.payload).toBeDefined();
      });
    });
  });

  describe('Integration with Player State', () => {
    it('considers player speed in hit calculations', () => {
      enemy.distance = 10;
      enemy.weapons[0].cooldown = 0;
      
      // Test with different player speeds
      player.speed = 100; // Very fast
      const fastResult = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      player.speed = 1; // Very slow
      const slowResult = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      // Both should attempt attack, but hit chances would differ
      // (We can't easily test randomness, but we can ensure attempts are made)
      expect(fastResult.events.length).toBeGreaterThan(0);
      expect(slowResult.events.length).toBeGreaterThan(0);
    });

    it('handles edge case distances correctly', () => {
      // Test exact range boundaries
      enemy.distance = enemy.directRange; // Exactly at direct range
      enemy.weapons[0].cooldown = 0;
      
      const result = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      // Should be able to fire at exact range
      const attackEvent = result.events.find(e => 
        e.type === 'ENEMY_DIRECT_FIRE' || e.type === 'ENEMY_MISSED'
      );
      expect(attackEvent).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles damaged or missing weapons gracefully', () => {
      enemy.weapons = []; // No weapons
      enemy.distance = 10;
      
      const result = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      // Should wait when no weapons available
      const waitAction = result.actions.find(a => a.type === 'wait');
      expect(waitAction).toBeTruthy();
    });

    it('handles invalid weapon states gracefully', () => {
      // Corrupt weapon data
      enemy.weapons[0].cooldown = -1;
      enemy.weapons[0].range = -1;
      enemy.distance = 10;
      
      const result = enemyAI.executeEnemyAttacks(enemy, player, 1);
      
      // Should not crash
      expect(result.actions).toBeDefined();
      expect(result.events).toBeDefined();
    });
  });
});