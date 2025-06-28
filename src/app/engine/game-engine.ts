import { GameState, Command } from '../../domain/types';
import { TurnEngine } from '../../domain/engine/turn-engine';
import { eventBus } from '../events/event-bus';
import { useGameStore } from '../store/game-store';

export class GameEngine {
  private turnEngine = new TurnEngine();
  private isProcessing = false;

  async runTurn(command: Command): Promise<void> {
    if (this.isProcessing) {
      console.warn('Turn already in progress, ignoring command');
      return;
    }

    this.isProcessing = true;
    
    try {
      const currentState = useGameStore.getState();
      if (currentState.gameOver) return;

      // Execute the turn
      const newState = this.turnEngine.executeTurn(currentState, command);
      
      // Update the store
      useGameStore.getState().loadGameState(newState);
      
      // Emit events
      eventBus.emit('TURN_COMPLETE', newState);
      
      if (newState.gameOver) {
        eventBus.emit('GAME_OVER', {
          winner: newState.winner,
          turnNumber: newState.turnNumber,
        });
      }

    } catch (error) {
      console.error('Error executing turn:', error);
      eventBus.emit('ERROR_OCCURRED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'game_engine_run_turn',
      });
    } finally {
      this.isProcessing = false;
    }
  }

  getGameState(): GameState {
    return useGameStore.getState();
  }

  resetGame(): void {
    useGameStore.getState().resetGame();
    this.turnEngine.resetState(); // Reset the turn engine state too
    eventBus.emit('GAME_RESET', {});
  }

  isGameInProgress(): boolean {
    return this.isProcessing;
  }
}

// Global game engine instance
export const gameEngine = new GameEngine();