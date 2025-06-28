import React from 'react';
import { useGame } from '../hooks/use-game';

const SystemStatusItem: React.FC<{ 
  label: string; 
  value: number; 
  icon: string 
}> = ({ label, value, icon }) => {
  const isHealthy = value >= 80;
  const isDamaged = value < 80 && value >= 50;

  const statusColor = isHealthy 
    ? 'text-success' 
    : isDamaged 
    ? 'text-warning' 
    : 'text-danger';

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300 flex items-center gap-1">
        <span>{icon}</span>
        {label}:
      </span>
      <span className={`text-sm font-mono ${statusColor}`}>
        {Math.round(value)}%
      </span>
    </div>
  );
};

const CrewStatusItem: React.FC<{ 
  label: string; 
  active: boolean; 
  skill: number 
}> = ({ label, active, skill }) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}:</span>
      <span className={`text-sm font-mono ${active ? 'text-success' : 'text-warning'}`}>
        {active ? `Active (${skill}%)` : 'Standby'}
      </span>
    </div>
  );
};

export const SystemsStatus: React.FC = () => {
  const { player } = useGame();

  return (
    <div className="bg-secondary border border-gray-600 rounded-lg p-4">
      <div className="grid grid-cols-2 gap-6">
        {/* Systems Status */}
        <div>
          <h3 className="text-sm font-mono text-gray-300 mb-3 border-b border-gray-600 pb-1">
            Systems Status
          </h3>
          <div className="space-y-2">
            <SystemStatusItem 
              label="Weapons" 
              value={player.systems.weapons} 
              icon="⚔️" 
            />
            <SystemStatusItem 
              label="Engines" 
              value={player.systems.engines} 
              icon="🚀" 
            />
            <SystemStatusItem 
              label="Sensors" 
              value={player.systems.sensors} 
              icon="📡" 
            />
            <SystemStatusItem 
              label="Life Support" 
              value={player.systems.lifeSupport} 
              icon="💨" 
            />
            <SystemStatusItem 
              label="Point Defense" 
              value={player.systems.pointDefense} 
              icon="🎯" 
            />
          </div>
        </div>

        {/* Crew Status */}
        <div>
          <h3 className="text-sm font-mono text-gray-300 mb-3 border-b border-gray-600 pb-1">
            Crew Roles
          </h3>
          <div className="space-y-2">
            <CrewStatusItem 
              label="Tactical" 
              active={player.crew.tacticalOfficer.active}
              skill={player.crew.tacticalOfficer.skill}
            />
            <CrewStatusItem 
              label="Engineer" 
              active={player.crew.chiefEngineer.active}
              skill={player.crew.chiefEngineer.skill}
            />
            <CrewStatusItem 
              label="Dmg Ctrl" 
              active={player.crew.damageControl.active}
              skill={player.crew.damageControl.skill}
            />
          </div>
        </div>
      </div>
    </div>
  );
};