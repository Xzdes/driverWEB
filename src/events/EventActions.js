/**
 * EventActions - Обработка действий триггеров
 */

import { GameState } from '../core/GameState.js';
import { EventBus, Events } from '../core/EventBus.js';
import { Logger } from '../utils/Logger.js';

export class EventActions {
  constructor() {
    this.handlers = new Map();
    this.registerDefaultHandlers();
  }

  /**
   * Register default action handlers
   */
  registerDefaultHandlers() {
    // State management
    this.register('setFlag', this.handleSetFlag.bind(this));
    this.register('incrementCounter', this.handleIncrementCounter.bind(this));
    this.register('decrementCounter', this.handleDecrementCounter.bind(this));
    this.register('setCounter', this.handleSetCounter.bind(this));

    // Object control
    this.register('openDoor', this.handleOpenDoor.bind(this));
    this.register('closeDoor', this.handleCloseDoor.bind(this));
    this.register('toggleDoor', this.handleToggleDoor.bind(this));
    this.register('enableObject', this.handleEnableObject.bind(this));
    this.register('disableObject', this.handleDisableObject.bind(this));

    // Spawning
    this.register('spawnObject', this.handleSpawnObject.bind(this));
    this.register('destroyObject', this.handleDestroyObject.bind(this));
    this.register('spawnCharacter', this.handleSpawnCharacter.bind(this));

    // Audio
    this.register('playSound', this.handlePlaySound.bind(this));
    this.register('stopSound', this.handleStopSound.bind(this));

    // UI
    this.register('showMessage', this.handleShowMessage.bind(this));

    // Player
    this.register('teleportPlayer', this.handleTeleportPlayer.bind(this));
    this.register('giveItem', this.handleGiveItem.bind(this));
    this.register('takeItem', this.handleTakeItem.bind(this));

    // Room
    this.register('loadRoom', this.handleLoadRoom.bind(this));

    // Triggers
    this.register('enableTrigger', this.handleEnableTrigger.bind(this));
    this.register('disableTrigger', this.handleDisableTrigger.bind(this));
    this.register('fireTrigger', this.handleFireTrigger.bind(this));

    // Custom
    this.register('emit', this.handleEmit.bind(this));
    this.register('delay', this.handleDelay.bind(this));
    this.register('sequence', this.handleSequence.bind(this));
  }

  /**
   * Register a custom action handler
   */
  register(actionType, handler) {
    this.handlers.set(actionType, handler);
  }

  /**
   * Execute an action
   */
  execute(action) {
    if (!action || !action.type) {
      Logger.warn('ACTIONS', 'Invalid action:', action);
      return;
    }

    const handler = this.handlers.get(action.type);
    if (handler) {
      try {
        handler(action.target, action.params || {});
      } catch (e) {
        Logger.error('ACTIONS', `Error executing action ${action.type}:`, e);
      }
    } else {
      Logger.warn('ACTIONS', `Unknown action type: ${action.type}`);
    }
  }

  // === STATE HANDLERS ===

  handleSetFlag(target, params) {
    GameState.setFlag(target, params.value !== undefined ? params.value : true);
  }

  handleIncrementCounter(target, params) {
    GameState.incrementCounter(target, params.amount || 1);
  }

  handleDecrementCounter(target, params) {
    GameState.decrementCounter(target, params.amount || 1);
  }

  handleSetCounter(target, params) {
    GameState.setCounter(target, params.value || 0);
  }

  // === OBJECT HANDLERS ===

  handleOpenDoor(target) {
    const door = GameState.interactives.get(target);
    if (door && door.open) {
      door.open();
    }
  }

  handleCloseDoor(target) {
    const door = GameState.interactives.get(target);
    if (door && door.close) {
      door.close();
    }
  }

  handleToggleDoor(target) {
    const door = GameState.interactives.get(target);
    if (door && door.toggle) {
      door.toggle();
    }
  }

  handleEnableObject(target) {
    const obj = GameState.interactives.get(target);
    if (obj && obj.setEnabled) {
      obj.setEnabled(true);
    }
  }

  handleDisableObject(target) {
    const obj = GameState.interactives.get(target);
    if (obj && obj.setEnabled) {
      obj.setEnabled(false);
    }
  }

  // === SPAWN HANDLERS ===

  handleSpawnObject(target, params) {
    EventBus.emit(Events.OBJECT_SPAWN, {
      id: target,
      definition: params.definition,
      position: params.position
    });
  }

  handleDestroyObject(target) {
    const obj = GameState.interactives.get(target) || GameState.meshes.get(target);
    if (obj && obj.dispose) {
      obj.dispose();
    }
    EventBus.emit(Events.OBJECT_DESTROY, { id: target });
  }

  handleSpawnCharacter(target, params) {
    EventBus.emit(Events.CHARACTER_SPAWN, {
      id: target || `char_${Date.now()}`,
      preset: params.preset,
      position: params.position,
      rotation: params.rotation
    });
  }

  // === AUDIO HANDLERS ===

  handlePlaySound(target, params) {
    EventBus.emit(Events.SOUND_PLAY, {
      id: target || params.soundId,
      volume: params.volume,
      position: params.position
    });
  }

  handleStopSound(target) {
    EventBus.emit(Events.SOUND_STOP, { id: target });
  }

  // === UI HANDLERS ===

  handleShowMessage(target, params) {
    const text = target || params.text;
    const duration = params.duration || 3000;

    // Show message in UI
    const msgEl = document.getElementById('message');
    if (msgEl) {
      msgEl.textContent = text;
      msgEl.style.opacity = '1';

      setTimeout(() => {
        msgEl.style.opacity = '0';
      }, duration);
    }

    Logger.info('UI', `Message: ${text}`);
  }

  // === PLAYER HANDLERS ===

  handleTeleportPlayer(target, params) {
    const position = params.position || target;
    const rotation = params.rotation;

    if (GameState.camera) {
      if (Array.isArray(position)) {
        GameState.camera.position.x = position[0];
        GameState.camera.position.y = GameState.fixedEyeY || position[1];
        GameState.camera.position.z = position[2];
      }

      if (rotation !== undefined) {
        GameState.camera.rotation.y = rotation * Math.PI / 180;
      }
    }
  }

  handleGiveItem(target, params) {
    GameState.addItem(target || params.itemId);
  }

  handleTakeItem(target, params) {
    GameState.removeItem(target || params.itemId);
  }

  // === ROOM HANDLERS ===

  handleLoadRoom(target, params) {
    GameState.nextRoomFile = target || params.roomFile;
    if (params.spawnPosition) {
      GameState.playerSpawnInfo = {
        pos: params.spawnPosition,
        yaw: params.spawnRotation || 0
      };
    }
  }

  // === TRIGGER HANDLERS ===

  handleEnableTrigger(target) {
    const trigger = GameState.triggers.get(target);
    if (trigger) {
      trigger.enabled = true;
    }
  }

  handleDisableTrigger(target) {
    const trigger = GameState.triggers.get(target);
    if (trigger) {
      trigger.enabled = false;
    }
  }

  handleFireTrigger(target) {
    EventBus.emit('trigger:manual', { id: target });
  }

  // === META HANDLERS ===

  handleEmit(target, params) {
    EventBus.emit(target, params);
  }

  handleDelay(target, params) {
    const delay = params.delay || 1000;
    const actions = params.actions || [];

    setTimeout(() => {
      for (const action of actions) {
        this.execute(action);
      }
    }, delay);
  }

  handleSequence(target, params) {
    const actions = params.actions || [];
    const interval = params.interval || 500;

    actions.forEach((action, index) => {
      setTimeout(() => {
        this.execute(action);
      }, index * interval);
    });
  }
}

export default EventActions;
