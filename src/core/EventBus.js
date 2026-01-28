/**
 * EventBus - Глобальная шина событий для движка
 */

class EventBusClass {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to callbacks
   */
  emit(event, ...args) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(...args);
        } catch (e) {
          console.error(`Error in event handler for "${event}":`, e);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name (optional, if not provided clears all)
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Singleton instance
export const EventBus = new EventBusClass();

// Event names constants
export const Events = {
  // Engine lifecycle
  ENGINE_READY: 'engine:ready',
  ENGINE_UPDATE: 'engine:update',
  ENGINE_DISPOSE: 'engine:dispose',

  // Room events
  ROOM_LOAD_START: 'room:loadStart',
  ROOM_LOAD_COMPLETE: 'room:loadComplete',
  ROOM_UNLOAD: 'room:unload',

  // Player events
  PLAYER_MOVE: 'player:move',
  PLAYER_INTERACT: 'player:interact',
  PLAYER_DAMAGE: 'player:damage',
  PLAYER_DEATH: 'player:death',

  // Trigger events
  TRIGGER_ENTER: 'trigger:enter',
  TRIGGER_EXIT: 'trigger:exit',
  TRIGGER_ACTIVATE: 'trigger:activate',

  // Object events
  OBJECT_SPAWN: 'object:spawn',
  OBJECT_DESTROY: 'object:destroy',
  OBJECT_INTERACT: 'object:interact',

  // Character events
  CHARACTER_SPAWN: 'character:spawn',
  CHARACTER_DEATH: 'character:death',
  CHARACTER_ALERT: 'character:alert',

  // Audio events
  SOUND_PLAY: 'sound:play',
  SOUND_STOP: 'sound:stop',

  // Portal events
  PORTAL_ENTER: 'portal:enter',

  // State events
  STATE_CHANGE: 'state:change',
  FLAG_SET: 'state:flagSet',
  COUNTER_CHANGE: 'state:counterChange'
};

export default EventBus;
