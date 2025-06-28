* **Expanded Damage Pipeline** in section 4.4 (now includes armor degradation)

---

## Command Deck Simulator — Architecture Specification

### 1. Tech Stack & Architecture

#### 1.1 Runtime & Delivery

• Bundled with **Vite** (fast local dev).
• **TypeScript 5**, **React 18**, **React-Router 6** (single-page layout).
• **Zustand** for game-state store (small, un-opinionated, serialisable).
• **Tailwind CSS** for utility styling – keeps the ship’s HUD looking crisp without mountains of SCSS.
• Icons/emoji supplied via Twemoji for consistency.
• Target browser: latest Chrome (personal-project scope).
• **dev\:mock** script boots with a predefined snapshot for quick UI navigation.

#### 1.2 Architectural Pattern

• “Clean Architecture” layering:
– **Domain** (pure logic, no React): turn engine, combat maths, RNG, state transitions.
– **Application**: orchestrates game loop, dispatches domain commands, raises domain events.
– **UI**: React components read state from `zustand` selectors, fire typed commands back.
– **Infrastructure**: browser APIs (localStorage for future save games, Service Worker for offline).

*Canonical state lives **only inside the Domain layer**. The zustand store holds a read-only copy; any mutation must occur via Domain commands to preserve determinism.*

Domain emits *immutable* “State Snapshots”; UI re-renders from those – keeps testability high and race conditions low.

#### 1.3 Game Loop

```ts
export class GameEngine {
  runTurn(playerCmd: Command) {
    domain.applyIncomingMissiles();
    domain.executePlayerCommand(playerCmd);
    domain.cooldownsAndCleanup();
    domain.executeEnemyPhase();
    uiEvents.publish("TURN_COMPLETE", domain.snapshot());
  }
}
```

#### 1.4 Key Patterns

• **Command pattern** for any user action (`FireLasers`, `Evade`, etc.) – simplifies undo/replay.
• **EventBus**: lean 1 kB EventEmitter wrapper (no RxJS).
• **Entity-Component System** inside the Domain if missile & ship subsystems proliferate later.
• **Adapter** layer hides browser APIs (localStorage, IndexedDB) behind interfaces – future server sync won’t wreck the domain.

##### 1.4.1 Event Catalogue

*All events are dispatched on the lightweight EventEmitter. Payloads are plain JSON, snake-case keys.*

| Event                   | Payload Shape                                                                 | Purpose                              |                |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------------------ | -------------- |
| `TURN_START`            | `{ turn_number }`                                                             | Marks beginning of player phase      |                |
| `PLAYER_COMMAND_ISSUED` | `{ cmd_type, args, turn_number }`                                             | UI sends command to domain           |                |
| `WEAPON_FIRED`          | `{ weapon_id, target, volley_size }`                                          | Domain notifies a direct-fire volley |                |
| `MISSILE_LAUNCHED`      | `{ volley_id, missile_class, count, speed, damage, range, eta, turn_number }` | Supports mixed missile stats         |                |
| `MISSILE_MOVED`         | `{ missile_id, new_distance }`                                                | Each tick of missile travel          |                |

| `MISSILE_INTERCEPTED`   | `{ missile_id, interceptor: 'PD' 'CIWS', success }`                           | PD/CIWS result |
| `MISSILE_IMPACT`        | `{ missile_id, damage_dealt }`                                                | On successful hit                    |                |
| `EVADE_ACTIVATED`       | `{ duration_turns }`                                                          | Player evasive manoeuvre             |                |
| `SHIELD_CHANGED`        | `{ new_value, delta }`                                                        | After damage or regen                |                |
| `ARMOR_CHANGED`         | `{ side, new_value, delta }`                                                  | —                                    |                |
| `HULL_CHANGED`          | `{ side, new_value, delta }`                                                  | —                                    |                |
| `SUBSYSTEM_DAMAGED`     | `{ system, new_integrity, delta }`                                            | —                                    |                |
| `ENEMY_ACTION`          | `{ action_type, details }`                                                    | Generic enemy step                   |                |
| `TURN_COMPLETE`         | `{ snapshot }`                                                                | End of both phases                   |                |
| `LOG_EVENT`             | `{ category, emoji, text, turn_number }`                                      | Feed UI log panes                    |                |
| `ALERT_RAISED`          | `{ level, text }`                                                             | Critical warnings                    |                |
| `SUMMARY_READY`         | `{ report }`                                                                  | End-of-turn recap                    |                |
| `STATE_SAVED`           | `{ slot_id, snapshot }`                                                       | Persistence                          |                |
| `STATE_LOADED`          | `{ slot_id, snapshot }`                                                       | —                                    |                |
| `ERROR_OCCURRED`        | `{ error, context }`                                                          | Centralised error bus                |                |

#### 1.5 File / Folder Layout

```
/ src
  / domain      <-- pure logic, no imports from elsewhere
  / app         <-- GameEngine, adapters, zustand store
  / ui          <-- React components, hooks, Tailwind
  / assets      <-- icons, sprites, sound stings
  / tests       <-- Jest/Vitest suites
```

#### 1.6 Testing & CI

• **Vitest** for unit tests, **React-Testing-Library**, **fast-check** property-based tests, **stryker-js** mutation tests, **Cypress Component Testing**.
• 90 %+ branch coverage on Domain; mutation score ≥ 70 %.

#### 1.7 Future-Proofing

• Persist full event stream alongside snapshots (event sourcing).

---

### 2. Component Breakdown

| Feature           | Domain Layer                              | Application Layer   | UI Layer               | Infra / Adapter       |
| ----------------- | ----------------------------------------- | ------------------- | ---------------------- | --------------------- |
| Turn workflow     | `TurnEngine`, `CombatResolver`            | `GameEngine`        | —                      | —                     |
| Combat maths      | `DamageCalculator`, `SubsystemController` | —                   | —                      | —                     |
| Missile tracking  | `MissileManager`                          | `GameEngine`        | `MissileTrack` SVG/CSS | —                     |
| Point-defence     | `PDSystem`                                | —                   | Range overlay          | —                     |
| Player commands   | Command objects                           | Dispatch queue      | HUD buttons            | —                     |
| Enemy AI          | `EnemyAI`                                 | Scheduler in engine | —                      | —                     |
| Snapshots         | `GameState`                               | `stateAdapter`      | —                      | `localStorageAdapter` |
| Logs & Events     | `LogEvent` types                          | **EventBus**        | Log panes              | —                     |
| HUD stats         | —                                         | zustand selectors   | `HudStatusBars`        | —                     |
| Alerts & Summary  | `AlertGenerator`, `SummaryBuilder`        | Emit events         | Alert / Summary panes  | —                     |
| Balance constants | `constants/balance.ts`                    | DI load             | —                      | —                     |
| PWA / offline     | —                                         | —                   | —                      | `vite-plugin-pwa`     |
| Icons / theme     | —                                         | —                   | Tailwind & Twemoji     | —                     |

---

### 3. References

*For testing details see `TestSpec.md`.*

---

### 4. Combat Resolution Algorithms

#### 4.1 Hit Resolution

Contextual probability modified by:

* Weapon accuracy
* Target speed
* Evasive state
* Range-to-target ratio
* Attacker crew skill

All rolled via a seeded PRNG for determinism.

#### 4.2 Missile Resolution

**Missile stats:**

* `guidanceQuality`: improves hit chance
* `evasionRating`: reduces interception chance

#### 4.3 Interception Rolls

```ts
chance = baseAccuracy
  * (1 - missile.evasionRating)
  * (pdSystemHealth / 100)
  * (CIWS ? 1 : 1 - missile.speed / 100);
```

#### 4.4 Damage Pipeline

Damage proceeds through:

1. **Shields** absorb as much as possible.
2. **Armor** mitigates a % of remaining damage:

   * That **absorbed portion** reduces armor integrity.
   * Integrity loss reduces future mitigation effectiveness.
3. **Hull** takes remaining damage:

   * Triggers warnings and alerts at 50%, 25%, 10%.
4. **Subsystem Damage** has a 30% chance to occur when hull is damaged.

All layers emit individual events (`*_CHANGED`), and logs record combat flow.

#### 4.5 Cooldowns & Turn Logic

* Commands apply cooldown (`cooldown = cooldownMax`)
* Cooldowns tick down post-turn
* Evade resets after enemy phase

#### 4.6 Subsystem Damage

* Affects a random active system
* Reduces effectiveness (e.g., weapon cooldown increases, regen slows)
* Integrity values tracked per system

---
