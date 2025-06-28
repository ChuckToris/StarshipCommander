import { create } from 'zustand';
import { GameState, Command, LogEntry } from '../../domain/types';
import { INITIAL_PLAYER_STATE, INITIAL_WEAPONS, INITIAL_ENEMY } from '../../domain/constants/balance';

interface GameStore extends GameState {
  // Actions
  executeCommand: (command: Command) => void;
  resetGame: () => void;
  loadGameState: (state: GameState) => void;
  
  // Selectors
  getFilteredLogs: (category: LogEntry['category']) => LogEntry[];
  canUseWeapon: (weaponId: string) => boolean;
  getWeaponTooltip: (weaponId: string) => string;
}

const createInitialState = (): GameState => ({
  turnNumber: 1,
  player: { ...INITIAL_PLAYER_STATE },
  enemy: { ...INITIAL_ENEMY },
  weapons: [...INITIAL_WEAPONS],
  missiles: [],
  logs: [{
    id: 'initial',
    category: 'summary',
    emoji: '📊',
    text: 'Battle stations! Enemy vessel detected at 30km.',
    turnNumber: 0,
    timestamp: Date.now(),
  }],
  gameOver: false,
  winner: null,
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  executeCommand: async (command: Command) => {
    const state = get();
    if (state.gameOver) return;

    // Import game engine dynamically to avoid circular dependencies
    const { gameEngine } = await import('../engine/game-engine');
    await gameEngine.runTurn(command);
  },

  resetGame: () => {
    set(createInitialState());
  },

  loadGameState: (state: GameState) => {
    set(state);
  },

  getFilteredLogs: (category: LogEntry['category']) => {
    const state = get();
    return state.logs.filter(log => log.category === category);
  },

  canUseWeapon: (weaponId: string) => {
    const state = get();
    const weapon = state.weapons.find(w => w.id === weaponId);
    if (!weapon) return false;
    
    // Check cooldown
    if (weapon.cooldown > 0) return false;
    
    // Check range
    if (state.enemy.distance > weapon.range) return false;
    
    // Check if evading (disables all weapons)
    if (state.player.evadeActive) return false;
    
    return true;
  },

  getWeaponTooltip: (weaponId: string) => {
    const state = get();
    const weapon = state.weapons.find(w => w.id === weaponId);
    if (!weapon) return 'Weapon not found';
    
    if (weapon.cooldown > 0) {
      return `Cooling down (${weapon.cooldown} turns)`;
    }
    
    if (state.enemy.distance > weapon.range) {
      return `Out of range (need ≤ ${weapon.range} km)`;
    }
    
    if (state.player.evadeActive) {
      return 'Cannot fire while evading';
    }
    
    return `Ready to fire - Range: ${weapon.range}km, Damage: ${weapon.damage}`;
  },
}));