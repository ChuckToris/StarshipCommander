import { useCallback } from 'react';
import { Command } from '../../domain/types';
import { useGameStore } from '../../app/store/game-store';

export const useGame = () => {
  const state = useGameStore();

  const executeCommand = useCallback(async (command: Command) => {
    await state.executeCommand(command);
  }, [state]);

  const resetGame = useCallback(() => {
    state.resetGame();
  }, [state]);

  return {
    ...state,
    executeCommand,
    resetGame,
  };
};