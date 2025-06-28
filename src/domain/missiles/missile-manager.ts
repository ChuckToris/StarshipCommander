import { Missile, Player } from '../types';
import { BALANCE_CONFIG } from '../constants/balance';

export interface MissileCreateParams {
  turnNumber: number;
  sequence: number;
  damage: number;
  distance: number;
  speed?: number;
  guidanceQuality?: number;
  evasionRating?: number;
}

export interface InterceptResult {
  missileId: string;
  interceptor: 'PD' | 'CIWS';
  success: boolean;
}

export class MissileManager {
  private missiles: Map<string, Missile> = new Map();
  private nextSequence = 1;

  createMissile(params: MissileCreateParams): Missile {
    const missile: Missile = {
      id: `M${params.turnNumber}-${params.sequence}`,
      distance: params.distance,
      damage: params.damage,
      speed: params.speed || 10,
      guidanceQuality: params.guidanceQuality || 0.8,
      evasionRating: params.evasionRating || 0.2,
    };

    this.missiles.set(missile.id, missile);
    return missile;
  }

  launchMissileVolley(
    turnNumber: number,
    count: number,
    damage: number,
    distance: number,
    speed?: number
  ): Missile[] {
    const missiles: Missile[] = [];
    
    for (let i = 0; i < count; i++) {
      const missile = this.createMissile({
        turnNumber,
        sequence: this.nextSequence++,
        damage,
        distance,
        speed,
      });
      missiles.push(missile);
    }

    return missiles;
  }

  moveMissiles(): Missile[] {
    const movedMissiles: Missile[] = [];
    
    for (const [id, missile] of this.missiles) {
      missile.distance -= missile.speed;
      
      // Remove missiles that have traveled too far or impacted
      if (missile.distance <= 0) {
        this.missiles.delete(id);
      } else if (missile.distance > 30) {
        this.missiles.delete(id);
      } else {
        movedMissiles.push(missile);
      }
    }

    return movedMissiles;
  }

  attemptIntercept(
    missileId: string,
    player: Player,
    interceptor: 'PD' | 'CIWS'
  ): InterceptResult {
    const missile = this.missiles.get(missileId);
    if (!missile) {
      return { missileId, interceptor, success: false };
    }

    let baseChance: number;
    let inRange: boolean;

    if (interceptor === 'PD') {
      baseChance = player.systems.pointDefense / 100;
      inRange = missile.distance <= BALANCE_CONFIG.pdRange;
    } else {
      baseChance = BALANCE_CONFIG.ciws.baseChance;
      inRange = missile.distance <= BALANCE_CONFIG.ciws.range;
    }

    if (!inRange || player.pdShotsRemaining <= 0) {
      return { missileId, interceptor, success: false };
    }

    // Calculate intercept probability
    const interceptChance = baseChance * 
      (1 - missile.evasionRating) * 
      (player.systems.pointDefense / 100) * 
      (interceptor === 'CIWS' ? 1 : 1 - missile.speed / 100);

    const success = Math.random() < interceptChance;

    // Consume shot
    player.pdShotsRemaining--;

    if (success) {
      this.missiles.delete(missileId);
    }

    return { missileId, interceptor, success };
  }

  processPointDefense(player: Player): InterceptResult[] {
    const results: InterceptResult[] = [];
    const missileArray = Array.from(this.missiles.values());
    
    // Sort missiles by distance (closest first)
    missileArray.sort((a, b) => a.distance - b.distance);

    // Outer PD first
    for (const missile of missileArray) {
      if (player.pdShotsRemaining <= 0) break;
      if (missile.distance <= BALANCE_CONFIG.pdRange) {
        const result = this.attemptIntercept(missile.id, player, 'PD');
        results.push(result);
      }
    }

    // CIWS second
    const remainingMissiles = Array.from(this.missiles.values());
    for (const missile of remainingMissiles) {
      if (player.pdShotsRemaining <= 0) break;
      if (missile.distance <= BALANCE_CONFIG.ciws.range) {
        const result = this.attemptIntercept(missile.id, player, 'CIWS');
        results.push(result);
      }
    }

    return results;
  }

  getImpactingMissiles(): Missile[] {
    const impacting: Missile[] = [];
    
    for (const [id, missile] of this.missiles) {
      if (missile.distance <= 0) {
        impacting.push(missile);
        this.missiles.delete(id);
      }
    }

    return impacting;
  }

  getAllMissiles(): Missile[] {
    return Array.from(this.missiles.values());
  }

  resetPDShots(player: Player): void {
    player.pdShotsRemaining = BALANCE_CONFIG.pdShotsPerVolley;
  }

  calculateETA(missile: Missile): number {
    return Math.ceil(missile.distance / missile.speed);
  }

  clear(): void {
    this.missiles.clear();
    this.nextSequence = 1;
  }
}