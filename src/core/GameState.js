/**
 * GameState - Централизованное состояние игры
 */

import { EventBus, Events } from './EventBus.js';
import { PhysicsWorld } from '../physics/PhysicsBody.js';

class GameStateClass {
  constructor() {
    this.reset();
  }

  reset() {
    // Engine references
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.canvas = null;

    // Player config
    this.playerConfig = null;

    // Current room
    this.currentRoom = null;
    this.currentRoomFile = null;

    // Collections
    this.textures = new Map();
    this.materials = new Map();
    this.meshes = new Map();
    this.characters = new Map();
    this.interactives = new Map();
    this.triggers = new Map();
    this.portals = [];
    this.sounds = new Map();

    // Input state
    this.keys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0 };

    // Game flags and counters
    this.flags = {};
    this.counters = {};
    this.inventory = [];

    // Physics
    this.fixedEyeY = null;
    this.collisionBounds = {
      minX: 0, maxX: 0, minZ: 0, maxZ: 0,
      openings: { north: [], south: [], west: [], east: [] },
      solids: []
    };
    this.physicsWorld = new PhysicsWorld();

    // Loading state
    this.isLoading = false;
    this.nextRoomFile = null;
    this.playerSpawnInfo = null;
    this.portalCooldownUntil = 0;

    // Time
    this.deltaTime = 0;
    this.totalTime = 0;
  }

  // Flag management
  setFlag(name, value) {
    const oldValue = this.flags[name];
    this.flags[name] = value;
    EventBus.emit(Events.FLAG_SET, { name, value, oldValue });
    EventBus.emit(Events.STATE_CHANGE, { type: 'flag', name, value });
  }

  getFlag(name) {
    return this.flags[name] ?? false;
  }

  // Counter management
  setCounter(name, value) {
    const oldValue = this.counters[name];
    this.counters[name] = value;
    EventBus.emit(Events.COUNTER_CHANGE, { name, value, oldValue });
    EventBus.emit(Events.STATE_CHANGE, { type: 'counter', name, value });
  }

  getCounter(name) {
    return this.counters[name] ?? 0;
  }

  incrementCounter(name, amount = 1) {
    this.setCounter(name, this.getCounter(name) + amount);
  }

  decrementCounter(name, amount = 1) {
    this.setCounter(name, this.getCounter(name) - amount);
  }

  // Inventory management
  addItem(itemId) {
    if (!this.inventory.includes(itemId)) {
      this.inventory.push(itemId);
      EventBus.emit(Events.STATE_CHANGE, { type: 'inventory', action: 'add', itemId });
      return true;
    }
    return false;
  }

  removeItem(itemId) {
    const index = this.inventory.indexOf(itemId);
    if (index !== -1) {
      this.inventory.splice(index, 1);
      EventBus.emit(Events.STATE_CHANGE, { type: 'inventory', action: 'remove', itemId });
      return true;
    }
    return false;
  }

  hasItem(itemId) {
    return this.inventory.includes(itemId);
  }

  // Object getters
  getMesh(id) {
    return this.meshes.get(id);
  }

  getCharacter(id) {
    return this.characters.get(id);
  }

  getInteractive(id) {
    return this.interactives.get(id);
  }

  getTrigger(id) {
    return this.triggers.get(id);
  }

  getTexture(id) {
    return this.textures.get(id);
  }

  getMaterial(id) {
    return this.materials.get(id);
  }

  // Clear room-specific data
  clearRoomData() {
    this.textures.clear();
    this.materials.clear();
    this.meshes.clear();
    this.characters.clear();
    this.interactives.clear();
    this.triggers.clear();
    this.portals = [];
    this.sounds.clear();
    this.collisionBounds = {
      minX: 0, maxX: 0, minZ: 0, maxZ: 0,
      openings: { north: [], south: [], west: [], east: [] },
      solids: []
    };
    this.physicsWorld.clear();
  }
}

// Singleton instance
export const GameState = new GameStateClass();
export default GameState;
