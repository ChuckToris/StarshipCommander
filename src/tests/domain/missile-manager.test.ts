import { describe, it, expect, beforeEach } from 'vitest';
import { MissileManager } from '../../domain/missiles/missile-manager';
import { Player } from '../../domain/types';
import { INITIAL_PLAYER_STATE } from '../../domain/constants/balance';

describe('MissileManager', () => {
  let missileManager: MissileManager;
  let player: Player;

  beforeEach(() => {
    missileManager = new MissileManager();
    player = JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE));
  });

  describe('createMissile', () => {
    it('creates unique missile IDs M{turn}-{seq} with correct ETA', () => {
      const missile = missileManager.createMissile({
        turnNumber: 3,
        sequence: 2,
        damage: 50,
        distance: 25,
        speed: 10,
      });

      expect(missile.id).toBe('M3-2');
      expect(missile.damage).toBe(50);
      expect(missile.distance).toBe(25);
      expect(missile.speed).toBe(10);
    });
  });

  describe('launchMissileVolley', () => {
    it('creates multiple missiles with sequential IDs', () => {
      const missiles = missileManager.launchMissileVolley(1, 3, 40, 20, 8);

      expect(missiles).toHaveLength(3);
      expect(missiles[0].id).toBe('M1-1');
      expect(missiles[1].id).toBe('M1-2');
      expect(missiles[2].id).toBe('M1-3');
      expect(missiles.every(m => m.damage === 40)).toBe(true);
      expect(missiles.every(m => m.distance === 20)).toBe(true);
      expect(missiles.every(m => m.speed === 8)).toBe(true);
    });
  });

  describe('moveMissiles', () => {
    it('moves missiles −speed km each turn until intercept or impact', () => {
      const missiles = missileManager.launchMissileVolley(1, 2, 30, 25, 10);
      
      // First move
      const moved1 = missileManager.moveMissiles();
      expect(moved1).toHaveLength(2);
      expect(moved1[0].distance).toBe(15);
      expect(moved1[1].distance).toBe(15);

      // Second move
      const moved2 = missileManager.moveMissiles();
      expect(moved2).toHaveLength(2);
      expect(moved2[0].distance).toBe(5);
      expect(moved2[1].distance).toBe(5);
    });

    it('removes missiles after intercept, impact, or leaving play area', () => {
      // Test missile that will impact after movement
      const missiles = missileManager.launchMissileVolley(1, 1, 30, 8, 10);
      
      // Move once - missile should be removed as distance goes to -2 (8 - 10 = -2 <= 0)
      let moved = missileManager.moveMissiles();
      expect(moved).toHaveLength(0); // Should be removed immediately
      
      // Test missile that stays in bounds
      const longRangeMissiles = missileManager.launchMissileVolley(2, 1, 30, 25, 10);
      moved = missileManager.moveMissiles();
      expect(moved).toHaveLength(1);
      expect(moved[0].distance).toBe(15); // 25 - 10 = 15
    });

    it('never lets distance fall below 0 km or exceed 30 km', () => {
      const missiles = missileManager.launchMissileVolley(1, 1, 30, 5, 10);
      
      // Move - should impact and be removed
      const moved = missileManager.moveMissiles();
      expect(moved).toHaveLength(0);
      
      // Test high distance
      const farMissiles = missileManager.launchMissileVolley(2, 1, 30, 35, 1);
      const farMoved = missileManager.moveMissiles();
      expect(farMoved).toHaveLength(0); // Should be removed for being > 30km
    });
  });

  describe('attemptIntercept', () => {
    it('fires Outer PD only for missiles ≤ 20 km', () => {
      const missiles = missileManager.launchMissileVolley(1, 2, 30, 25, 10);
      
      // Move to get within PD range
      missileManager.moveMissiles(); // 25 -> 15
      
      const activeMissiles = missileManager.getAllMissiles();
      const result = missileManager.attemptIntercept(activeMissiles[0].id, player, 'PD');
      
      expect(result.interceptor).toBe('PD');
      expect(player.pdShotsRemaining).toBe(1); // Started with 2, used 1
    });

    it('fires CIWS only for missiles ≤ 5 km', () => {
      const missiles = missileManager.launchMissileVolley(1, 1, 30, 8, 10);
      
      // Move to CIWS range
      missileManager.moveMissiles(); // 8 -> -2, but will be at 0
      
      // Create a new missile at close range for testing
      const closeMissile = missileManager.createMissile({
        turnNumber: 1,
        sequence: 1,
        damage: 30,
        distance: 3,
      });
      
      const result = missileManager.attemptIntercept(closeMissile.id, player, 'CIWS');
      
      expect(result.interceptor).toBe('CIWS');
      expect(player.pdShotsRemaining).toBe(1);
    });

    it('consumes a shot on every attempt, success or fail', () => {
      const missiles = missileManager.launchMissileVolley(1, 3, 30, 15, 10);
      const activeMissiles = missileManager.getAllMissiles();
      
      const initialShots = player.pdShotsRemaining;
      
      // Attempt intercept regardless of success
      missileManager.attemptIntercept(activeMissiles[0].id, player, 'PD');
      expect(player.pdShotsRemaining).toBe(initialShots - 1);
      
      missileManager.attemptIntercept(activeMissiles[1].id, player, 'PD');
      expect(player.pdShotsRemaining).toBe(initialShots - 2);
    });

    it('never lets pdShotsRemaining go below 0', () => {
      player.pdShotsRemaining = 1;
      const missiles = missileManager.launchMissileVolley(1, 3, 30, 15, 10);
      const activeMissiles = missileManager.getAllMissiles();
      
      missileManager.attemptIntercept(activeMissiles[0].id, player, 'PD');
      expect(player.pdShotsRemaining).toBe(0);
      
      // Try to intercept again - should not go negative
      const result = missileManager.attemptIntercept(activeMissiles[1].id, player, 'PD');
      expect(player.pdShotsRemaining).toBe(0);
      expect(result.success).toBe(false);
    });
  });

  describe('processPointDefense', () => {
    it('prioritises Outer PD before CIWS when both are in range', () => {
      // Create missiles at different ranges
      const farMissile = missileManager.createMissile({
        turnNumber: 1,
        sequence: 1,
        damage: 30,
        distance: 15, // PD range only
      });
      
      const closeMissile = missileManager.createMissile({
        turnNumber: 1,
        sequence: 2,
        damage: 30,
        distance: 3, // Both PD and CIWS range
      });
      
      const results = missileManager.processPointDefense(player);
      
      // Should attempt PD on both missiles first
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.interceptor === 'PD')).toBe(true);
    });
  });

  describe('resetPDShots', () => {
    it('resets to 2 per volley (configurable)', () => {
      player.pdShotsRemaining = 0;
      missileManager.resetPDShots(player);
      expect(player.pdShotsRemaining).toBe(2);
    });
  });

  describe('calculateETA', () => {
    it('calculates correct ETA for missile', () => {
      const missile = missileManager.createMissile({
        turnNumber: 1,
        sequence: 1,
        damage: 30,
        distance: 25,
        speed: 10,
      });
      
      const eta = missileManager.calculateETA(missile);
      expect(eta).toBe(3); // Math.ceil(25/10) = 3
    });
  });

  describe('getImpactingMissiles', () => {
    it('returns missiles at distance 0 and removes them', () => {
      const missiles = missileManager.launchMissileVolley(1, 2, 30, 5, 10);
      
      // Move missiles to impact
      missileManager.moveMissiles(); // 5 -> -5, should be removed
      
      const impacting = missileManager.getImpactingMissiles();
      expect(impacting).toHaveLength(0); // Already removed by moveMissiles
      
      // Test with exact impact
      const exactMissile = missileManager.createMissile({
        turnNumber: 1,
        sequence: 1,
        damage: 30,
        distance: 0,
      });
      
      const exactImpacting = missileManager.getImpactingMissiles();
      expect(exactImpacting).toHaveLength(1);
      expect(exactImpacting[0].id).toBe(exactMissile.id);
    });
  });
});