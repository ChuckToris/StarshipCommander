import React from 'react';
import { useGame } from '../hooks/use-game';

export const EnemyStatus: React.FC = () => {
  const { enemy } = useGame();

  const hullPercentage = Math.max(0, enemy.hull);
  const isHealthy = hullPercentage >= 70;
  const isDamaged = hullPercentage < 70 && hullPercentage >= 30;

  const statusColor = isHealthy 
    ? 'text-success' 
    : isDamaged 
    ? 'text-warning' 
    : 'text-danger';

  const threatLevel = enemy.distance <= enemy.directRange 
    ? 'CRITICAL' 
    : enemy.distance <= enemy.missileRange 
    ? 'HIGH' 
    : 'MODERATE';

  const threatColor = enemy.distance <= enemy.directRange 
    ? 'text-danger' 
    : enemy.distance <= enemy.missileRange 
    ? 'text-warning' 
    : 'text-success';

  return (
    <div className="bg-secondary border border-gray-600 rounded-lg p-4">
      <h3 className="text-sm font-mono text-gray-300 mb-3 border-b border-gray-600 pb-1">
        Enemy Status
      </h3>
      
      <div className="space-y-3">
        {/* Basic Info */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-300">Name:</span>
            <span className="text-sm font-mono text-white">{enemy.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Hull:</span>
            <span className={`text-sm font-mono ${statusColor}`}>
              {Math.round(hullPercentage)}%
            </span>
          </div>
        </div>

        {/* Combat Capabilities */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Missile Range:</span>
            <span className="text-sm font-mono text-white">{enemy.missileRange}km</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Direct Range:</span>
            <span className="text-sm font-mono text-white">{enemy.directRange}km</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Speed:</span>
            <span className="text-sm font-mono text-white">{enemy.speed} km/t</span>
          </div>
        </div>

        {/* Threat Assessment */}
        <div className="pt-2 border-t border-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Threat Level:</span>
            <span className={`text-sm font-mono font-bold ${threatColor}`}>
              {threatLevel}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {enemy.distance <= enemy.directRange && 
              "⚠️ In direct fire range!"
            }
            {enemy.distance > enemy.directRange && enemy.distance <= enemy.missileRange && 
              "🚀 In missile range"
            }
            {enemy.distance > enemy.missileRange && 
              "✓ Outside weapon range"
            }
          </div>
        </div>

        {/* Weapon Status */}
        <div className="pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400 space-y-1">
            <div>Weapons:</div>
            {enemy.weapons.map(weapon => (
              <div key={weapon.id} className="flex justify-between ml-2">
                <span>{weapon.name}:</span>
                <span className={weapon.cooldown > 0 ? 'text-warning' : 'text-success'}>
                  {weapon.cooldown > 0 ? `${weapon.cooldown}t` : 'Ready'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};