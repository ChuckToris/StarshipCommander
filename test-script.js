// Simple test to verify basic functionality
import { TurnEngine } from './src/domain/engine/turn-engine.js';
import { INITIAL_PLAYER_STATE, INITIAL_ENEMY, INITIAL_WEAPONS } from './src/domain/constants/balance.js';

const turnEngine = new TurnEngine();
const gameState = {
  turnNumber: 1,
  player: structuredClone(INITIAL_PLAYER_STATE),
  enemy: structuredClone(INITIAL_ENEMY),
  weapons: structuredClone(INITIAL_WEAPONS),
  missiles: [],
  logs: [],
  gameOver: false,
  winner: null,
};

console.log('Initial state:', gameState.turnNumber, gameState.enemy.distance);

const newState = turnEngine.executeTurn(gameState, { type: 'pass' });

console.log('After turn:', newState.turnNumber, newState.enemy.distance);
console.log('Movement working:', gameState.enemy.distance > newState.enemy.distance);