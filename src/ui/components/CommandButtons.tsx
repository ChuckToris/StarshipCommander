import React from 'react';
import { Command } from '../../domain/types';
import { useGame } from '../hooks/use-game';

interface CommandButtonProps {
  command: Command;
  label: string;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
}

const CommandButton: React.FC<CommandButtonProps> = ({ 
  command, 
  label, 
  disabled = false, 
  tooltip, 
  className = '' 
}) => {
  const { executeCommand } = useGame();

  const handleClick = () => {
    if (!disabled) {
      executeCommand(command);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={tooltip}
      data-testid={`btn-${command.type}${command.weaponId ? `-${command.weaponId}` : ''}`}
      className={`
        px-4 py-2 font-mono text-sm border rounded-lg transition-all duration-200
        ${disabled 
          ? 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed' 
          : 'bg-accent hover:bg-accent/80 text-white border-accent hover:border-accent/80 cursor-pointer active:scale-95'
        }
        ${className}
      `}
    >
      {label}
    </button>
  );
};

export const CommandButtons: React.FC = () => {
  const { weapons, canUseWeapon, getWeaponTooltip, player, gameOver } = useGame();

  const isEvading = player.evadeActive;
  const gameEnded = gameOver;

  return (
    <div className="bg-secondary border border-gray-600 rounded-lg p-4">
      <div className="flex flex-wrap gap-3 justify-center">
        {/* Weapon Commands */}
        {weapons.map(weapon => {
          const canUse = canUseWeapon(weapon.id);
          const tooltip = getWeaponTooltip(weapon.id);
          
          let commandType: Command['type'];
          switch (weapon.type) {
            case 'laser':
              commandType = 'fire-laser';
              break;
            case 'railgun':
              commandType = 'fire-railgun';
              break;
            case 'missile':
              commandType = 'launch-missiles';
              break;
            default:
              return null;
          }

          return (
            <CommandButton
              key={weapon.id}
              command={{ type: commandType, weaponId: weapon.id }}
              label={weapon.label}
              disabled={!canUse || gameEnded}
              tooltip={tooltip}
            />
          );
        })}

        {/* Evasive Maneuvers */}
        <CommandButton
          command={{ type: 'evade' }}
          label="Evade"
          disabled={isEvading || gameEnded}
          tooltip={isEvading ? 'Already evading' : 'Activate evasive maneuvers (blocks all enemy attacks this turn)'}
          className="bg-warning hover:bg-warning/80 border-warning"
        />

        {/* Pass Turn */}
        <CommandButton
          command={{ type: 'pass' }}
          label="Pass"
          disabled={gameEnded}
          tooltip="Pass turn without taking action"
          className="bg-gray-600 hover:bg-gray-500 border-gray-500"
        />
      </div>

      {/* Status Information */}
      <div className="mt-3 pt-3 border-t border-gray-600">
        <div className="flex justify-between text-xs text-gray-400">
          <span>• Enabled when in range, greyed-out otherwise</span>
          <span>• Disabled buttons show tooltip on hover</span>
        </div>
        {isEvading && (
          <div className="mt-2 text-center text-sm text-warning">
            ⚠️ Evasive maneuvers active - All enemy attacks blocked
          </div>
        )}
      </div>
    </div>
  );
};