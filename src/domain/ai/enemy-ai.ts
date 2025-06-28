import { Enemy, Player } from '../types';
import { DamageCalculator } from '../combat/damage-calculator';
import { GameEvent } from '../engine/commands';

export interface AIAction {
  type: 'move' | 'fire-direct' | 'launch-missiles' | 'wait';
  weaponId?: string;
  damage?: number;
}

export class EnemyAI {
  executeEnemyAttacks(
    enemy: Enemy,
    player: Player,
    turnNumber: number
  ): { actions: AIAction[]; events: GameEvent[] } {
    const actions: AIAction[] = [];
    const events: GameEvent[] = [];

    // Skip attacks if player is evading
    if (player.evadeActive) {
      events.push({
        type: 'ENEMY_ACTION',
        payload: {
          actionType: 'attacks_blocked_by_evasion',
          turnNumber,
        },
        timestamp: Date.now(),
      });
      return { actions, events };
    }

    // Weapon selection and firing
    const attackActions = this.selectAndExecuteAttacks(enemy, player, turnNumber);
    actions.push(...attackActions.actions);
    events.push(...attackActions.events);

    return { actions, events };
  }

  executeEnemyTurn(
    enemy: Enemy,
    player: Player,
    turnNumber: number
  ): { actions: AIAction[]; events: GameEvent[] } {
    // Deprecated - kept for compatibility
    return this.executeEnemyAttacks(enemy, player, turnNumber);
  }


  private selectAndExecuteAttacks(
    enemy: Enemy,
    player: Player,
    turnNumber: number
  ): { actions: AIAction[]; events: GameEvent[] } {
    const actions: AIAction[] = [];
    const events: GameEvent[] = [];

    // Priority 1: Launch missiles if in range and available
    const missileWeapon = enemy.weapons.find(w => w.type === 'missile' && w.cooldown === 0);
    if (missileWeapon && enemy.distance <= enemy.missileRange) {
      actions.push({
        type: 'launch-missiles',
        weaponId: missileWeapon.id,
        damage: missileWeapon.damage,
      });

      events.push({
        type: 'ENEMY_MISSILE_LAUNCHED',
        payload: {
          weaponId: missileWeapon.id,
          volleySize: enemy.missileVolleySize,
          damage: missileWeapon.damage,
          distance: enemy.distance,
          turnNumber,
        },
        timestamp: Date.now(),
      });

      // Set cooldown
      missileWeapon.cooldown = missileWeapon.cooldownMax;
    }

    // Priority 2: Direct fire if in range
    const directWeapon = enemy.weapons.find(w => w.type !== 'missile' && w.cooldown === 0);
    if (directWeapon && enemy.distance <= enemy.directRange) {
      const hitChance = DamageCalculator.calculateHitProbability(
        0.75, // enemy base accuracy
        enemy.distance,
        directWeapon.range,
        player.speed,
        false, // enemy doesn't track player evasion for this calculation
        0.8 // enemy crew skill
      );

      let totalDamage = 0;
      let hits = 0;
      const volleySize = directWeapon.volleySize || 1;

      for (let i = 0; i < volleySize; i++) {
        if (Math.random() < hitChance) {
          hits++;
          totalDamage += directWeapon.damage;
        }
      }

      if (hits > 0) {
        actions.push({
          type: 'fire-direct',
          weaponId: directWeapon.id,
          damage: totalDamage,
        });

        events.push({
          type: 'ENEMY_DIRECT_FIRE',
          payload: {
            weaponId: directWeapon.id,
            hits,
            totalDamage,
            turnNumber,
          },
          timestamp: Date.now(),
        });
      } else {
        events.push({
          type: 'ENEMY_MISSED',
          payload: {
            weaponId: directWeapon.id,
            volleySize,
            turnNumber,
          },
          timestamp: Date.now(),
        });
      }

      // Set cooldown
      directWeapon.cooldown = directWeapon.cooldownMax;
    }

    // If no weapons could fire, wait
    if (actions.length === 0) {
      actions.push({ type: 'wait' });
      events.push({
        type: 'ENEMY_ACTION',
        payload: {
          actionType: 'wait',
          reason: 'no_weapons_available',
          turnNumber,
        },
        timestamp: Date.now(),
      });
    }

    return { actions, events };
  }

  tickCooldowns(enemy: Enemy): void {
    enemy.weapons.forEach(weapon => {
      if (weapon.cooldown > 0) {
        weapon.cooldown--;
      }
    });
  }
}