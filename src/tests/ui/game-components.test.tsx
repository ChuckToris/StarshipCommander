import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HudStatusBars } from '../../ui/components/HudStatusBars';
import { CommandButtons } from '../../ui/components/CommandButtons';
import { useGame } from '../../ui/hooks/use-game';

// Mock the useGame hook
vi.mock('../../ui/hooks/use-game');

const mockUseGame = vi.mocked(useGame);

describe('UI Components', () => {
  const mockGameState = {
    player: {
      shields: 75,
      hull: { port: 90, starboard: 85 },
      armor: { port: { integrity: 95 }, starboard: { integrity: 88 } },
      speed: 5,
      systems: { engines: 100 },
      pdShotsRemaining: 2,
      evadeActive: false,
    },
    enemy: {
      distance: 25,
      speed: 4,
    },
    weapons: [
      {
        id: 'laser-1',
        name: 'Laser Battery',
        label: 'Fire Lasers',
        type: 'laser',
        range: 12,
        cooldown: 0,
      },
      {
        id: 'railgun-1', 
        name: 'Railgun',
        label: 'Fire Railgun',
        type: 'railgun',
        range: 18,
        cooldown: 2,
      },
    ],
    gameOver: false,
    canUseWeapon: vi.fn(),
    getWeaponTooltip: vi.fn(),
    executeCommand: vi.fn(),
  };

  beforeEach(() => {
    mockUseGame.mockReturnValue(mockGameState);
  });

  describe('HudStatusBars', () => {
    it('renders Shields, Hull (port/star), Armor (port/star), Speed, Distance', () => {
      render(<HudStatusBars />);
      
      expect(screen.getByText('HULL Port:')).toBeInTheDocument();
      expect(screen.getByText('HULL Star:')).toBeInTheDocument();
      expect(screen.getByText('SHIELDS:')).toBeInTheDocument();
      expect(screen.getByText('ARMOR P:')).toBeInTheDocument();
      expect(screen.getByText('ARMOR S:')).toBeInTheDocument();
      expect(screen.getByText('DISTANCE')).toBeInTheDocument();
      expect(screen.getByText('YOUR SPEED')).toBeInTheDocument();
      expect(screen.getByText('ENEMY SPEED')).toBeInTheDocument();
    });

    it('updates values reactively on snapshot change', () => {
      const { rerender } = render(<HudStatusBars />);
      
      expect(screen.getByText('75%')).toBeInTheDocument(); // Shields
      expect(screen.getByText('25 km')).toBeInTheDocument(); // Distance
      
      // Update mock data
      mockUseGame.mockReturnValue({
        ...mockGameState,
        player: { ...mockGameState.player, shields: 50 },
        enemy: { ...mockGameState.enemy, distance: 15 },
      });
      
      rerender(<HudStatusBars />);
      
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('15 km')).toBeInTheDocument();
    });

    it('shows red danger style when any stat is below critical threshold', () => {
      // Mock low shields
      mockUseGame.mockReturnValue({
        ...mockGameState,
        player: { ...mockGameState.player, shields: 25 },
      });
      
      render(<HudStatusBars />);
      
      // The colored bar is a sibling of the text span, both inside the gray container
      const textElement = screen.getByText('25%');
      const barContainer = textElement.parentElement;
      
      // Find the colored bar element (should be the first child)
      const coloredBar = barContainer?.firstElementChild;
      
      expect(coloredBar).toHaveClass('bg-danger');
    });
  });

  describe('CommandButtons', () => {
    beforeEach(() => {
      mockGameState.canUseWeapon.mockImplementation((weaponId: string) => {
        if (weaponId === 'laser-1') return false; // Out of range
        if (weaponId === 'railgun-1') return false; // On cooldown
        return true;
      });
      
      mockGameState.getWeaponTooltip.mockImplementation((weaponId: string) => {
        if (weaponId === 'laser-1') return 'Out of range (need ≤ 12 km)';
        if (weaponId === 'railgun-1') return 'Cooling down (2 turns)';
        return 'Ready to fire';
      });
    });

    it('enables only when weapon is in range and off cooldown', () => {
      render(<CommandButtons />);
      
      const laserButton = screen.getByText('Fire Lasers');
      const railgunButton = screen.getByText('Fire Railgun');
      
      expect(laserButton).toBeDisabled();
      expect(railgunButton).toBeDisabled();
    });

    it('shows tooltip "Out of range (need ≤ X km)" when disabled by range', () => {
      render(<CommandButtons />);
      
      const laserButton = screen.getByText('Fire Lasers');
      expect(laserButton).toHaveAttribute('title', 'Out of range (need ≤ 12 km)');
    });

    it('shows tooltip "Cooling down (Y turns)" when disabled by cooldown', () => {
      render(<CommandButtons />);
      
      const railgunButton = screen.getByText('Fire Railgun');
      expect(railgunButton).toHaveAttribute('title', 'Cooling down (2 turns)');
    });

    it('disables all buttons when EvadeActive is true', () => {
      mockUseGame.mockReturnValue({
        ...mockGameState,
        player: { ...mockGameState.player, evadeActive: true },
      });
      
      render(<CommandButtons />);
      
      const laserButton = screen.getByText('Fire Lasers');
      const railgunButton = screen.getByText('Fire Railgun');
      const evadeButton = screen.getByText('Evade');
      
      expect(laserButton).toBeDisabled();
      expect(railgunButton).toBeDisabled();
      expect(evadeButton).toBeDisabled();
    });

    it('dispatches the correct Command on click', () => {
      // Mock a weapon that can be used
      mockGameState.canUseWeapon.mockReturnValue(true);
      
      render(<CommandButtons />);
      
      const laserButton = screen.getByText('Fire Lasers');
      fireEvent.click(laserButton);
      
      expect(mockGameState.executeCommand).toHaveBeenCalledWith({
        type: 'fire-laser',
        weaponId: 'laser-1',
      });
    });

    it('evade button works correctly', () => {
      render(<CommandButtons />);
      
      const evadeButton = screen.getByText('Evade');
      fireEvent.click(evadeButton);
      
      expect(mockGameState.executeCommand).toHaveBeenCalledWith({
        type: 'evade',
      });
    });

    it('pass button works correctly', () => {
      render(<CommandButtons />);
      
      const passButton = screen.getByText('Pass');
      fireEvent.click(passButton);
      
      expect(mockGameState.executeCommand).toHaveBeenCalledWith({
        type: 'pass',
      });
    });
  });

  describe('Integration', () => {
    it('components work together without errors', () => {
      render(
        <div>
          <HudStatusBars />
          <CommandButtons />
        </div>
      );
      
      // Should render without throwing
      expect(screen.getByText('SHIELDS:')).toBeInTheDocument();
      expect(screen.getByText('Fire Lasers')).toBeInTheDocument();
    });
  });
});