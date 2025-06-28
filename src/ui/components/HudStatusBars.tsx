import React from 'react';
import { useGame } from '../hooks/use-game';

interface StatusBarProps {
  label: string;
  value: number;
  maxValue: number;
  className?: string;
  format?: 'percentage' | 'number';
  unit?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ 
  label, 
  value, 
  maxValue, 
  className = '',
  format = 'percentage',
  unit = ''
}) => {
  const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));
  const isDanger = percentage < 30;
  const isWarning = percentage < 50 && percentage >= 30;

  const barColor = isDanger 
    ? 'bg-danger' 
    : isWarning 
    ? 'bg-warning' 
    : 'bg-success';

  const displayValue = format === 'percentage' 
    ? `${Math.round(value)}%` 
    : `${Math.round(value)}${unit}`;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm font-mono min-w-[80px] text-gray-300">
        {label}:
      </span>
      <div className="flex-1 bg-gray-700 rounded h-4 relative min-w-[100px]">
        <div 
          className={`${barColor} h-full rounded transition-all duration-200`}
          style={{ width: `${percentage}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white">
          {displayValue}
        </span>
      </div>
    </div>
  );
};

export const HudStatusBars: React.FC = () => {
  const { player, enemy } = useGame();

  return (
    <div className="bg-secondary border border-gray-600 rounded-lg p-4 space-y-3">
      {/* Ship Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <StatusBar 
            label="HULL Port" 
            value={player.hull.port} 
            maxValue={100} 
          />
          <StatusBar 
            label="HULL Star" 
            value={player.hull.starboard} 
            maxValue={100} 
          />
          <StatusBar 
            label="SHIELDS" 
            value={player.shields} 
            maxValue={100} 
          />
        </div>
        <div className="space-y-2">
          <StatusBar 
            label="ARMOR P" 
            value={player.armor.port.integrity} 
            maxValue={100} 
          />
          <StatusBar 
            label="ARMOR S" 
            value={player.armor.starboard.integrity} 
            maxValue={100} 
          />
          <StatusBar 
            label="PD Shots" 
            value={player.pdShotsRemaining} 
            maxValue={2}
            format="number"
          />
        </div>
      </div>

      {/* Movement and Distance */}
      <div className="grid grid-cols-4 gap-4 pt-2 border-t border-gray-600">
        <div className="text-center">
          <div className="text-xs text-gray-400">DISTANCE</div>
          <div className="text-lg font-mono text-white" data-testid="distance-display">{enemy.distance} km</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">YOUR SPEED</div>
          <div className="text-lg font-mono text-white">
            {Math.round(player.speed * (player.systems.engines / 100))} km/t
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">ENEMY SPEED</div>
          <div className="text-lg font-mono text-white">{enemy.speed} km/t</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">PD RANGE</div>
          <div className="text-lg font-mono text-white">20 km</div>
        </div>
      </div>
    </div>
  );
};