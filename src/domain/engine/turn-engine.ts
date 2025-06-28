import { GameState, Command, LogEntry, Player } from '../types';
import { CommandFactory, GameEvent } from './commands';
import { MissileManager } from '../missiles/missile-manager';
import { EnemyAI } from '../ai/enemy-ai';
import { DamageCalculator } from '../combat/damage-calculator';
import { BALANCE_CONFIG } from '../constants/balance';

export class TurnEngine {
  private missileManager = new MissileManager();
  private enemyAI = new EnemyAI();
  private logIdCounter = 1;

  executeTurn(gameState: GameState, playerCommand: Command): GameState {
    // Create a deep copy to avoid mutating the original state
    const newState = JSON.parse(JSON.stringify(gameState));
    const events: GameEvent[] = [];
    
    // Emit turn start event
    events.push({
      type: 'TURN_START',
      payload: { turnNumber: newState.turnNumber },
      timestamp: Date.now(),
    });

    // Phase 1: Player movement - both ships close distance
    const movementEvents = this.processMovement(newState);
    events.push(...movementEvents);
    
    // Phase 2: Incoming missiles (outer PD + CIWS)
    const incomingMissileEvents = this.processIncomingMissiles(newState);
    events.push(...incomingMissileEvents);

    // Phase 3: Player cooldown tick (before command execution)
    this.tickPlayerCooldowns(newState);

    // Phase 4: Execute player command
    const playerCommandEvents = this.executePlayerCommand(newState, playerCommand);
    events.push(...playerCommandEvents);

    // Phase 5: Enemy phase (includes reset evade)
    const enemyEvents = this.executeEnemyPhase(newState);
    events.push(...enemyEvents);

    // Phase 6: Reset PD shots (evade reset is handled in enemy phase)
    this.missileManager.resetPDShots(newState.player);

    // Phase 7: Enemy cooldown tick
    this.enemyAI.tickCooldowns(newState.enemy);

    // Phase 8: Update missiles array
    newState.missiles = this.missileManager.getAllMissiles();

    // Phase 9: Check win conditions
    this.checkWinConditions(newState);

    // Phase 10: Generate summary
    const summaryEvent = this.generateTurnSummary(newState);
    events.push(summaryEvent);

    // Convert events to logs (use current turn number)
    const newLogs = this.eventsToLogs(events, newState.turnNumber);
    newState.logs.push(...newLogs);

    // Emit turn complete event
    events.push({
      type: 'TURN_COMPLETE',
      payload: { snapshot: newState },
      timestamp: Date.now(),
    });

    // Increment turn number for next turn
    newState.turnNumber++;

    return newState;
  }

  private processIncomingMissiles(gameState: GameState): GameEvent[] {
    const events: GameEvent[] = [];

    // Move all missiles
    const movedMissiles = this.missileManager.moveMissiles();
    movedMissiles.forEach(missile => {
      events.push({
        type: 'MISSILE_MOVED',
        payload: {
          missileId: missile.id,
          newDistance: missile.distance,
        },
        timestamp: Date.now(),
      });
    });

    // Process point defense
    const pdResults = this.missileManager.processPointDefense(gameState.player);
    pdResults.forEach(result => {
      events.push({
        type: 'MISSILE_INTERCEPTED',
        payload: result,
        timestamp: Date.now(),
      });
    });

    // Process missile impacts
    const impactingMissiles = this.missileManager.getImpactingMissiles();
    impactingMissiles.forEach(missile => {
      const damageResult = DamageCalculator.applyDamage(gameState.player, missile.damage);
      events.push({
        type: 'MISSILE_IMPACT',
        payload: {
          missileId: missile.id,
          damage: missile.damage,
          damageResult,
        },
        timestamp: Date.now(),
      });

      // Check for alerts
      this.checkDamageAlerts(gameState, damageResult, events);
    });

    return events;
  }

  private executePlayerCommand(gameState: GameState, command: Command): GameEvent[] {
    const events: GameEvent[] = [];

    try {
      const commandInstance = CommandFactory.createCommand(command);
      const result = commandInstance.execute(
        gameState.player,
        gameState.enemy,
        gameState.weapons,
        gameState.turnNumber
      );

      events.push({
        type: 'PLAYER_COMMAND_ISSUED',
        payload: {
          cmdType: command.type,
          args: command,
          turnNumber: gameState.turnNumber,
          success: result.success,
          message: result.message,
        },
        timestamp: Date.now(),
      });

      events.push(...result.events);

      // Handle missile launches
      const missileEvent = result.events.find(e => e.type === 'MISSILE_LAUNCHED');
      if (missileEvent) {
        const missiles = this.missileManager.launchMissileVolley(
          gameState.turnNumber,
          missileEvent.payload.volleySize,
          missileEvent.payload.damage,
          gameState.enemy.distance,
          10 // default missile speed
        );

        missiles.forEach(missile => {
          events.push({
            type: 'MISSILE_CREATED',
            payload: {
              missile,
              eta: this.missileManager.calculateETA(missile),
            },
            timestamp: Date.now(),
          });
        });
      }

    } catch (error) {
      events.push({
        type: 'ERROR_OCCURRED',
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error',
          context: 'player_command_execution',
        },
        timestamp: Date.now(),
      });
    }

    return events;
  }

  private executeEnemyPhase(gameState: GameState): GameEvent[] {
    // Enemy attacks only - movement is handled in movement phase
    const enemyResult = this.enemyAI.executeEnemyAttacks(
      gameState.enemy,
      gameState.player,
      gameState.turnNumber
    );

    const events = [...enemyResult.events];

    // Reset evade after enemy attacks (per spec: Enemy Phase includes "reset evade")
    gameState.player.evadeActive = false;

    // Process enemy direct fire damage
    enemyResult.actions.forEach(action => {
      if (action.type === 'fire-direct' && action.damage) {
        const damageResult = DamageCalculator.applyDamage(gameState.player, action.damage);
        events.push({
          type: 'PLAYER_DAMAGED',
          payload: {
            source: 'enemy_direct_fire',
            damageResult,
          },
          timestamp: Date.now(),
        });

        this.checkDamageAlerts(gameState, damageResult, events);
      }

      // Handle enemy missile launches
      if (action.type === 'launch-missiles' && action.damage) {
        const missiles = this.missileManager.launchMissileVolley(
          gameState.turnNumber,
          gameState.enemy.missileVolleySize,
          action.damage,
          gameState.enemy.distance,
          8 // enemy missile speed
        );

        missiles.forEach(missile => {
          events.push({
            type: 'ENEMY_MISSILE_CREATED',
            payload: {
              missile,
              eta: this.missileManager.calculateETA(missile),
            },
            timestamp: Date.now(),
          });
        });
      }
    });

    return events;
  }

  private checkDamageAlerts(gameState: GameState, damageResult: any, events: GameEvent[]): void {
    const player = gameState.player;

    // Shield alert
    if (player.shields / 100 < BALANCE_CONFIG.alertThresholds.shields) {
      events.push({
        type: 'ALERT_RAISED',
        payload: {
          level: 'warning',
          text: `⚠️ Shields critical: ${Math.round(player.shields)}%`,
        },
        timestamp: Date.now(),
      });
    }

    // Hull alerts
    const totalHull = player.hull.port + player.hull.starboard;
    if (totalHull / 200 < BALANCE_CONFIG.alertThresholds.hull) {
      events.push({
        type: 'ALERT_RAISED',
        payload: {
          level: 'critical',
          text: `🚨 Hull breach detected! Port: ${player.hull.port}% Star: ${player.hull.starboard}%`,
        },
        timestamp: Date.now(),
      });
    }

    // Subsystem alerts
    if (damageResult.subsystemDamaged) {
      events.push({
        type: 'ALERT_RAISED',
        payload: {
          level: 'warning',
          text: `⚙️ ${damageResult.subsystemDamaged} system damaged!`,
        },
        timestamp: Date.now(),
      });
    }
  }

  private tickPlayerCooldowns(gameState: GameState): void {
    gameState.weapons.forEach(weapon => {
      if (weapon.cooldown > 0) {
        weapon.cooldown--;
      }
    });
  }

  private checkWinConditions(gameState: GameState): void {
    // Player loses if all hull sections reach 0
    if (gameState.player.hull.port <= 0 && gameState.player.hull.starboard <= 0) {
      gameState.gameOver = true;
      gameState.winner = 'enemy';
    }

    // Player wins if enemy hull reaches 0
    if (gameState.enemy.hull <= 0) {
      gameState.gameOver = true;
      gameState.winner = 'player';
    }
  }

  private generateTurnSummary(gameState: GameState): GameEvent {
    const totalHull = gameState.player.hull.port + gameState.player.hull.starboard;
    const summary = {
      turnNumber: gameState.turnNumber,
      playerHull: totalHull,
      playerShields: gameState.player.shields,
      enemyHull: gameState.enemy.hull,
      distance: gameState.enemy.distance,
      activeMissiles: gameState.missiles.length,
    };

    return {
      type: 'SUMMARY_READY',
      payload: { report: summary },
      timestamp: Date.now(),
    };
  }

  private eventsToLogs(events: GameEvent[], turnNumber: number): LogEntry[] {
    return events.map(event => this.eventToLog(event, turnNumber)).filter(Boolean) as LogEntry[];
  }

  private eventToLog(event: GameEvent, turnNumber: number): LogEntry | null {
    const baseLog = {
      id: `log-${this.logIdCounter++}`,
      turnNumber,
      timestamp: event.timestamp,
    };

    switch (event.type) {
      case 'WEAPON_FIRED':
        return {
          ...baseLog,
          category: 'tactical' as const,
          emoji: '⚔️',
          text: `${event.payload.hits} hits for ${event.payload.totalDamage} damage`,
        };

      case 'MISSILE_LAUNCHED':
        return {
          ...baseLog,
          category: 'missile' as const,
          emoji: '🛰️',
          text: `Launched ${event.payload.volleySize} missiles`,
        };

      case 'MISSILE_MOVED':
        return {
          ...baseLog,
          category: 'missile' as const,
          emoji: '🛰️',
          text: `${event.payload.missileId} closing - distance: ${event.payload.newDistance}km`,
        };

      case 'MISSILE_INTERCEPTED':
        return {
          ...baseLog,
          category: 'missile' as const,
          emoji: '🛰️',
          text: `${event.payload.interceptor} ${event.payload.success ? 'intercepted' : 'missed'} ${event.payload.missileId}`,
        };

      case 'EVADE_ACTIVATED':
        return {
          ...baseLog,
          category: 'tactical' as const,
          emoji: '⚔️',
          text: 'Evasive maneuvers activated',
        };

      case 'ENEMY_DIRECT_FIRE':
        return {
          ...baseLog,
          category: 'enemy' as const,
          emoji: '💥',
          text: `Enemy scored ${event.payload.hits} hits for ${event.payload.totalDamage} damage`,
        };

      case 'ENEMY_ACTION':
        if (event.payload.actionType === 'attacks_blocked_by_evasion') {
          return {
            ...baseLog,
            category: 'tactical' as const,
            emoji: '🛡️',
            text: 'Enemy attacks blocked by evasion',
          };
        }
        return {
          ...baseLog,
          category: 'enemy' as const,
          emoji: '💥',
          text: `Enemy action: ${event.payload.actionType}`,
        };

      case 'ALERT_RAISED':
        return {
          ...baseLog,
          category: 'alerts' as const,
          emoji: '🚨',
          text: event.payload.text,
        };

      case 'SHIPS_MOVED':
        return {
          ...baseLog,
          category: 'tactical' as const,
          emoji: '🚀',
          text: `Ships closing - Distance: ${event.payload.oldDistance}km → ${event.payload.newDistance}km (−${event.payload.totalMovement}km)`,
        };

      case 'SUMMARY_READY':
        return {
          ...baseLog,
          category: 'summary' as const,
          emoji: '📊',
          text: `Turn ${event.payload.report.turnNumber} - Hull: ${event.payload.report.playerHull}/200, Shields: ${event.payload.report.playerShields}%, Distance: ${event.payload.report.distance}km`,
        };

      default:
        return null;
    }
  }

  private processMovement(newState: GameState): GameEvent[] {
    const events: GameEvent[] = [];
    
    // Both ships move closer to each other each turn
    if (newState.enemy.distance > 0) {
      const playerSpeed = this.getEffectivePlayerSpeed(newState.player);
      const totalSpeed = playerSpeed + newState.enemy.speed;
      const distanceReduction = Math.min(totalSpeed, newState.enemy.distance);
      
      const oldDistance = newState.enemy.distance;
      newState.enemy.distance = Math.max(0, oldDistance - distanceReduction);
      
      events.push({
        type: 'SHIPS_MOVED',
        payload: {
          playerSpeed,
          enemySpeed: newState.enemy.speed,
          totalMovement: distanceReduction,
          oldDistance,
          newDistance: newState.enemy.distance,
        },
        timestamp: Date.now(),
      });
    }
    
    return events;
  }

  private getEffectivePlayerSpeed(player: Player): number {
    // Base speed modified by engine damage
    const engineEfficiency = player.systems.engines / 100;
    return Math.round(player.speed * engineEfficiency);
  }

  getMissileManager(): MissileManager {
    return this.missileManager;
  }

  resetState(): void {
    this.missileManager.clear();
    this.logIdCounter = 1;
  }
}