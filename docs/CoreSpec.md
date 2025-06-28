## Command Deck Simulator — Ground-Up Build

Develop **Command Deck Simulator** from scratch according to the following design requirements. Do **not** assume any existing code; implement all features, data models, and algorithms anew.

### 1. Game Concept & Goals

* **Genre**: Single-player, turn-based tactical bridge simulation. 
* Played from the local browser 
* **Inspirations**: Honor Harrington, Ember War, The Expanse.  
* **Focus**: Tactical resource management (weapons, defenses, crew) over graphics.  
* **Objective**: Player commands a capital ship against one enemy vessel; survive and destroy the enemy.

### 2. User Interface

```
┌────────────────────────────────────────────────────────────────┐
│                       Command Deck Simulator                   │
├────────────────────────────────────────────────────────────────┤
│ [HULL Port: 100%] [HULL Star: 100%] [SHIELDS: 100%]            │
│ [DIST: 30 km] [SPD: 5 km/t] [ARMOR P:100%] [ARMOR S:100%]        │
│ [PD LvL: 90%] [PD Rng: 20 km] [PD Shots: 2]                      │
├────────────────────────────────────────────────────────────────┤
│ Systems Status      │ Crew Roles         │ Enemy Status        │
│ • Weapons:100%      │ • Tactical:Active  │ • Name: Pirate CV   │
│ • Engines:100%      │ • Engineer:Active  │ • Hull: 100%        │
│ • Sensors:80%       │ • Dmg Ctrl:Standby │ • Missile Range:15km│
│ • Life:100%         │                    │ • Direct Range:12km │
│                     │                    │ • Speed: 4 km/t     │
├────────────────────────────────────────────────────────────────┤
│ [Fire Lasers] [Fire Railgun] [Launch Missiles] [Evade] [Pass]  │
│ • Enabled when in range, greyed-out otherwise                   │
│ • Disabled buttons show "Out of range (need ≤ X km)" tooltip    │
├────────────────────────────────────────────────────────────────┤
│ Missile Tracking 🛰️                                           │
│ [0km]---[5km]---[10km]---[15km]---[20km]---[25km]---[30km]    │
│ 🚀        |        |        |        ⚡       |        👾      │
│ Player    CIWS     |        |        Missile  PD       Enemy    │
├────────────────────────────────────────────────────────────────┤
│ Log View:                                                     │
│  - Tactical & Missile panes always visible                     │
│  - Engineering & Enemy panes toggled via tabs                  │
│  - Alerts & Summary docked at bottom (fixed height, scroll)   │
└────────────────────────────────────────────────────────────────┘
```

### 3. Data Model

- **Hull**: `{ port: number, starboard: number }`  
- **Armor**: `{ port: { integrity, absorb }, starboard: {...} }`  
- **Shields**: number  
- **Player**: `{ speed, hull, armor, shields }`  
- **Systems**: `{ weapons, engines, sensors, lifeSupport, pointDefense }`  
- **Crew**: `{ tacticalOfficer, chiefEngineer, damageControl }`  
- **Enemy**: `{ name, hull, distance, speed, missileRange, directRange, missileVolleySize }`  
- **Weapons**: Array of `{ name, label, type, damage, range, cooldown, cooldownMax, volleySize? }`  
- **Pending Missiles**: Array of `{ id, distance, damage, speed }`  
- **Evade Active**: boolean  
- **pdShotsRemaining**: number  
- **Logs**: buckets per category (Tactical, Missile, Engineering, Enemy, Alerts, Summary)

### 4. Turn Workflow

**Player Phase**:  movement → incoming missiles (outer PD + CIWS) → selected action → cooldown tick

**Enemy Phase**: movement -> reset PD → missile volley (two-tier PD) → direct fire → reset evade → cooldown tick

After all phases, append a **Summary** log.

### 5. Combat Mechanics

- Shields → Armor → Hull with absorb values  
- 30% chance on hit to damage a random subsystem by 10%  
- Evade blocks all enemy fire phases 
- **Armor Degradation**: Effectiveness = (Current Integrity / Max Integrity). Damaged armor absorbs proportionally less damage.
- **Subsystem Damage Effects**:
  - Weapons: +1 turn cooldown per 20% integrity lost
  - Engines: -10% speed per 25% integrity lost  
  - Sensors: -5% hit chance per 20% integrity lost
  - Life Support: -2% crew efficiency per 30% integrity lost
  - Point Defense: -10% intercept chance per 15% integrity lost 

### 6. Point Defense System

- **Outer PD**: range = 20 km, chance = pointDefense%; finite shots  
- **CIWS**: range = 5 km, chance = 70%; consumes shot  
- Reset `pdShotsRemaining = 2` each enemy phase (configurable via balance constants)

### 7. Missile System

- **Missile Tracking**: Visual representation of missile positions relative to ships
- **Missile UI Components**: 
  - Distance markers showing km scale
  - Player and enemy ship positions
  - Active missile positions with distance tooltips
  - PD and CIWS range indicators
- **Missile Lifecycle**:
  - Launch: Missiles created with unique IDs (format: M[turn]-[sequence])
  - Travel: Each missile has individual speed (configurable per missile type)
  - Intercept: Two-tier defense (outer PD → CIWS)
  - Impact: Damage application on successful hit
- **Hit Probability Formula**: `baseAccuracy * rangeModifier * speedModifier * evasionModifier * crewSkillModifier`
  - Range Modifier: `max(0.3, 1 - (distance / maxRange))`
  - Speed Modifier: `max(0.5, 1 - (targetSpeed / 100))`
  - Evasion Modifier: `0.1` if evading, `1.0` otherwise
  - Crew Skill: `tacticalOfficer.skill / 100`
- **Missile Logs**:
  - Launch confirmation with ETA calculation
  - Movement updates with distance reporting
  - Interception events with defense type
  - Impact results with damage reporting

### 8. Logging & UI Panes

**Categories & Emojis**

| Category        | Emoji | Description                                   |
|-----------------|:-----:|-----------------------------------------------|
| Tactical        | ⚔️    | Player weapons (fires, hits, out-of-range)    |
| Missile Ops     | 🛰️    | Missile launches, movement, PD intercept      |
| Engineering     | ⚙️    | Cooldown ticks, shields/armor absorb, subsys dmg |
| Enemy           | 💥    | Enemy hits, status changes                    |
| Alerts          | 🚨    | Critical warnings (low shields/hull)          |
| Summary         | 📊    | End-of-turn recap (damage, distance, stats)   |

**Layout**
```
┌──────────────────────────────────────────────────────────┐
│ HUD / Actions                                           │
├──────────────────────────────────────────────────────────┤
│ [Tactical ⚔️] [Missile 🛰️] [Engineering ⚙️ | tab] [Enemy 💥 | tab] │
├──────────────────────────────────────────────────────────┤
│ pane: shows current logs (newest at top, hr separators) │
├──────────────────────────────────────────────────────────┤
│ Alerts 🚨 (bottom dock, fixed height, scroll)            │
│ Summary 📊 (bottom dock, fixed height, scroll)           │
└──────────────────────────────────────────────────────────┘
```

### 9. Testing Strategy (overview)

Testing framework, coverage goals, and detailed suites are defined in **TestSpec.md**.

### 10. File Structure (initial)

> See ArchitectSpec §2 for recommended folder tree; this core spec will evolve once code begins.

### 11. Architecture Reference

Detailed tech-stack, runtime, patterns, and component map are documented in `ArchitectSpec.md`.

### 12. Testing Reference

Comprehensive test blueprint and coverage requirements live in `TestSpec.md`.

