/**
 * StateManager - Управление игровым состоянием
 */

import { GameState } from '../core/GameState.js';
import { EventBus, Events } from '../core/EventBus.js';

export class StateManager {
  constructor() {
    this.persistentFlags = new Set();
    this.persistentCounters = new Set();
  }

  /**
   * Mark a flag as persistent (survives room transitions)
   */
  markPersistent(name, type = 'flag') {
    if (type === 'flag') {
      this.persistentFlags.add(name);
    } else if (type === 'counter') {
      this.persistentCounters.add(name);
    }
  }

  /**
   * Save current state to localStorage
   */
  save(slotName = 'autosave') {
    const saveData = {
      timestamp: Date.now(),
      currentRoom: GameState.currentRoomFile,
      playerPosition: GameState.camera ? {
        x: GameState.camera.position.x,
        y: GameState.camera.position.y,
        z: GameState.camera.position.z
      } : null,
      playerRotation: GameState.camera ? GameState.camera.rotation.y : 0,
      flags: { ...GameState.flags },
      counters: { ...GameState.counters },
      inventory: [...GameState.inventory]
    };

    try {
      localStorage.setItem(`game_save_${slotName}`, JSON.stringify(saveData));
      EventBus.emit(Events.STATE_CHANGE, { type: 'save', slot: slotName });
      return true;
    } catch (e) {
      console.error('Failed to save game:', e);
      return false;
    }
  }

  /**
   * Load state from localStorage
   */
  load(slotName = 'autosave') {
    try {
      const data = localStorage.getItem(`game_save_${slotName}`);
      if (!data) return null;

      const saveData = JSON.parse(data);

      // Restore state
      GameState.flags = saveData.flags || {};
      GameState.counters = saveData.counters || {};
      GameState.inventory = saveData.inventory || [];

      // Set up room transition with player position
      if (saveData.currentRoom) {
        GameState.nextRoomFile = saveData.currentRoom;
        if (saveData.playerPosition) {
          GameState.playerSpawnInfo = {
            pos: [saveData.playerPosition.x, saveData.playerPosition.y, saveData.playerPosition.z],
            yaw: saveData.playerRotation * 180 / Math.PI
          };
        }
      }

      EventBus.emit(Events.STATE_CHANGE, { type: 'load', slot: slotName });
      return saveData;
    } catch (e) {
      console.error('Failed to load game:', e);
      return null;
    }
  }

  /**
   * Delete a save
   */
  deleteSave(slotName) {
    try {
      localStorage.removeItem(`game_save_${slotName}`);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * List all saves
   */
  listSaves() {
    const saves = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('game_save_')) {
        const slotName = key.replace('game_save_', '');
        try {
          const data = JSON.parse(localStorage.getItem(key));
          saves.push({
            slot: slotName,
            timestamp: data.timestamp,
            room: data.currentRoom
          });
        } catch (e) {
          // Skip invalid saves
        }
      }
    }
    return saves.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear room-specific state (but keep persistent)
   */
  clearRoomState() {
    // Clear non-persistent flags
    for (const flag of Object.keys(GameState.flags)) {
      if (!this.persistentFlags.has(flag)) {
        delete GameState.flags[flag];
      }
    }

    // Clear non-persistent counters
    for (const counter of Object.keys(GameState.counters)) {
      if (!this.persistentCounters.has(counter)) {
        delete GameState.counters[counter];
      }
    }
  }

  /**
   * Reset all state
   */
  resetAll() {
    GameState.flags = {};
    GameState.counters = {};
    GameState.inventory = [];
    EventBus.emit(Events.STATE_CHANGE, { type: 'reset' });
  }

  /**
   * Export state to JSON string
   */
  export() {
    return JSON.stringify({
      flags: GameState.flags,
      counters: GameState.counters,
      inventory: GameState.inventory
    });
  }

  /**
   * Import state from JSON string
   */
  import(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.flags) GameState.flags = data.flags;
      if (data.counters) GameState.counters = data.counters;
      if (data.inventory) GameState.inventory = data.inventory;
      EventBus.emit(Events.STATE_CHANGE, { type: 'import' });
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default StateManager;
