/**
 * HumanoidBuilder - Сборка humanoid персонажей из примитивов (стиль SUPERHOT)
 */

import {
  MeshBuilder,
  TransformNode,
  Vector3,
  StandardMaterial,
  Color3
} from "babylonjs";

import { GameState } from '../core/GameState.js';
import { MaterialPresets } from '../textures/MaterialPresets.js';
import { toVector3 } from '../utils/Math.js';

// Default body proportions (normalized to height 1.0)
const DEFAULT_PROPORTIONS = {
  headRadius: 0.07,
  neckHeight: 0.03,
  neckRadius: 0.025,
  torsoWidth: 0.18,
  torsoHeight: 0.25,
  torsoDepth: 0.1,
  pelvisWidth: 0.15,
  pelvisHeight: 0.08,
  pelvisDepth: 0.08,
  shoulderWidth: 0.22,
  upperArmLength: 0.15,
  upperArmRadius: 0.025,
  lowerArmLength: 0.13,
  lowerArmRadius: 0.02,
  handRadius: 0.025,
  upperLegLength: 0.22,
  upperLegRadius: 0.04,
  lowerLegLength: 0.22,
  lowerLegRadius: 0.03,
  footLength: 0.1,
  footHeight: 0.03,
  footWidth: 0.05
};

export class HumanoidBuilder {
  constructor(scene) {
    this.scene = scene;
    this.materialPresets = new MaterialPresets(scene);
  }

  /**
   * Build humanoid from preset
   */
  buildFromPreset(preset, id, position, rotation = 0) {
    const presetConfig = this.getPresetConfig(preset);
    return this.build(id, position, rotation, presetConfig);
  }

  /**
   * Build humanoid from custom config
   */
  build(id, position, rotation, config = {}) {
    const {
      height = 1.8,
      proportions = {},
      materials = {},
      style = 'mannequin' // mannequin, detailed
    } = config;

    // Merge proportions with defaults
    const props = { ...DEFAULT_PROPORTIONS, ...proportions };
    const scale = height;

    // Create root node
    const root = new TransformNode(id, this.scene);
    root.position = toVector3(position);
    root.rotation = new Vector3(0, rotation * Math.PI / 180, 0);

    // Get or create materials
    const mats = this.resolveMaterials(materials);

    // Body parts container
    const parts = {};

    // Build skeleton structure from bottom up
    const floorY = 0;

    // === LEGS ===
    const legY = floorY + props.footHeight * scale;

    // Left leg
    parts.leftFoot = this.createBox(
      `${id}_leftFoot`,
      [props.footWidth * scale, props.footHeight * scale, props.footLength * scale],
      [-props.pelvisWidth * scale * 0.3, floorY + props.footHeight * scale * 0.5, props.footLength * scale * 0.2],
      mats.feet || mats.legs || mats.body,
      root
    );

    parts.leftLowerLeg = this.createCylinder(
      `${id}_leftLowerLeg`,
      props.lowerLegLength * scale,
      props.lowerLegRadius * scale,
      [-props.pelvisWidth * scale * 0.3, legY + props.lowerLegLength * scale * 0.5, 0],
      mats.legs || mats.body,
      root
    );

    parts.leftUpperLeg = this.createCylinder(
      `${id}_leftUpperLeg`,
      props.upperLegLength * scale,
      props.upperLegRadius * scale,
      [-props.pelvisWidth * scale * 0.3, legY + props.lowerLegLength * scale + props.upperLegLength * scale * 0.5, 0],
      mats.legs || mats.body,
      root
    );

    // Right leg
    parts.rightFoot = this.createBox(
      `${id}_rightFoot`,
      [props.footWidth * scale, props.footHeight * scale, props.footLength * scale],
      [props.pelvisWidth * scale * 0.3, floorY + props.footHeight * scale * 0.5, props.footLength * scale * 0.2],
      mats.feet || mats.legs || mats.body,
      root
    );

    parts.rightLowerLeg = this.createCylinder(
      `${id}_rightLowerLeg`,
      props.lowerLegLength * scale,
      props.lowerLegRadius * scale,
      [props.pelvisWidth * scale * 0.3, legY + props.lowerLegLength * scale * 0.5, 0],
      mats.legs || mats.body,
      root
    );

    parts.rightUpperLeg = this.createCylinder(
      `${id}_rightUpperLeg`,
      props.upperLegLength * scale,
      props.upperLegRadius * scale,
      [props.pelvisWidth * scale * 0.3, legY + props.lowerLegLength * scale + props.upperLegLength * scale * 0.5, 0],
      mats.legs || mats.body,
      root
    );

    // === PELVIS ===
    const pelvisY = legY + props.lowerLegLength * scale + props.upperLegLength * scale;
    parts.pelvis = this.createBox(
      `${id}_pelvis`,
      [props.pelvisWidth * scale, props.pelvisHeight * scale, props.pelvisDepth * scale],
      [0, pelvisY + props.pelvisHeight * scale * 0.5, 0],
      mats.pelvis || mats.body,
      root
    );

    // === TORSO ===
    const torsoY = pelvisY + props.pelvisHeight * scale;
    parts.torso = this.createBox(
      `${id}_torso`,
      [props.torsoWidth * scale, props.torsoHeight * scale, props.torsoDepth * scale],
      [0, torsoY + props.torsoHeight * scale * 0.5, 0],
      mats.torso || mats.body,
      root
    );

    // === SHOULDERS & ARMS ===
    const shoulderY = torsoY + props.torsoHeight * scale;

    // Left arm
    parts.leftUpperArm = this.createCylinder(
      `${id}_leftUpperArm`,
      props.upperArmLength * scale,
      props.upperArmRadius * scale,
      [-(props.shoulderWidth * scale * 0.5 + props.upperArmRadius * scale), shoulderY - props.upperArmLength * scale * 0.5, 0],
      mats.arms || mats.body,
      root
    );

    parts.leftLowerArm = this.createCylinder(
      `${id}_leftLowerArm`,
      props.lowerArmLength * scale,
      props.lowerArmRadius * scale,
      [-(props.shoulderWidth * scale * 0.5 + props.upperArmRadius * scale), shoulderY - props.upperArmLength * scale - props.lowerArmLength * scale * 0.5, 0],
      mats.arms || mats.body,
      root
    );

    parts.leftHand = this.createSphere(
      `${id}_leftHand`,
      props.handRadius * scale,
      [-(props.shoulderWidth * scale * 0.5 + props.upperArmRadius * scale), shoulderY - props.upperArmLength * scale - props.lowerArmLength * scale - props.handRadius * scale, 0],
      mats.hands || mats.skin || mats.body,
      root
    );

    // Right arm
    parts.rightUpperArm = this.createCylinder(
      `${id}_rightUpperArm`,
      props.upperArmLength * scale,
      props.upperArmRadius * scale,
      [props.shoulderWidth * scale * 0.5 + props.upperArmRadius * scale, shoulderY - props.upperArmLength * scale * 0.5, 0],
      mats.arms || mats.body,
      root
    );

    parts.rightLowerArm = this.createCylinder(
      `${id}_rightLowerArm`,
      props.lowerArmLength * scale,
      props.lowerArmRadius * scale,
      [props.shoulderWidth * scale * 0.5 + props.upperArmRadius * scale, shoulderY - props.upperArmLength * scale - props.lowerArmLength * scale * 0.5, 0],
      mats.arms || mats.body,
      root
    );

    parts.rightHand = this.createSphere(
      `${id}_rightHand`,
      props.handRadius * scale,
      [props.shoulderWidth * scale * 0.5 + props.upperArmRadius * scale, shoulderY - props.upperArmLength * scale - props.lowerArmLength * scale - props.handRadius * scale, 0],
      mats.hands || mats.skin || mats.body,
      root
    );

    // === NECK & HEAD ===
    const neckY = shoulderY;
    parts.neck = this.createCylinder(
      `${id}_neck`,
      props.neckHeight * scale,
      props.neckRadius * scale,
      [0, neckY + props.neckHeight * scale * 0.5, 0],
      mats.neck || mats.skin || mats.body,
      root
    );

    const headY = neckY + props.neckHeight * scale;
    parts.head = this.createSphere(
      `${id}_head`,
      props.headRadius * scale,
      [0, headY + props.headRadius * scale, 0],
      mats.head || mats.skin || mats.body,
      root
    );

    // Create humanoid object
    const humanoid = {
      id,
      root,
      parts,
      height,
      config,
      position: toVector3(position),
      rotation
    };

    // Store in GameState
    GameState.characters.set(id, humanoid);

    return humanoid;
  }

  /**
   * Create a box mesh
   */
  createBox(id, size, pos, material, parent) {
    const mesh = MeshBuilder.CreateBox(id, {
      width: size[0],
      height: size[1],
      depth: size[2]
    }, this.scene);

    mesh.position = new Vector3(pos[0], pos[1], pos[2]);
    mesh.parent = parent;
    mesh.material = material;
    mesh.isPickable = true;

    return mesh;
  }

  /**
   * Create a cylinder mesh
   */
  createCylinder(id, height, radius, pos, material, parent) {
    const mesh = MeshBuilder.CreateCylinder(id, {
      height,
      diameter: radius * 2,
      tessellation: 12
    }, this.scene);

    mesh.position = new Vector3(pos[0], pos[1], pos[2]);
    mesh.parent = parent;
    mesh.material = material;
    mesh.isPickable = true;

    return mesh;
  }

  /**
   * Create a sphere mesh
   */
  createSphere(id, radius, pos, material, parent) {
    const mesh = MeshBuilder.CreateSphere(id, {
      diameter: radius * 2,
      segments: 12
    }, this.scene);

    mesh.position = new Vector3(pos[0], pos[1], pos[2]);
    mesh.parent = parent;
    mesh.material = material;
    mesh.isPickable = true;

    return mesh;
  }

  /**
   * Resolve material references to actual materials
   */
  resolveMaterials(materialDefs) {
    const mats = {};

    for (const [key, value] of Object.entries(materialDefs)) {
      if (typeof value === 'string') {
        // Check if it's a preset name
        if (value.startsWith('preset:')) {
          const presetName = value.slice(7);
          mats[key] = this.materialPresets.createPreset(presetName, `mat_${key}_${Date.now()}`);
        } else {
          // Try to get from GameState
          mats[key] = GameState.getMaterial(value) || this.createSimpleMaterial(value);
        }
      } else if (Array.isArray(value)) {
        // Color array [r, g, b]
        mats[key] = this.createColorMaterial(`mat_${key}_${Date.now()}`, value);
      } else if (value && typeof value === 'object') {
        // Material definition object
        mats[key] = this.createMaterialFromDef(`mat_${key}_${Date.now()}`, value);
      }
    }

    return mats;
  }

  /**
   * Create simple color material
   */
  createColorMaterial(id, color) {
    const mat = new StandardMaterial(id, this.scene);
    mat.diffuseColor = new Color3(color[0], color[1], color[2]);
    mat.specularColor = new Color3(0.1, 0.1, 0.1);
    return mat;
  }

  /**
   * Create simple material from hex color
   */
  createSimpleMaterial(colorOrId) {
    if (colorOrId.startsWith('#')) {
      const mat = new StandardMaterial(`mat_${Date.now()}`, this.scene);
      mat.diffuseColor = Color3.FromHexString(colorOrId);
      mat.specularColor = new Color3(0.1, 0.1, 0.1);
      return mat;
    }
    return null;
  }

  /**
   * Create material from definition
   */
  createMaterialFromDef(id, def) {
    const mat = new StandardMaterial(id, this.scene);

    if (def.color) {
      mat.diffuseColor = Array.isArray(def.color)
        ? new Color3(def.color[0], def.color[1], def.color[2])
        : Color3.FromHexString(def.color);
    }

    if (def.emissive) {
      mat.emissiveColor = Array.isArray(def.emissive)
        ? new Color3(def.emissive[0], def.emissive[1], def.emissive[2])
        : Color3.FromHexString(def.emissive);
    }

    if (def.alpha !== undefined) {
      mat.alpha = def.alpha;
    }

    mat.specularColor = new Color3(0.1, 0.1, 0.1);

    return mat;
  }

  /**
   * Get preset configuration
   */
  getPresetConfig(preset) {
    const configs = {
      // SUPERHOT style red mannequin
      mannequin_red: {
        height: 1.8,
        materials: {
          body: [0.8, 0.1, 0.1] // Red
        }
      },

      // Soldier
      soldier: {
        height: 1.8,
        materials: {
          head: 'preset:skin_tan',
          neck: 'preset:skin_tan',
          torso: 'preset:camo_green',
          arms: 'preset:camo_green',
          hands: 'preset:skin_tan',
          pelvis: 'preset:fabric_black',
          legs: 'preset:fabric_black',
          feet: 'preset:fabric_black'
        }
      },

      // Robot
      robot: {
        height: 2.0,
        materials: {
          head: 'preset:metal_chrome',
          neck: 'preset:metal_dark',
          torso: 'preset:metal_dark',
          arms: 'preset:metal_chrome',
          hands: 'preset:metal_chrome',
          pelvis: 'preset:metal_dark',
          legs: 'preset:metal_dark',
          feet: 'preset:metal_dark'
        }
      },

      // Zombie
      zombie: {
        height: 1.75,
        materials: {
          body: 'preset:skin_zombie'
        }
      },

      // Alien
      alien: {
        height: 1.9,
        proportions: {
          headRadius: 0.1, // Bigger head
          torsoHeight: 0.2 // Slimmer
        },
        materials: {
          body: 'preset:skin_alien'
        }
      },

      // Civilian
      civilian: {
        height: 1.75,
        materials: {
          head: 'preset:skin_light',
          neck: 'preset:skin_light',
          hands: 'preset:skin_light',
          torso: 'preset:fabric_blue',
          arms: 'preset:fabric_blue',
          pelvis: 'preset:fabric_black',
          legs: 'preset:fabric_black',
          feet: 'preset:fabric_black'
        }
      },

      // Security guard
      guard: {
        height: 1.85,
        materials: {
          head: 'preset:skin_tan',
          neck: 'preset:skin_tan',
          hands: 'preset:skin_tan',
          torso: 'preset:fabric_black',
          arms: 'preset:fabric_black',
          pelvis: 'preset:fabric_black',
          legs: 'preset:fabric_black',
          feet: 'preset:fabric_black'
        }
      },

      // Target dummy
      target: {
        height: 1.8,
        materials: {
          body: [0.9, 0.9, 0.9]
        }
      }
    };

    return configs[preset] || configs.mannequin_red;
  }

  /**
   * Destroy a humanoid
   */
  destroy(id) {
    const humanoid = GameState.characters.get(id);
    if (humanoid) {
      humanoid.root.dispose();
      GameState.characters.delete(id);
    }
  }
}

export default HumanoidBuilder;
