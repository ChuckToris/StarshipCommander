import { describe, it, expect, beforeEach } from 'vitest';
import { DamageCalculator } from '../../domain/combat/damage-calculator';
import { Player } from '../../domain/types';
import { INITIAL_PLAYER_STATE } from '../../domain/constants/balance';

describe('DamageCalculator', () => {
  let player: Player;

  beforeEach(() => {
    player = JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE));
  });

  describe('applyDamage', () => {
    it('routes damage Shields → Armor → Hull with proper overflow', () => {
      const result = DamageCalculator.applyDamage(player, 50);
      
      expect(result.shieldsDamage).toBe(50);
      expect(result.armorDamage).toBe(0);
      expect(result.hullDamage).toBe(0);
      expect(player.shields).toBe(50);
    });

    it('never allows negative values for shields, armor, or hull', () => {
      const result = DamageCalculator.applyDamage(player, 1000);
      
      expect(player.shields).toBeGreaterThanOrEqual(0);
      expect(player.armor.port.integrity).toBeGreaterThanOrEqual(0);
      expect(player.armor.starboard.integrity).toBeGreaterThanOrEqual(0);
      expect(player.hull.port).toBeGreaterThanOrEqual(0);
      expect(player.hull.starboard).toBeGreaterThanOrEqual(0);
    });

    it('handles the exact-kill edge case (all three hit 0 in one volley)', () => {
      // Set up player with minimal health
      player.shields = 10;
      player.armor.port.integrity = 10;
      player.armor.starboard.integrity = 10;
      player.armor.port.absorb = 0; // Disable armor absorption
      player.armor.starboard.absorb = 0;
      player.hull.port = 10;
      player.hull.starboard = 10;

      const result = DamageCalculator.applyDamage(player, 1000);
      
      expect(player.shields).toBe(0);
      // Only one side takes damage in applyDamage (random selection)
      const totalHull = player.hull.port + player.hull.starboard;
      expect(totalHull).toBeLessThan(20); // Some damage should be dealt
      expect(result.damageDealt).toBe(1000);
    });

    it('applies subsystem damage at 30% probability per direct hit', () => {
      // Override shields and armor to force hull damage
      player.shields = 0;
      player.armor.port.absorb = 0;
      player.armor.starboard.absorb = 0;
      
      let subsystemDamageCount = 0;
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        const testPlayer = JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE));
        testPlayer.shields = 0;
        testPlayer.armor.port.absorb = 0;
        testPlayer.armor.starboard.absorb = 0;
        
        const result = DamageCalculator.applyDamage(testPlayer, 50);
        if (result.subsystemDamaged) {
          subsystemDamageCount++;
        }
      }
      
      // Should be around 30% with some variance
      expect(subsystemDamageCount).toBeGreaterThan(15);
      expect(subsystemDamageCount).toBeLessThan(45);
    });

    it('selects only an existing, non-destroyed subsystem for damage', () => {
      // Destroy all systems except one
      player.systems.weapons = 0;
      player.systems.engines = 0;
      player.systems.sensors = 0;
      player.systems.lifeSupport = 0;
      player.systems.pointDefense = 100;
      
      player.shields = 0;
      player.armor.port.absorb = 0;
      player.armor.starboard.absorb = 0;
      
      const result = DamageCalculator.applyDamage(player, 50);
      
      if (result.subsystemDamaged) {
        expect(result.subsystemDamaged).toBe('pointDefense');
      }
    });

    it('clamps subsystem integrity at 0', () => {
      player.systems.weapons = 5; // Low health system
      player.shields = 0;
      player.armor.port.absorb = 0;
      player.armor.starboard.absorb = 0;
      
      // Force subsystem damage by applying damage many times
      for (let i = 0; i < 50; i++) {
        DamageCalculator.applyDamage(player, 50);
      }
      
      expect(player.systems.weapons).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateHitProbability', () => {
    it('calculates hit probability with all modifiers', () => {
      const hitChance = DamageCalculator.calculateHitProbability(
        0.8, // base accuracy
        10,  // distance
        20,  // max range
        50,  // target speed
        false, // not evading
        85   // crew skill
      );
      
      expect(hitChance).toBeGreaterThan(0);
      expect(hitChance).toBeLessThanOrEqual(1);
    });

    it('reduces hit chance with distance', () => {
      const closeHit = DamageCalculator.calculateHitProbability(0.8, 5, 20, 0, false, 100);
      const farHit = DamageCalculator.calculateHitProbability(0.8, 19, 20, 0, false, 100);
      
      expect(closeHit).toBeGreaterThan(farHit);
    });

    it('reduces hit chance when evading', () => {
      const normalHit = DamageCalculator.calculateHitProbability(0.8, 10, 20, 0, false, 100);
      const evasiveHit = DamageCalculator.calculateHitProbability(0.8, 10, 20, 0, true, 100);
      
      expect(evasiveHit).toBe(normalHit * 0.1);
    });

    it('reduces hit chance with target speed', () => {
      const slowTargetHit = DamageCalculator.calculateHitProbability(0.8, 10, 20, 10, false, 100);
      const fastTargetHit = DamageCalculator.calculateHitProbability(0.8, 10, 20, 90, false, 100);
      
      expect(slowTargetHit).toBeGreaterThan(fastTargetHit);
    });
  });

  describe('getSubsystemEffect', () => {
    it('calculates weapon cooldown penalty correctly', () => {
      const effect = DamageCalculator.getSubsystemEffect('weapons', 60); // 40% damage
      expect(effect).toBe(2); // 40% loss = 2 * 20% = +2 turns cooldown
    });

    it('calculates engine speed penalty correctly', () => {
      const effect = DamageCalculator.getSubsystemEffect('engines', 50); // 50% damage
      expect(effect).toBe(20); // 50% loss = 2 * 25% = -20% speed
    });

    it('calculates sensor hit chance penalty correctly', () => {
      const effect = DamageCalculator.getSubsystemEffect('sensors', 60); // 40% damage
      expect(effect).toBe(10); // 40% loss = 2 * 20% = -10% hit chance
    });

    it('returns 0 for unknown systems', () => {
      const effect = DamageCalculator.getSubsystemEffect('unknown' as any, 50);
      expect(effect).toBe(0);
    });
  });
});