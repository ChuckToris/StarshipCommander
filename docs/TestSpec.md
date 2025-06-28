## Command Deck Simulator — Test Suite Specification

### 1. Overview
This document enumerates the MINIMUM automated tests required for initial release and ongoing regression of **Command Deck Simulator**.  Each bullet beginning with **it** represents a discrete test case.

### 2. Domain Layer

#### 2.1 Turn Engine
* **it** executes phases in exact spec order (player → incoming missiles → command → cooldown → enemy)
* **it** honours null or malformed player commands by skipping action & logging an error
* **it** applies *Evade* before any enemy fire or missile launch in the same turn
* **it** resets point-defence shots at the start of every enemy phase
* **it** appends a Summary 📊 log at **TURN_COMPLETE**
* **it** emits **TURN_START**, **PLAYER_COMMAND_ISSUED**, **TURN_COMPLETE** in that order

#### 2.2 Damage Calculator
* **it** routes damage Shields → Armor(absorb) → Hull with proper overflow
* **it** never allows negative values for shields, armor, or hull
* **it** handles the exact-kill edge case (all three hit 0 in one volley)
* **it** applies subsystem damage at 30 % probability per direct hit
* **it** selects only an existing, non-destroyed subsystem for damage
* **it** clamps subsystem integrity at 0 and raises a single destroy event

#### 2.3 Missile Manager
* **it** creates unique missile IDs `M{turn}-{seq}` with correct ETA
* **it** moves missiles −10 km each turn until intercept or impact
* **it** removes missiles after intercept, impact, or leaving play area
* **it** prioritises Outer PD before CIWS when both are in range the same turn
* **it** logs launch 🛰️, movement, intercept, impact in order for every missile
* **it** never lets distance fall below 0 km or exceed 30 km

#### 2.4 Point-Defence System
* **it** fires Outer PD only for missiles ≤ 20 km
* **it** fires CIWS only for missiles ≤ 5 km
* **it** consumes a shot on every attempt, success or fail
* **it** never lets `pdShotsRemaining` go below 0 and resets to 2 per volley (configurable)
* **it** emits **MISSILE_INTERCEPTED** with result and interceptor type

#### 2.5 Command Objects
**FireWeaponCmd**
* **it** validates range and cooldown before firing
* **it** sets `cooldownMax` on success
* **it** emits **WEAPON_FIRED** with weaponId / volleySize

**EvadeCmd**
* **it** sets `EvadeActive` true for one enemy phase
* **it** disables all other player actions that turn
* **it** logs **EVADE_ACTIVATED** with duration

**PassCmd**
* **it** ticks all cooldowns but performs no action

#### 2.6 Cooldown System
* **it** ticks every cooldown ≥ 1 down by one each turn
* **it** resets cooldown to `cooldownMax` immediately on fire
* **it** prevents weapon use while cooldown > 0

#### 2.7 Enemy AI
* **it** launches a missile volley when player distance ≤ `missileRange`
* **it** fires direct weapons when distance ≤ `directRange`
* **it** skips attack entirely if player is evading
* **it** uses `missileVolleySize`, respecting cooldown & ammo

#### 2.8 Summary & Alerts
**SummaryBuilder**
* **it** aggregates total damage dealt, taken, intercepts, subsystem hits
* **it** reports distance and remaining hull at turn end

**AlertGenerator**
* **it** raises 🚨 when shields < 30 %
* **it** raises 🚨 when hull < 20 % (either side)
* **it** raises 🚨 when a subsystem reaches 0 % integrity

### 3. Application Layer

#### 3.1 Game Engine
* **it** invokes domain phases in correct sequence inside `runTurn()`
* **it** publishes a snapshot to the zustand store after **TURN_COMPLETE**
* **it** wraps domain errors and emits **ERROR_OCCURRED** without crashing
* **it** supports deterministic replay given identical command streams

#### 3.2 Event Bus
* **it** delivers events to multiple subscribers in FIFO order
* **it** allows safe unsubscribe mid-stream with no side-effects
* **it** handles 1 000 rapid events without memory growth > X KB

### 4. Infrastructure

#### 4.1 LocalStorage Adapter
* **it** saves snapshots with `schemaVersion` and SHA-256 hash
* **it** verifies hash on load and rejects tampered data
* **it** restores game state identical (deep compare) to saved snapshot
* **it** emits **STATE_SAVED** and **STATE_LOADED** events

#### 4.2 Service Worker / PWA
* **it** caches core assets and emoji sprite on install
* **it** serves cached assets when offline detected
* **it** allows full gameplay offline after first visit

### 5. UI Components

#### 5.1 `<HudStatusBars />`
* **it** renders Shields, Hull (port/star), Armor (port/star), Speed, Distance
* **it** updates values reactively on snapshot change
* **it** shows red danger style when any stat is below its critical threshold

#### 5.2 `<CommandButtons />`
* **it** enables only when weapon is in range and off cooldown
* **it** shows tooltip “Out of range (need ≤ X km)” when disabled by range
* **it** shows tooltip “Cooling down (Y turns)” when disabled by cooldown
* **it** disables all buttons when `EvadeActive` is true
* **it** dispatches the correct Command on click

#### 5.3 `<MissileTracker />`
* **it** renders a 0–30 km ruler with fixed PD/CIWS markers
* **it** positions 🚀 icons accurately relative to distance values
* **it** removes missile icon immediately on intercept or impact
* **it** shows tooltip with missileId and distance on hover
* **it** maintains layout on window resize (responsive)

#### 5.4 `<LogTabs />`
* **it** filters logs by Tactical⚔️, Missile🛰️, Engineering⚙️, Enemy💥 categories
* **it** remembers scroll position per tab when switching

#### 5.5 Alerts & Summary Panes
**AlertsPane**
* **it** stacks new alerts at bottom, oldest scrolls first
* **it** persists alerts until cleared or subsystem recovers

**SummaryPane**
* **it** appends one summary entry per **TURN_COMPLETE**
* **it** matches SummaryBuilder values exactly (damage, stats)

### 6. Property-Based Invariants (fast-check)
* **it** never produces negative shields, armor, or hull for random inputs
* **it** keeps missile distance within [0, 30] km for random game lengths
* **it** maintains valid game state across random command sequences
* **it** ensures no two different commands create identical event streams

### 7. Mutation / Hardening (stryker-js)
* **it** detects mutations in DamageCalculator (100 % kill on critical lines)
* **it** detects mutations in MissileManager intercept logic
* **it** detects logic-inversion mutations on Evade paths
* **it** detects accuracy mutations in PD/CIWS calculations

### 8. E2E & Non-Functional (Cypress + Benchmarks)
#### 8.1 Full Game Simulations
* **it** completes a player-victory path: start → enemy hull 0 without errors
* **it** completes a player-defeat path: start → player hull 0 without errors
* **it** saves mid-game, reloads, and continues to identical deterministic outcome
* **it** simulates 1 000 turns with no memory leak or perf degradation
* **it** test to ensures enemy will emit all commands when appropriate
