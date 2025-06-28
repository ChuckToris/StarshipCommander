import { BalanceConfig } from '../types';

export const BALANCE_CONFIG: BalanceConfig = {
  pdShotsPerVolley: 2,
  pdRange: 20,
  ciws: {
    range: 5,
    baseChance: 0.7,
  },
  subsystemDamageChance: 0.3,
  armorDegradationRate: 1.0,
  alertThresholds: {
    shields: 0.3,
    hull: 0.2,
  },
};

export const INITIAL_PLAYER_STATE = {
  speed: 5,
  hull: { port: 100, starboard: 100 },
  armor: {
    port: { integrity: 100, absorb: 0.4 },
    starboard: { integrity: 100, absorb: 0.4 },
  },
  shields: 100,
  systems: {
    weapons: 100,
    engines: 100,
    sensors: 100,
    lifeSupport: 100,
    pointDefense: 100,
  },
  crew: {
    tacticalOfficer: { skill: 85, active: true },
    chiefEngineer: { skill: 80, active: true },
    damageControl: { skill: 75, active: false },
  },
  evadeActive: false,
  pdShotsRemaining: 2,
};

export const INITIAL_WEAPONS = [
  {
    id: 'laser-1',
    name: 'Laser Battery',
    label: 'Fire Lasers',
    type: 'laser' as const,
    damage: 25,
    range: 12,
    cooldown: 0,
    cooldownMax: 2,
    volleySize: 3,
  },
  {
    id: 'railgun-1',
    name: 'Railgun',
    label: 'Fire Railgun',
    type: 'railgun' as const,
    damage: 45,
    range: 18,
    cooldown: 0,
    cooldownMax: 4,
  },
  {
    id: 'missile-1',
    name: 'Missile Launcher',
    label: 'Launch Missiles',
    type: 'missile' as const,
    damage: 35,
    range: 999, // Missiles should work at any range
    cooldown: 0,
    cooldownMax: 3,
    volleySize: 2,
  },
];

export const INITIAL_ENEMY = {
  name: 'Pirate CV',
  hull: 100,
  distance: 30,
  speed: 4,
  missileRange: 15,
  directRange: 12,
  missileVolleySize: 2,
  weapons: [
    {
      id: 'enemy-laser',
      name: 'Enemy Laser',
      label: 'Enemy Laser',
      type: 'laser' as const,
      damage: 20,
      range: 12,
      cooldown: 0,
      cooldownMax: 3,
    },
    {
      id: 'enemy-missile',
      name: 'Enemy Missiles',
      label: 'Enemy Missiles',
      type: 'missile' as const,
      damage: 30,
      range: 15,
      cooldown: 0,
      cooldownMax: 4,
      volleySize: 2,
    },
  ],
};