import React from 'react';
import { useGame } from '../hooks/use-game';

export const MissileTracker: React.FC = () => {
  const { missiles, enemy } = useGame();

  // Create distance markers from 0 to 30km
  const markers = Array.from({ length: 7 }, (_, i) => i * 5);
  const maxDistance = 30;

  const getPositionPercentage = (distance: number) => {
    return ((maxDistance - distance) / maxDistance) * 100;
  };

  return (
    <div className="bg-secondary border border-gray-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-mono text-gray-300">Missile Tracking 🛰️</h3>
        <div className="text-xs text-gray-400">
          Active: {missiles.length}
        </div>
      </div>

      {/* Missile Track */}
      <div className="relative bg-gray-800 rounded-lg p-4 h-20">
        {/* Distance scale */}
        <div className="relative h-8 mb-2">
          {/* Scale line */}
          <div className="absolute top-4 left-0 right-0 h-px bg-gray-600"></div>
          
          {/* Distance markers */}
          {markers.map(distance => (
            <div
              key={distance}
              className="absolute top-0 transform -translate-x-1/2"
              style={{ left: `${getPositionPercentage(distance)}%` }}
            >
              <div className="w-px h-8 bg-gray-500"></div>
              <div className="text-xs text-gray-400 mt-1 transform -translate-x-1/2">
                {distance}km
              </div>
            </div>
          ))}
        </div>

        {/* Ships and Missiles */}
        <div className="relative h-8">
          {/* Player ship (always at 0km - left side) */}
          <div 
            className="absolute top-1 transform -translate-x-1/2"
            style={{ left: `${getPositionPercentage(0)}%` }}
            title="Player Ship"
          >
            <div className="text-xl">🚀</div>
          </div>

          {/* Enemy ship */}
          <div 
            className="absolute top-1 transform -translate-x-1/2"
            style={{ left: `${getPositionPercentage(enemy.distance)}%` }}
            title={`Enemy Ship (${enemy.distance}km)`}
          >
            <div className="text-xl">👾</div>
          </div>

          {/* PD Range Indicators */}
          <div 
            className="absolute top-0 h-8 bg-blue-500/20 border-l border-r border-blue-500/50"
            style={{ 
              left: `${getPositionPercentage(20)}%`,
              width: `${getPositionPercentage(0) - getPositionPercentage(20)}%`
            }}
            title="Outer PD Range (0-20km)"
          >
            <div className="text-xs text-blue-300 mt-1 ml-1">PD</div>
          </div>

          <div 
            className="absolute top-0 h-8 bg-red-500/20 border-l border-r border-red-500/50"
            style={{ 
              left: `${getPositionPercentage(5)}%`,
              width: `${getPositionPercentage(0) - getPositionPercentage(5)}%`
            }}
            title="CIWS Range (0-5km)"
          >
            <div className="text-xs text-red-300 mt-1 ml-1">CIWS</div>
          </div>

          {/* Active missiles */}
          {missiles.map(missile => (
            <div
              key={missile.id}
              className="absolute top-1 transform -translate-x-1/2 cursor-pointer"
              style={{ left: `${getPositionPercentage(missile.distance)}%` }}
              title={`${missile.id} - ${missile.distance.toFixed(1)}km - ${missile.damage} damage`}
            >
              <div className="text-lg animate-pulse">⚡</div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 text-xs text-gray-400 space-y-1">
        <div className="flex justify-between">
          <span>🚀 Player</span>
          <span>⚡ Missiles</span>
          <span>👾 Enemy</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-300">PD Range: 20km</span>
          <span className="text-red-300">CIWS Range: 5km</span>
        </div>
      </div>
    </div>
  );
};