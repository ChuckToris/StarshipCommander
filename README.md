# Command Deck Simulator

A single-player, turn-based tactical bridge simulation game inspired by Honor Harrington, Ember War, and The Expanse.

## Overview

Command a capital ship against an enemy vessel in tactical combat. Manage weapons, defenses, and crew while surviving enemy attacks through strategic use of point defense systems and evasive maneuvers.

## Features

- **Turn-based Combat**: Strategic gameplay with weapon cooldowns and timing
- **Missile System**: Launch and defend against missiles with two-tier point defense
- **Damage System**: Realistic damage progression through shields, armor, and hull
- **Subsystem Damage**: System failures affect combat effectiveness
- **Enemy AI**: Intelligent opponent with multiple attack patterns
- **Real-time UI**: Comprehensive HUD with status displays and logging

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## How to Play

### Objective
Destroy the enemy ship while keeping your own ship intact.

### Controls
- **Fire Lasers**: Close-range rapid-fire weapon
- **Fire Railgun**: Medium-range high-damage weapon  
- **Launch Missiles**: Long-range guided weapons
- **Evade**: Block all enemy attacks for one turn
- **Pass**: Skip turn without action

### Game Mechanics

**Combat Flow:**
1. Player movement (if any)
2. Incoming missile defense (PD + CIWS)
3. Player command execution
4. Enemy phase (movement + attacks)
5. Cooldowns and cleanup

**Damage System:**
- Shields absorb damage first
- Armor mitigates remaining damage (effectiveness decreases as armor is damaged)
- Hull takes final damage
- 30% chance of subsystem damage on hull hits

**Point Defense:**
- Outer PD: 20km range, 2 shots per turn
- CIWS: 5km range, high accuracy
- Missiles move individually based on type

### Win Conditions
- **Victory**: Reduce enemy hull to 0
- **Defeat**: Both hull sections (port/starboard) reach 0

## Technical Details

### Architecture
- **Domain Layer**: Pure game logic (TypeScript)
- **Application Layer**: Game engine and state management (Zustand)
- **UI Layer**: React components with Tailwind CSS
- **Clean Architecture**: Separation of concerns with event-driven communication

### Tech Stack
- **Frontend**: React 18, TypeScript 5
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Build Tool**: Vite
- **Testing**: Vitest (configured)

### Project Structure
```
src/
├── domain/         # Core game logic
│   ├── types/      # TypeScript interfaces
│   ├── constants/  # Balance configuration
│   ├── combat/     # Damage calculation
│   ├── missiles/   # Missile and PD systems
│   ├── engine/     # Turn engine and commands
│   └── ai/         # Enemy AI
├── app/            # Application layer
│   ├── engine/     # Game engine
│   ├── store/      # State management
│   └── events/     # Event bus
└── ui/             # React components
    ├── components/ # UI components
    └── hooks/      # React hooks
```

## Game Balance

Key balance parameters are configurable in `src/domain/constants/balance.ts`:

- Point Defense shots per turn: 2
- Subsystem damage chance: 30%
- Alert thresholds for shields/hull
- Weapon ranges, damage, and cooldowns

## Development

### Running Tests
```bash
npm run test
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run build  # Includes TypeScript compilation
```

## License

This project is for educational and demonstration purposes.