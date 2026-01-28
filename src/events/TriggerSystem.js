/**
 * TriggerSystem - Управление триггерами и событиями
 */

import { Vector3 } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { EventBus, Events } from '../core/EventBus.js';
import { EventActions } from './EventActions.js';
import { toVector3 } from '../utils/Math.js';

export class TriggerSystem {
  constructor() {
    this.triggers = new Map();
    this.activeTriggers = new Set(); // Triggers player is currently inside
    this.eventActions = new EventActions();

    // Listen for action events
    EventBus.on('action', (action) => {
      this.eventActions.execute(action);
    });
  }

  /**
   * Register a trigger from definition
   */
  register(definition) {
    const trigger = {
      id: definition.id,
      type: definition.type, // onEnter, onExit, onUse, onTimer, onCondition
      volume: this.createVolume(definition.volume),
      conditions: definition.conditions || [],
      actions: definition.actions || [],
      once: definition.once || false,
      fired: false,
      enabled: definition.enabled !== false,
      delay: definition.delay || 0,
      cooldown: definition.cooldown || 0,
      lastFired: 0
    };

    this.triggers.set(definition.id, trigger);
    GameState.triggers.set(definition.id, trigger);

    return trigger;
  }

  /**
   * Create volume from definition
   */
  createVolume(volumeDef) {
    if (!volumeDef) return null;

    const center = toVector3(volumeDef.center);
    const size = toVector3(volumeDef.size);
    const halfSize = size.scale(0.5);

    return {
      center,
      size,
      min: center.subtract(halfSize),
      max: center.add(halfSize)
    };
  }

  /**
   * Check if point is inside volume
   */
  isInsideVolume(point, volume) {
    if (!volume) return false;

    return point.x >= volume.min.x && point.x <= volume.max.x &&
           point.y >= volume.min.y && point.y <= volume.max.y &&
           point.z >= volume.min.z && point.z <= volume.max.z;
  }

  /**
   * Update all triggers
   */
  update(playerPosition, dt) {
    const now = performance.now();

    for (const [id, trigger] of this.triggers) {
      if (!trigger.enabled) continue;
      if (trigger.once && trigger.fired) continue;
      if (now - trigger.lastFired < trigger.cooldown * 1000) continue;

      const isInside = trigger.volume ? this.isInsideVolume(playerPosition, trigger.volume) : false;
      const wasInside = this.activeTriggers.has(id);

      switch (trigger.type) {
        case 'onEnter':
          if (isInside && !wasInside) {
            if (this.checkConditions(trigger.conditions)) {
              this.fireTrigger(trigger, now);
            }
          }
          break;

        case 'onExit':
          if (!isInside && wasInside) {
            if (this.checkConditions(trigger.conditions)) {
              this.fireTrigger(trigger, now);
            }
          }
          break;

        case 'onCondition':
          // Fire when conditions become true
          if (this.checkConditions(trigger.conditions)) {
            this.fireTrigger(trigger, now);
          }
          break;
      }

      // Update active triggers set
      if (isInside) {
        this.activeTriggers.add(id);
      } else {
        this.activeTriggers.delete(id);
      }
    }
  }

  /**
   * Check if all conditions are met
   */
  checkConditions(conditions) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(cond => {
      switch (cond.type) {
        case 'flag':
          return this.evaluateOperator(GameState.getFlag(cond.target), cond.operator, cond.value);

        case 'counter':
          return this.evaluateOperator(GameState.getCounter(cond.target), cond.operator, cond.value);

        case 'hasItem':
          return GameState.hasItem(cond.target) === (cond.value !== false);

        case 'objectState':
          const obj = GameState.interactives.get(cond.target);
          if (!obj) return false;
          return obj[cond.property] === cond.value;

        default:
          return true;
      }
    });
  }

  /**
   * Evaluate comparison operator
   */
  evaluateOperator(a, operator, b) {
    switch (operator) {
      case '==': return a === b;
      case '!=': return a !== b;
      case '>': return a > b;
      case '<': return a < b;
      case '>=': return a >= b;
      case '<=': return a <= b;
      default: return a === b;
    }
  }

  /**
   * Fire a trigger
   */
  fireTrigger(trigger, now) {
    trigger.fired = true;
    trigger.lastFired = now;

    EventBus.emit(Events.TRIGGER_ACTIVATE, { id: trigger.id, trigger });

    // Execute actions after delay
    if (trigger.delay > 0) {
      setTimeout(() => {
        this.executeActions(trigger.actions);
      }, trigger.delay * 1000);
    } else {
      this.executeActions(trigger.actions);
    }
  }

  /**
   * Execute list of actions
   */
  executeActions(actions) {
    for (const action of actions) {
      this.eventActions.execute(action);
    }
  }

  /**
   * Manually trigger by ID
   */
  trigger(triggerId) {
    const trigger = this.triggers.get(triggerId);
    if (trigger && trigger.enabled) {
      this.fireTrigger(trigger, performance.now());
    }
  }

  /**
   * Enable/disable trigger
   */
  setEnabled(triggerId, enabled) {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.enabled = enabled;
    }
  }

  /**
   * Reset trigger (allow it to fire again)
   */
  reset(triggerId) {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.fired = false;
      trigger.lastFired = 0;
    }
  }

  /**
   * Clear all triggers
   */
  clear() {
    this.triggers.clear();
    this.activeTriggers.clear();
  }
}

export default TriggerSystem;
