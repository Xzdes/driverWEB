/**
 * Engine - Главный движок игры
 */

import {
  Engine as BabylonEngine,
  Scene,
  UniversalCamera,
  Vector3,
  Color4,
  Color3,
  HemisphericLight,
  Tools
} from "babylonjs";

import { Logger } from '../utils/Logger.js';
import { EventBus, Events } from './EventBus.js';
import { GameState } from './GameState.js';
import { RoomLoader } from '../loaders/RoomLoader.js';
import { InputManager } from '../player/InputManager.js';
import { PlayerController } from '../player/PlayerController.js';
import { CollisionSystem } from '../physics/CollisionSystem.js';
import { TriggerSystem } from '../events/TriggerSystem.js';
import { AudioEngine } from '../audio/AudioEngine.js';

export class Engine {
  constructor(canvasId = 'renderCanvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }

    this.babylonEngine = null;
    this.scene = null;

    // Subsystems
    this.roomLoader = null;
    this.inputManager = null;
    this.playerController = null;
    this.collisionSystem = null;
    this.triggerSystem = null;
    this.audioEngine = null;

    // Bind methods
    this.update = this.update.bind(this);
    this.resize = this.resize.bind(this);
  }

  /**
   * Initialize the engine
   */
  async init() {
    Logger.info('ENGINE', 'Initializing...');

    // Create Babylon engine
    this.babylonEngine = new BabylonEngine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true
    });

    // Store references in GameState
    GameState.engine = this.babylonEngine;
    GameState.canvas = this.canvas;

    // Initialize subsystems
    this.inputManager = new InputManager(this.canvas);
    this.collisionSystem = new CollisionSystem();
    this.triggerSystem = new TriggerSystem();
    this.audioEngine = new AudioEngine();
    this.roomLoader = new RoomLoader(this);

    // Setup resize handler
    window.addEventListener('resize', this.resize);

    Logger.info('ENGINE', 'Initialization complete');
    EventBus.emit(Events.ENGINE_READY);
  }

  /**
   * Load and start the game from game.json
   */
  async start(gameManifestPath = '/game.json') {
    Logger.info('ENGINE', `Loading game manifest: ${gameManifestPath}`);

    try {
      // Load game manifest
      const manifest = await this.loadJSON(gameManifestPath);
      Logger.info('ENGINE', `Game: ${manifest.gameTitle} v${manifest.version}`);

      // Load player config
      GameState.playerConfig = await this.loadJSON(manifest.playerConfig);
      Logger.info('ENGINE', 'Player config loaded');

      // Initialize global state if provided
      if (manifest.globalState) {
        if (manifest.globalState.flags) {
          Object.assign(GameState.flags, manifest.globalState.flags);
        }
        if (manifest.globalState.counters) {
          Object.assign(GameState.counters, manifest.globalState.counters);
        }
      }

      // Load starting room
      await this.loadRoom(manifest.startRoom);

      // Start render loop
      this.babylonEngine.runRenderLoop(() => {
        this.update();
      });

      Logger.info('ENGINE', 'Game started');
    } catch (err) {
      Logger.error('ENGINE', 'Failed to start game:', err);
      throw err;
    }
  }

  /**
   * Load a room with fade transition
   */
  async loadRoom(roomFile, spawnInfo = null) {
    if (GameState.isLoading) {
      Logger.warn('ENGINE', 'Already loading a room');
      return;
    }

    GameState.isLoading = true;
    GameState.nextRoomFile = null;

    if (spawnInfo) {
      GameState.playerSpawnInfo = spawnInfo;
    }

    EventBus.emit(Events.ROOM_LOAD_START, { roomFile });

    // Fade out
    const fadeOverlay = document.getElementById('fade-overlay');
    if (fadeOverlay && this.scene) {
      fadeOverlay.classList.add('active');
      await this.delay(300);
    }

    try {
      // Dispose current scene
      if (this.scene) {
        EventBus.emit(Events.ROOM_UNLOAD, { roomFile: GameState.currentRoomFile });
        this.scene.dispose();
        GameState.clearRoomData();
      }

      // Create new scene
      this.scene = new Scene(this.babylonEngine);
      this.scene.clearColor = new Color4(0.05, 0.06, 0.08, 1);
      GameState.scene = this.scene;

      // Load room via RoomLoader
      await this.roomLoader.load(roomFile);

      // Setup player after room is loaded
      this.setupPlayer();

      // Reset portal cooldown
      GameState.portalCooldownUntil = performance.now() + 500;

      GameState.currentRoomFile = roomFile;
      GameState.isLoading = false;

      EventBus.emit(Events.ROOM_LOAD_COMPLETE, { roomFile, room: GameState.currentRoom });
      Logger.info('ENGINE', `Room loaded: ${roomFile}`);

      // Fade in
      if (fadeOverlay) {
        await this.delay(100);
        fadeOverlay.classList.remove('active');
      }

    } catch (err) {
      GameState.isLoading = false;
      if (fadeOverlay) fadeOverlay.classList.remove('active');
      Logger.error('ENGINE', `Failed to load room: ${roomFile}`, err);
      throw err;
    }
  }

  /**
   * Helper delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Setup player camera and controller
   */
  setupPlayer() {
    const cfg = GameState.playerConfig;
    const room = GameState.currentRoom;

    // Create camera
    const cam = new UniversalCamera('playerCam', new Vector3(0, 1.6, 0), this.scene);
    cam.fov = Tools.ToRadians(cfg.camera?.fov || cfg.fov || 75);
    cam.minZ = cfg.camera?.nearClip || 0.05;
    cam.maxZ = cfg.camera?.farClip || 1000;
    cam.attachControl(this.canvas, true);

    // Disable built-in movement
    cam.keysUp = [];
    cam.keysDown = [];
    cam.keysLeft = [];
    cam.keysRight = [];
    cam.checkCollisions = false;
    cam.applyGravity = false;
    cam.inertia = 0;
    cam.angularSensibility = cfg.controls?.mouseSensitivity || 900;

    GameState.camera = cam;

    // Create player controller
    this.playerController = new PlayerController(cam, cfg);

    // Set spawn position
    if (GameState.playerSpawnInfo) {
      const sp = GameState.playerSpawnInfo;
      cam.position = new Vector3(sp.pos[0], GameState.fixedEyeY, sp.pos[2]);
      cam.rotation = new Vector3(0, Tools.ToRadians(sp.yaw || 0), 0);
      GameState.playerSpawnInfo = null;
    } else if (room.playerSpawn?.enabled) {
      const sp = room.playerSpawn;
      const pos = sp.position || sp.pos;
      cam.position = new Vector3(pos[0], GameState.fixedEyeY, pos[2]);
      cam.rotation = new Vector3(0, Tools.ToRadians(sp.rotation || sp.yaw || 0), 0);
    } else {
      cam.position.y = GameState.fixedEyeY;
    }

    // Add ambient light
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = room.environment?.ambientLight || 0.3;
    this.scene.ambientColor = new Color3(1, 1, 1);
  }

  /**
   * Main update loop
   */
  update() {
    if (GameState.isLoading || !this.scene || !this.scene.isReady()) {
      return;
    }

    // Calculate delta time
    const dt = this.babylonEngine.getDeltaTime() / 1000;
    GameState.deltaTime = dt;
    GameState.totalTime += dt;

    // Check for pending room load
    if (GameState.nextRoomFile) {
      const nextRoom = GameState.nextRoomFile;
      const spawnInfo = GameState.playerSpawnInfo;
      GameState.nextRoomFile = null;
      this.loadRoom(nextRoom, spawnInfo);
      return;
    }

    // Update physics
    if (GameState.physicsWorld) {
      GameState.physicsWorld.update(dt);
    }

    // Update character AI
    for (const [id, character] of GameState.characters) {
      if (character.ai) {
        character.ai.update(dt);
      }
    }

    // Update subsystems
    if (this.playerController) {
      this.playerController.update(dt);
    }

    if (this.triggerSystem) {
      this.triggerSystem.update(GameState.camera.position, dt);
    }

    // Emit update event
    EventBus.emit(Events.ENGINE_UPDATE, { dt, totalTime: GameState.totalTime });

    // Render scene
    this.scene.render();
  }

  /**
   * Handle window resize
   */
  resize() {
    this.babylonEngine.resize();
  }

  /**
   * Load JSON file
   */
  async loadJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.json();
  }

  /**
   * Dispose engine and cleanup
   */
  dispose() {
    Logger.info('ENGINE', 'Disposing...');
    EventBus.emit(Events.ENGINE_DISPOSE);

    window.removeEventListener('resize', this.resize);

    if (this.inputManager) {
      this.inputManager.dispose();
    }

    if (this.audioEngine) {
      this.audioEngine.dispose();
    }

    if (this.scene) {
      this.scene.dispose();
    }

    if (this.babylonEngine) {
      this.babylonEngine.dispose();
    }

    GameState.reset();
    EventBus.clear();

    Logger.info('ENGINE', 'Disposed');
  }
}

export default Engine;
