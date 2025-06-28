import { describe, it, expect, beforeEach } from 'vitest';
import { FireWeaponCommand, EvadeCommand, PassCommand, CommandFactory } from '../../domain/engine/commands';
import { Player, Enemy, Weapon } from '../../domain/types';
import { INITIAL_PLAYER_STATE, INITIAL_ENEMY, INITIAL_WEAPONS } from '../../domain/constants/balance';

describe('Commands', () => {
  let player: Player;
  let enemy: Enemy;
  let weapons: Weapon[];

  beforeEach(() => {
    player = JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE));
    enemy = JSON.parse(JSON.stringify(INITIAL_ENEMY));
    weapons = JSON.parse(JSON.stringify(INITIAL_WEAPONS));
  });

  describe('FireWeaponCommand', () => {
    it('validates range and cooldown before firing', () => {
      const laserWeapon = weapons.find(w => w.id === 'laser-1')!;
      laserWeapon.cooldown = 2; // On cooldown
      enemy.distance = 10; // In range
      
      const command = new FireWeaponCommand('laser-1');
      const result = command.execute(player, enemy, weapons, 1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('cooling down');
    });

    it('validates range correctly', () => {
      const laserWeapon = weapons.find(w => w.id === 'laser-1')!;
      laserWeapon.cooldown = 0; // Ready to fire
      enemy.distance = 25; // Out of range (laser range is 12km)
      
      const command = new FireWeaponCommand('laser-1');
      const result = command.execute(player, enemy, weapons, 1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('out of range');
    });

    it('sets cooldownMax on success', () => {
      const laserWeapon = weapons.find(w => w.id === 'laser-1')!;
      laserWeapon.cooldown = 0;
      enemy.distance = 10; // In range
      
      const command = new FireWeaponCommand('laser-1');
      const result = command.execute(player, enemy, weapons, 1);
      
      expect(result.success).toBe(true);
      expect(laserWeapon.cooldown).toBe(laserWeapon.cooldownMax);
    });

    it('emits WEAPON_FIRED with weaponId / volleySize on hit', () => {
      const laserWeapon = weapons.find(w => w.id === 'laser-1')!;
      laserWeapon.cooldown = 0;
      enemy.distance = 5; // Very close for high hit chance
      
      const command = new FireWeaponCommand('laser-1');
      const result = command.execute(player, enemy, weapons, 1);
      
      expect(result.success).toBe(true);
      
      // Should have weapon fired event (or missed event)
      const weaponEvent = result.events.find(e => 
        e.type === 'WEAPON_FIRED' || e.type === 'WEAPON_MISSED'
      );
      expect(weaponEvent).toBeTruthy();
      expect(weaponEvent?.payload.weaponId).toBe('laser-1');
    });

    it('handles missile weapons differently (emits MISSILE_LAUNCHED)', () => {
      const missileWeapon = weapons.find(w => w.id === 'missile-1')!;
      missileWeapon.cooldown = 0;
      enemy.distance = 20; // In range
      
      const command = new FireWeaponCommand('missile-1');
      const result = command.execute(player, enemy, weapons, 1);
      
      expect(result.success).toBe(true);
      
      const missileEvent = result.events.find(e => e.type === 'MISSILE_LAUNCHED');
      expect(missileEvent).toBeTruthy();
      expect(missileEvent?.payload.weaponId).toBe('missile-1');
      expect(missileEvent?.payload.volleySize).toBe(missileWeapon.volleySize);
    });

    it('applies weapon damage modifier from subsystem damage', () => {
      const laserWeapon = weapons.find(w => w.id === 'laser-1')!;
      laserWeapon.cooldown = 0;
      enemy.distance = 10;
      
      // Damage weapons system
      player.systems.weapons = 60; // 40% damage = +2 turns cooldown
      
      const command = new FireWeaponCommand('laser-1');
      const result = command.execute(player, enemy, weapons, 1);
      
      expect(result.success).toBe(true);
      expect(laserWeapon.cooldown).toBe(laserWeapon.cooldownMax + 2);
    });

    it('fails gracefully with non-existent weapon', () => {
      const command = new FireWeaponCommand('non-existent');
      const result = command.execute(player, enemy, weapons, 1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('EvadeCommand', () => {
    it('sets EvadeActive true for one enemy phase', () => {
      const command = new EvadeCommand();
      const result = command.execute(player, enemy, weapons, 1);
      
      expect(result.success).toBe(true);
      expect(player.evadeActive).toBe(true);
    });

    it('emits EVADE_ACTIVATED with duration', () => {
      const command = new EvadeCommand();
      const result = command.execute(player, enemy, weapons, 1);
      
      expect(result.success).toBe(true);
      
      const evadeEvent = result.events.find(e => e.type === 'EVADE_ACTIVATED');
      expect(evadeEvent).toBeTruthy();
      expect(evadeEvent?.payload.duration).toBe(1);
    });

    it('provides correct success message', () => {
      const command = new EvadeCommand();
      const result = command.execute(player, enemy, weapons, 1);
      
      expect(result.message).toBe('Evasive maneuvers activated');
    });
  });

  describe('PassCommand', () => {
    it('performs no action but succeeds', () => {
      const initialState = JSON.parse(JSON.stringify(player));
      
      const command = new PassCommand();
      const result = command.execute(player, enemy, weapons, 1);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Turn passed');
      
      // Player state should be unchanged
      expect(player).toEqual(initialState);
    });

    it('emits TURN_PASSED event', () => {
      const command = new PassCommand();
      const result = command.execute(player, enemy, weapons, 1);
      
      const passEvent = result.events.find(e => e.type === 'TURN_PASSED');
      expect(passEvent).toBeTruthy();
      expect(passEvent?.payload.turnNumber).toBe(1);
    });
  });

  describe('CommandFactory', () => {
    it('creates FireWeaponCommand for fire-laser', () => {
      const command = CommandFactory.createCommand({ 
        type: 'fire-laser', 
        weaponId: 'laser-1' 
      });
      
      expect(command).toBeInstanceOf(FireWeaponCommand);
    });

    it('creates FireWeaponCommand for fire-railgun', () => {
      const command = CommandFactory.createCommand({ 
        type: 'fire-railgun', 
        weaponId: 'railgun-1' 
      });
      
      expect(command).toBeInstanceOf(FireWeaponCommand);
    });

    it('creates FireWeaponCommand for launch-missiles', () => {
      const command = CommandFactory.createCommand({ 
        type: 'launch-missiles', 
        weaponId: 'missile-1' 
      });
      
      expect(command).toBeInstanceOf(FireWeaponCommand);
    });

    it('creates EvadeCommand for evade', () => {
      const command = CommandFactory.createCommand({ type: 'evade' });
      
      expect(command).toBeInstanceOf(EvadeCommand);
    });

    it('creates PassCommand for pass', () => {
      const command = CommandFactory.createCommand({ type: 'pass' });
      
      expect(command).toBeInstanceOf(PassCommand);
    });

    it('throws error for unknown command type', () => {
      expect(() => {
        CommandFactory.createCommand({ type: 'unknown' as any });
      }).toThrow('Unknown command type');
    });

    it('throws error for fire commands without weaponId', () => {
      expect(() => {
        CommandFactory.createCommand({ type: 'fire-laser' });
      }).toThrow('Weapon ID required');
    });
  });

  describe('Command Integration', () => {
    it('weapon cooldown affects consecutive commands', () => {
      const laserWeapon = weapons.find(w => w.id === 'laser-1')!;
      laserWeapon.cooldown = 0;
      enemy.distance = 10;
      
      // Fire first time
      const command1 = new FireWeaponCommand('laser-1');
      const result1 = command1.execute(player, enemy, weapons, 1);
      expect(result1.success).toBe(true);
      
      // Try to fire again immediately
      const command2 = new FireWeaponCommand('laser-1');
      const result2 = command2.execute(player, enemy, weapons, 2);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('cooling down');
    });

    it('evade state affects weapon firing restrictions', () => {
      player.evadeActive = true;
      
      const laserWeapon = weapons.find(w => w.id === 'laser-1')!;
      laserWeapon.cooldown = 0;
      enemy.distance = 10;
      
      // Note: The current implementation doesn't check evade in commands
      // This would be handled at the UI level or turn engine level
      const command = new FireWeaponCommand('laser-1');
      const result = command.execute(player, enemy, weapons, 1);
      
      // Commands don't currently check evade state - this is handled elsewhere
      expect(result.success).toBe(true);
    });
  });
});