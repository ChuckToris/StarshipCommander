export interface Hull {
  port: number;
  starboard: number;
}

export interface ArmorSide {
  integrity: number;
  absorb: number;
}

export interface Armor {
  port: ArmorSide;
  starboard: ArmorSide;
}

export interface Systems {
  weapons: number;
  engines: number;
  sensors: number;
  lifeSupport: number;
  pointDefense: number;
}

export interface CrewMember {
  skill: number;
  active: boolean;
}

export interface Crew {
  tacticalOfficer: CrewMember;
  chiefEngineer: CrewMember;
  damageControl: CrewMember;
}

export interface Player {
  speed: number;
  hull: Hull;
  armor: Armor;
  shields: number;
  systems: Systems;
  crew: Crew;
  evadeActive: boolean;
  pdShotsRemaining: number;
}

export interface Weapon {
  id: string;
  name: string;
  label: string;
  type: 'laser' | 'railgun' | 'missile';
  damage: number;
  range: number;
  cooldown: number;
  cooldownMax: number;
  volleySize?: number;
}

export interface Missile {
  id: string;
  distance: number;
  damage: number;
  speed: number;
  guidanceQuality: number;
  evasionRating: number;
}

export interface Enemy {
  name: string;
  hull: number;
  distance: number;
  speed: number;
  missileRange: number;
  directRange: number;
  missileVolleySize: number;
  weapons: Weapon[];
}

export interface LogEntry {
  id: string;
  category: 'tactical' | 'missile' | 'engineering' | 'enemy' | 'alerts' | 'summary';
  emoji: string;
  text: string;
  turnNumber: number;
  timestamp: number;
}

export interface GameState {
  turnNumber: number;
  player: Player;
  enemy: Enemy;
  weapons: Weapon[];
  missiles: Missile[];
  logs: LogEntry[];
  gameOver: boolean;
  winner: 'player' | 'enemy' | null;
}

export type CommandType = 'fire-laser' | 'fire-railgun' | 'launch-missiles' | 'evade' | 'pass';

export interface Command {
  type: CommandType;
  weaponId?: string;
}

export interface GameEvent {
  type: string;
  payload: any;
  timestamp: number;
}

export interface BalanceConfig {
  pdShotsPerVolley: number;
  pdRange: number;
  ciws: {
    range: number;
    baseChance: number;
  };
  subsystemDamageChance: number;
  armorDegradationRate: number;
  alertThresholds: {
    shields: number;
    hull: number;
  };
}