import React from 'react';
import { useGame } from '../hooks/use-game';
import { HudStatusBars } from './HudStatusBars';
import { CommandButtons } from './CommandButtons';
import { MissileTracker } from './MissileTracker';
import { SystemsStatus } from './SystemsStatus';
import { EnemyStatus } from './EnemyStatus';
import { LogTabs } from './LogTabs';
import { AlertsPane } from './AlertsPane';
import { SummaryPane } from './SummaryPane';

export const GameScreen: React.FC = () => {
  const { gameOver, winner, turnNumber, resetGame } = useGame();

  return (
    <div className="min-h-screen bg-primary text-white p-4" data-testid="game-screen">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-mono font-bold text-accent mb-2">
          Command Deck Simulator
        </h1>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
          <span data-testid="turn-number">Turn {turnNumber}</span>
          {gameOver && (
            <span className={`font-bold ${winner === 'player' ? 'text-success' : 'text-danger'}`}>
              {winner === 'player' ? '🎉 VICTORY!' : '💀 DEFEAT!'}
            </span>
          )}
          <button
            onClick={resetGame}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs border border-gray-500"
          >
            Reset Game
          </button>
        </div>
      </div>

      {/* Main Game Layout */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HUD Status */}
        <div data-testid="hud-status">
          <HudStatusBars />
        </div>

        {/* Systems and Enemy Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SystemsStatus />
          <EnemyStatus />
        </div>

        {/* Command Buttons */}
        <CommandButtons />

        {/* Missile Tracker */}
        <MissileTracker />

        {/* Log Panes */}
        <LogTabs />

        {/* Bottom Dock - Alerts and Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AlertsPane />
          <SummaryPane />
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-secondary border border-gray-600 rounded-lg p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="text-4xl mb-4">
                  {winner === 'player' ? '🎉' : '💀'}
                </div>
                <h2 className={`text-2xl font-mono font-bold mb-4 ${
                  winner === 'player' ? 'text-success' : 'text-danger'
                }`}>
                  {winner === 'player' ? 'VICTORY!' : 'DEFEAT!'}
                </h2>
                <p className="text-gray-300 mb-6">
                  {winner === 'player' 
                    ? 'Enemy vessel destroyed! The sector is secure.' 
                    : 'Ship lost with all hands. The enemy advances.'
                  }
                </p>
                <div className="text-sm text-gray-400 mb-6">
                  Battle lasted {turnNumber - 1} turns
                </div>
                <button
                  onClick={resetGame}
                  className="px-6 py-3 bg-accent hover:bg-accent/80 text-white rounded-lg font-mono transition-colors"
                >
                  Start New Battle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};