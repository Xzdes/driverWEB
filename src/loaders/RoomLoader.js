/**
 * RoomLoader - Загрузка и построение комнат из JSON
 */

import { MeshBuilder, Vector3, PointLight, Color3, StandardMaterial } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { EventBus, Events } from '../core/EventBus.js';
import { Logger } from '../utils/Logger.js';
import { toVector3 } from '../utils/Math.js';
import { PrimitiveFactory } from '../geometry/PrimitiveFactory.js';
import { TextureGenerator } from '../textures/TextureGenerator.js';
import { MaterialPresets } from '../textures/MaterialPresets.js';
import { HumanoidBuilder } from '../characters/HumanoidBuilder.js';
import { CharacterAI, AIBehavior } from '../characters/CharacterAI.js';
import { Door } from '../objects/Door.js';
import { Button } from '../objects/Button.js';
import { Pickup } from '../objects/Pickup.js';
import { Portal } from '../objects/Portal.js';
import { CollisionSystem } from '../physics/CollisionSystem.js';
import { PhysicsBody } from '../physics/PhysicsBody.js';
import { SoundPresets } from '../audio/SoundPresets.js';

export class RoomLoader {
  constructor(engine) {
    this.engine = engine;
    this.scene = null;

    // Subsystems initialized per room
    this.primitiveFactory = null;
    this.textureGenerator = null;
    this.materialPresets = null;
    this.humanoidBuilder = null;
  }

  /**
   * Load room from JSON file
   */
  async load(roomFile) {
    Logger.info('LOADER', `Loading room: ${roomFile}`);

    const roomData = await this.engine.loadJSON(roomFile);
    this.scene = this.engine.scene;

    // Initialize subsystems for this scene
    this.primitiveFactory = new PrimitiveFactory(this.scene);
    this.textureGenerator = new TextureGenerator(this.scene);
    this.materialPresets = new MaterialPresets(this.scene);
    this.humanoidBuilder = new HumanoidBuilder(this.scene);

    // Store room data
    GameState.currentRoom = roomData;

    // Process room in order
    await this.loadProceduralTextures(roomData.proceduralTextures || []);
    await this.loadMaterials(roomData.materials || []);
    this.buildRoomGeometry(roomData);
    this.loadLights(roomData.lights || []);
    this.loadGeometry(roomData.geometry || roomData.objects || []);
    this.loadCharacters(roomData.characters || []);
    this.loadInteractives(roomData.interactives || []);
    this.loadPortals(roomData.portals || [], roomData);
    this.loadTriggers(roomData.triggers || []);
    this.loadSounds(roomData.sounds || []);

    // Setup collision
    const playerRadius = GameState.playerConfig?.radius || 0.36;
    CollisionSystem.setupFromRoom(roomData, playerRadius);

    // Calculate eye height
    const bounds = roomData.bounds || { center: roomData.center, size: roomData.size };
    const [cx, cy, cz] = bounds.center;
    const [sx, sy, sz] = bounds.size;
    const floorY = cy - sy / 2;
    const eyeHeight = (GameState.playerConfig?.height || 1.75) * 0.8;
    GameState.fixedEyeY = floorY + eyeHeight;

    Logger.info('LOADER', `Room loaded: ${roomData.id || roomFile}`);

    return roomData;
  }

  /**
   * Load procedural textures
   */
  async loadProceduralTextures(textures) {
    for (const texDef of textures) {
      this.textureGenerator.generate(texDef);
    }
  }

  /**
   * Load materials
   */
  async loadMaterials(materials) {
    for (const matDef of materials) {
      const mat = new StandardMaterial(matDef.id, this.scene);

      // Diffuse texture
      if (matDef.diffuseTexture) {
        const tex = GameState.getTexture(matDef.diffuseTexture);
        if (tex) {
          mat.diffuseTexture = tex;
        }
      }

      // Diffuse color
      if (matDef.diffuseColor) {
        mat.diffuseColor = new Color3(
          matDef.diffuseColor[0],
          matDef.diffuseColor[1],
          matDef.diffuseColor[2]
        );
      }

      // Emissive color
      if (matDef.emissiveColor) {
        mat.emissiveColor = new Color3(
          matDef.emissiveColor[0],
          matDef.emissiveColor[1],
          matDef.emissiveColor[2]
        );
      }

      // Specular color
      if (matDef.specularColor) {
        mat.specularColor = new Color3(
          matDef.specularColor[0],
          matDef.specularColor[1],
          matDef.specularColor[2]
        );
      } else {
        mat.specularColor = new Color3(0.1, 0.1, 0.1);
      }

      // Alpha
      if (matDef.alpha !== undefined) {
        mat.alpha = matDef.alpha;
      }

      GameState.materials.set(matDef.id, mat);
    }
  }

  /**
   * Build room walls, floor, ceiling
   */
  buildRoomGeometry(roomData) {
    const bounds = roomData.bounds || { center: roomData.center, size: roomData.size };
    const [cx, cy, cz] = bounds.center;
    const [sx, sy, sz] = bounds.size;
    const hw = sx / 2, hh = sy / 2, hd = sz / 2;

    // Get materials from surfaces or materialsPerFace
    const surfaces = roomData.surfaces || roomData.materialsPerFace || {};

    const getMat = (key) => {
      const matId = surfaces[key]?.material || surfaces[key];
      return matId ? GameState.getMaterial(matId) : null;
    };

    // Floor
    const floor = MeshBuilder.CreateBox('floor', { width: sx, height: 0.3, depth: sz }, this.scene);
    floor.position = new Vector3(cx, cy - hh - 0.15, cz);
    floor.material = getMat('floor');
    floor.checkCollisions = false;
    floor.isPickable = false;

    // Ceiling
    const ceiling = MeshBuilder.CreateBox('ceiling', { width: sx, height: 0.2, depth: sz }, this.scene);
    ceiling.position = new Vector3(cx, cy + hh, cz);
    ceiling.material = getMat('ceiling');
    ceiling.checkCollisions = false;
    ceiling.isPickable = false;

    // Walls
    const wallS = MeshBuilder.CreateBox('wallSouth', { width: sx, height: sy, depth: 0.2 }, this.scene);
    wallS.position = new Vector3(cx, cy, cz - hd);
    wallS.material = getMat('wallSouth');
    wallS.isPickable = false;

    const wallN = MeshBuilder.CreateBox('wallNorth', { width: sx, height: sy, depth: 0.2 }, this.scene);
    wallN.position = new Vector3(cx, cy, cz + hd);
    wallN.material = getMat('wallNorth');
    wallN.isPickable = false;

    const wallW = MeshBuilder.CreateBox('wallWest', { width: 0.2, height: sy, depth: sz }, this.scene);
    wallW.position = new Vector3(cx - hw, cy, cz);
    wallW.material = getMat('wallWest');
    wallW.isPickable = false;

    const wallE = MeshBuilder.CreateBox('wallEast', { width: 0.2, height: sy, depth: sz }, this.scene);
    wallE.position = new Vector3(cx + hw, cy, cz);
    wallE.material = getMat('wallEast');
    wallE.isPickable = false;
  }

  /**
   * Load lights
   */
  loadLights(lights) {
    for (const lightDef of lights) {
      if (lightDef.type === 'point') {
        const light = new PointLight(
          lightDef.id || `light_${Date.now()}`,
          toVector3(lightDef.position || lightDef.pos),
          this.scene
        );

        // Intensity: if > 10, assume old format and scale down
        let intensity = lightDef.intensity ?? 1.0;
        if (intensity > 10) {
          intensity = intensity / 500; // Convert old format
        }
        light.intensity = intensity;
        light.range = lightDef.range ?? 15;

        if (lightDef.color) {
          light.diffuse = new Color3(
            lightDef.color[0],
            lightDef.color[1],
            lightDef.color[2]
          );
        }
      }
    }
  }

  /**
   * Load geometry objects
   */
  loadGeometry(objects) {
    // Get floor Y for physics
    const roomData = GameState.currentRoom;
    const bounds = roomData.bounds || { center: roomData.center, size: roomData.size };
    const floorY = bounds.center[1] - bounds.size[1] / 2;

    for (const objDef of objects) {
      // Support both old and new format
      const def = {
        id: objDef.id,
        type: objDef.type || 'box',
        position: objDef.position || objDef.center,
        size: objDef.size,
        rotation: objDef.rotation,
        material: objDef.material,
        collision: objDef.collision ?? objDef.solid ?? false
      };

      const mesh = this.primitiveFactory.createFromDefinition(def);

      // Create physics body for movable objects
      if (objDef.physics || objDef.movable) {
        const size = objDef.size || [1, 1, 1];
        const body = new PhysicsBody(mesh, {
          type: objDef.type || 'box',
          mass: objDef.mass || 1,
          friction: objDef.friction || 0.85,
          bounciness: objDef.bounciness || 0.2,
          isStatic: false,
          useGravity: objDef.useGravity !== false,
          groundY: floorY,
          radius: objDef.type === 'cylinder' ? size[0] / 2 : size[0] / 2,
          halfExtents: new Vector3(size[0] / 2, size[1] / 2, size[2] / 2),
          canPush: objDef.canPush !== false,
          pushResistance: objDef.pushResistance || 0.3
        });
        GameState.physicsWorld.addBody(objDef.id, body);
        Logger.info('LOADER', `Created physics body for: ${objDef.id}`);
      }
    }
  }

  /**
   * Load characters
   */
  loadCharacters(characters) {
    for (const charDef of characters) {
      const character = this.humanoidBuilder.buildFromPreset(
        charDef.preset || 'mannequin_red',
        charDef.id,
        charDef.position,
        charDef.rotation || 0
      );

      // Add AI behavior (default: wander)
      if (character) {
        const aiOptions = {
          behavior: charDef.ai?.behavior || AIBehavior.WANDER,
          speed: charDef.ai?.speed || 1.2,
          wanderRadius: charDef.ai?.wanderRadius || 5,
          patrolPoints: charDef.ai?.patrolPoints || [],
          minWait: charDef.ai?.minWait || 1,
          maxWait: charDef.ai?.maxWait || 3
        };

        // If no AI specified, default to wander
        if (!charDef.ai || charDef.ai.enabled !== false) {
          character.ai = new CharacterAI(character, aiOptions);
        }
      }
    }
  }

  /**
   * Load interactive objects
   */
  loadInteractives(interactives) {
    for (const intDef of interactives) {
      switch (intDef.type) {
        case 'door':
          new Door(this.scene, intDef);
          break;
        case 'button':
          new Button(this.scene, intDef);
          break;
        case 'pickup':
          new Pickup(this.scene, intDef);
          break;
      }
    }
  }

  /**
   * Load portals
   */
  loadPortals(portals, roomData) {
    const bounds = roomData.bounds || { center: roomData.center, size: roomData.size };

    for (const portalDef of portals) {
      const portal = new Portal(this.scene, portalDef, bounds);
      GameState.portals.push(portal);
    }
  }

  /**
   * Load triggers
   */
  loadTriggers(triggers) {
    for (const triggerDef of triggers) {
      this.engine.triggerSystem.register(triggerDef);
    }
  }

  /**
   * Load sounds
   */
  loadSounds(sounds) {
    if (this.engine.audioEngine) {
      const presets = new SoundPresets(this.engine.audioEngine);
      presets.registerAll();

      for (const soundDef of sounds) {
        if (soundDef.autoplay) {
          this.engine.audioEngine.play(soundDef.preset || soundDef.id, {
            loop: soundDef.loop,
            volume: soundDef.volume,
            category: 'ambient'
          });
        }
      }
    }
  }
}

export default RoomLoader;
