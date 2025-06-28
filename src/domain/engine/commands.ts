import { Command, Player, Weapon, Enemy } from '../types';
import { DamageCalculator } from '../combat/damage-calculator';

export interface CommandResult {
  success: boolean;
  message: string;
  events: GameEvent[];
}

export interface GameEvent {
  type: string;
  payload: any;
  timestamp: number;
}

export abstract class BaseCommand {
  abstract execute(
    player: Player,
    enemy: Enemy,
    weapons: Weapon[],
    turnNumber: number
  ): CommandResult;

  protected createEvent(type: string, payload: any): GameEvent {
    return {
      type,
      payload,
      timestamp: Date.now(),
    };
  }
}

export class FireWeaponCommand extends BaseCommand {
  constructor(private weaponId: string) {
    super();
  }

  execute(player: Player, enemy: Enemy, weapons: Weapon[], turnNumber: number): CommandResult {
    const weapon = weapons.find(w => w.id === this.weaponId);
    if (!weapon) {
      return {
        success: false,
        message: `Weapon ${this.weaponId} not found`,
        events: [],
      };
    }

    // Check cooldown
    if (weapon.cooldown > 0) {
      return {
        success: false,
        message: `${weapon.name} is cooling down (${weapon.cooldown} turns remaining)`,
        events: [],
      };
    }

    // Check range
    if (enemy.distance > weapon.range) {
      return {
        success: false,
        message: `${weapon.name} out of range (need ≤ ${weapon.range} km)`,
        events: [],
      };
    }

    const events: GameEvent[] = [];
    let totalDamage = 0;

    if (weapon.type === 'missile') {
      // Missile weapons don't hit immediately
      events.push(this.createEvent('MISSILE_LAUNCHED', {
        weaponId: weapon.id,
        volleySize: weapon.volleySize || 1,
        damage: weapon.damage,
        turnNumber,
      }));
    } else {
      // Direct fire weapons
      const volleySize = weapon.volleySize || 1;
      let hits = 0;

      for (let i = 0; i < volleySize; i++) {
        const hitChance = DamageCalculator.calculateHitProbability(
          0.8, // base accuracy
          enemy.distance,
          weapon.range,
          enemy.speed,
          player.evadeActive,
          player.crew.tacticalOfficer.skill
        );

        if (Math.random() < hitChance) {
          hits++;
          totalDamage += weapon.damage;
        }
      }

      if (hits > 0) {
        enemy.hull = Math.max(0, enemy.hull - totalDamage);
        events.push(this.createEvent('WEAPON_FIRED', {
          weaponId: weapon.id,
          hits,
          totalDamage,
          targetHull: enemy.hull,
        }));
      } else {
        events.push(this.createEvent('WEAPON_MISSED', {
          weaponId: weapon.id,
          volleySize,
        }));
      }
    }

    // Set cooldown (modified by weapons system damage)
    const weaponDamageModifier = DamageCalculator.getSubsystemEffect('weapons', player.systems.weapons);
    weapon.cooldown = weapon.cooldownMax + weaponDamageModifier;

    return {
      success: true,
      message: `${weapon.name} fired`,
      events,
    };
  }
}

export class EvadeCommand extends BaseCommand {
  execute(player: Player, _enemy: Enemy, _weapons: Weapon[], turnNumber: number): CommandResult {
    player.evadeActive = true;

    const events: GameEvent[] = [
      this.createEvent('EVADE_ACTIVATED', {
        duration: 1,
        turnNumber,
      }),
    ];

    return {
      success: true,
      message: 'Evasive maneuvers activated',
      events,
    };
  }
}

export class PassCommand extends BaseCommand {
  execute(_player: Player, _enemy: Enemy, _weapons: Weapon[], turnNumber: number): CommandResult {
    const events: GameEvent[] = [
      this.createEvent('TURN_PASSED', {
        turnNumber,
      }),
    ];

    return {
      success: true,
      message: 'Turn passed',
      events,
    };
  }
}

export class CommandFactory {
  static createCommand(command: Command): BaseCommand {
    switch (command.type) {
      case 'fire-laser':
      case 'fire-railgun':
      case 'launch-missiles':
        if (!command.weaponId) {
          throw new Error('Weapon ID required for fire commands');
        }
        return new FireWeaponCommand(command.weaponId);
      
      case 'evade':
        return new EvadeCommand();
      
      case 'pass':
        return new PassCommand();
      
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }
}