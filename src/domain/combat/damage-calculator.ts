import { Player, ArmorSide, Systems } from '../types';
import { BALANCE_CONFIG } from '../constants/balance';

export interface DamageResult {
  damageDealt: number;
  shieldsDamage: number;
  armorDamage: number;
  hullDamage: number;
  subsystemDamaged?: keyof Systems;
  subsystemDamage?: number;
  side: 'port' | 'starboard';
}

export class DamageCalculator {
  static applyDamage(player: Player, incomingDamage: number): DamageResult {
    const side = Math.random() < 0.5 ? 'port' : 'starboard';
    let remainingDamage = incomingDamage;
    
    const result: DamageResult = {
      damageDealt: incomingDamage,
      shieldsDamage: 0,
      armorDamage: 0,
      hullDamage: 0,
      side,
    };

    // Step 1: Shields absorb damage
    if (player.shields > 0 && remainingDamage > 0) {
      const shieldsAbsorbed = Math.min(player.shields, remainingDamage);
      player.shields -= shieldsAbsorbed;
      remainingDamage -= shieldsAbsorbed;
      result.shieldsDamage = shieldsAbsorbed;
    }

    // Step 2: Armor mitigates damage
    if (remainingDamage > 0) {
      const armor = player.armor[side];
      const effectiveness = this.calculateArmorEffectiveness(armor);
      const armorAbsorbed = remainingDamage * armor.absorb * effectiveness;
      
      // Armor takes damage from what it absorbed
      const armorDamage = armorAbsorbed * BALANCE_CONFIG.armorDegradationRate;
      armor.integrity = Math.max(0, armor.integrity - armorDamage);
      
      remainingDamage -= armorAbsorbed;
      result.armorDamage = armorDamage;
    }

    // Step 3: Hull takes remaining damage
    if (remainingDamage > 0) {
      const hullDamage = Math.min(player.hull[side], remainingDamage);
      player.hull[side] -= hullDamage;
      result.hullDamage = hullDamage;

      // Step 4: Check for subsystem damage
      if (hullDamage > 0 && Math.random() < BALANCE_CONFIG.subsystemDamageChance) {
        const subsystemResult = this.damageRandomSubsystem(player.systems);
        if (subsystemResult) {
          result.subsystemDamaged = subsystemResult.system;
          result.subsystemDamage = subsystemResult.damage;
        }
      }
    }

    return result;
  }

  private static calculateArmorEffectiveness(armor: ArmorSide): number {
    return armor.integrity / 100;
  }

  private static damageRandomSubsystem(systems: Systems): { system: keyof Systems; damage: number } | null {
    const systemKeys = Object.keys(systems) as (keyof Systems)[];
    const activeSystems = systemKeys.filter(key => systems[key] > 0);
    
    if (activeSystems.length === 0) return null;
    
    const randomSystem = activeSystems[Math.floor(Math.random() * activeSystems.length)];
    const damage = 10;
    systems[randomSystem] = Math.max(0, systems[randomSystem] - damage);
    
    return { system: randomSystem, damage };
  }

  static calculateHitProbability(
    baseAccuracy: number,
    distance: number,
    maxRange: number,
    targetSpeed: number,
    isEvading: boolean,
    crewSkill: number
  ): number {
    const rangeModifier = Math.max(0.3, 1 - (distance / maxRange));
    const speedModifier = Math.max(0.5, 1 - (targetSpeed / 100));
    const evasionModifier = isEvading ? 0.1 : 1.0;
    const crewSkillModifier = crewSkill / 100;

    return baseAccuracy * rangeModifier * speedModifier * evasionModifier * crewSkillModifier;
  }

  static getSubsystemEffect(system: keyof Systems, integrity: number): number {
    const integrityLoss = 100 - integrity;
    
    switch (system) {
      case 'weapons':
        return Math.floor(integrityLoss / 20); // +1 turn cooldown per 20% lost
      case 'engines':
        return Math.floor(integrityLoss / 25) * 10; // -10% speed per 25% lost
      case 'sensors':
        return Math.floor(integrityLoss / 20) * 5; // -5% hit chance per 20% lost
      case 'lifeSupport':
        return Math.floor(integrityLoss / 30) * 2; // -2% crew efficiency per 30% lost
      case 'pointDefense':
        return Math.floor(integrityLoss / 15) * 10; // -10% intercept chance per 15% lost
      default:
        return 0;
    }
  }
}