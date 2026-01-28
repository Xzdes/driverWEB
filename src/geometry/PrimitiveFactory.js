/**
 * PrimitiveFactory - Создание геометрических примитивов
 */

import {
  MeshBuilder,
  Vector3,
  StandardMaterial,
  Color3
} from "babylonjs";

import { GameState } from '../core/GameState.js';
import { toVector3 } from '../utils/Math.js';

export class PrimitiveFactory {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * Create a box mesh
   */
  createBox(id, options = {}) {
    const {
      width = 1,
      height = 1,
      depth = 1,
      size, // alternative: [w, h, d]
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      material = null,
      collision = true
    } = options;

    const w = size ? size[0] : width;
    const h = size ? size[1] : height;
    const d = size ? size[2] : depth;

    const mesh = MeshBuilder.CreateBox(id, { width: w, height: h, depth: d }, this.scene);
    mesh.position = toVector3(position);
    mesh.rotation = toVector3(rotation);
    mesh.checkCollisions = collision;
    mesh.isPickable = true;

    if (material) {
      mesh.material = typeof material === 'string' ? GameState.getMaterial(material) : material;
    }

    GameState.meshes.set(id, mesh);
    return mesh;
  }

  /**
   * Create a sphere mesh
   */
  createSphere(id, options = {}) {
    const {
      diameter = 1,
      radius, // alternative
      segments = 16,
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      material = null,
      collision = true
    } = options;

    const d = radius ? radius * 2 : diameter;

    const mesh = MeshBuilder.CreateSphere(id, { diameter: d, segments }, this.scene);
    mesh.position = toVector3(position);
    mesh.rotation = toVector3(rotation);
    mesh.checkCollisions = collision;
    mesh.isPickable = true;

    if (material) {
      mesh.material = typeof material === 'string' ? GameState.getMaterial(material) : material;
    }

    GameState.meshes.set(id, mesh);
    return mesh;
  }

  /**
   * Create a cylinder mesh
   */
  createCylinder(id, options = {}) {
    const {
      height = 1,
      diameter = 1,
      diameterTop, // optional, defaults to diameter
      diameterBottom, // optional, defaults to diameter
      tessellation = 24,
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      material = null,
      collision = true
    } = options;

    const mesh = MeshBuilder.CreateCylinder(id, {
      height,
      diameter,
      diameterTop: diameterTop ?? diameter,
      diameterBottom: diameterBottom ?? diameter,
      tessellation
    }, this.scene);

    mesh.position = toVector3(position);
    mesh.rotation = toVector3(rotation);
    mesh.checkCollisions = collision;
    mesh.isPickable = true;

    if (material) {
      mesh.material = typeof material === 'string' ? GameState.getMaterial(material) : material;
    }

    GameState.meshes.set(id, mesh);
    return mesh;
  }

  /**
   * Create a cone mesh
   */
  createCone(id, options = {}) {
    const {
      height = 1,
      diameter = 1,
      tessellation = 24,
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      material = null,
      collision = true
    } = options;

    const mesh = MeshBuilder.CreateCylinder(id, {
      height,
      diameterTop: 0,
      diameterBottom: diameter,
      tessellation
    }, this.scene);

    mesh.position = toVector3(position);
    mesh.rotation = toVector3(rotation);
    mesh.checkCollisions = collision;
    mesh.isPickable = true;

    if (material) {
      mesh.material = typeof material === 'string' ? GameState.getMaterial(material) : material;
    }

    GameState.meshes.set(id, mesh);
    return mesh;
  }

  /**
   * Create a plane mesh
   */
  createPlane(id, options = {}) {
    const {
      width = 1,
      height = 1,
      size, // alternative: [w, h]
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      material = null,
      sideOrientation = 2 // DOUBLESIDE
    } = options;

    const w = size ? size[0] : width;
    const h = size ? size[1] : height;

    const mesh = MeshBuilder.CreatePlane(id, { width: w, height: h, sideOrientation }, this.scene);
    mesh.position = toVector3(position);
    mesh.rotation = toVector3(rotation);
    mesh.isPickable = true;

    if (material) {
      mesh.material = typeof material === 'string' ? GameState.getMaterial(material) : material;
    }

    GameState.meshes.set(id, mesh);
    return mesh;
  }

  /**
   * Create a torus mesh
   */
  createTorus(id, options = {}) {
    const {
      diameter = 1,
      thickness = 0.3,
      tessellation = 24,
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      material = null,
      collision = true
    } = options;

    const mesh = MeshBuilder.CreateTorus(id, { diameter, thickness, tessellation }, this.scene);
    mesh.position = toVector3(position);
    mesh.rotation = toVector3(rotation);
    mesh.checkCollisions = collision;
    mesh.isPickable = true;

    if (material) {
      mesh.material = typeof material === 'string' ? GameState.getMaterial(material) : material;
    }

    GameState.meshes.set(id, mesh);
    return mesh;
  }

  /**
   * Create a capsule mesh (cylinder with hemisphere caps)
   */
  createCapsule(id, options = {}) {
    const {
      height = 1,
      radius = 0.25,
      tessellation = 16,
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      material = null,
      collision = true
    } = options;

    const mesh = MeshBuilder.CreateCapsule(id, {
      height,
      radius,
      tessellation,
      subdivisions: 2
    }, this.scene);

    mesh.position = toVector3(position);
    mesh.rotation = toVector3(rotation);
    mesh.checkCollisions = collision;
    mesh.isPickable = true;

    if (material) {
      mesh.material = typeof material === 'string' ? GameState.getMaterial(material) : material;
    }

    GameState.meshes.set(id, mesh);
    return mesh;
  }

  /**
   * Create mesh from JSON definition
   */
  createFromDefinition(def) {
    const { id, type, ...options } = def;

    switch (type) {
      case 'box':
        return this.createBox(id, options);
      case 'sphere':
        return this.createSphere(id, options);
      case 'cylinder':
        return this.createCylinder(id, options);
      case 'cone':
        return this.createCone(id, options);
      case 'plane':
        return this.createPlane(id, options);
      case 'torus':
        return this.createTorus(id, options);
      case 'capsule':
        return this.createCapsule(id, options);
      default:
        console.warn(`Unknown primitive type: ${type}`);
        return null;
    }
  }

  /**
   * Create a simple colored material
   */
  createColorMaterial(id, color, options = {}) {
    const mat = new StandardMaterial(id, this.scene);

    if (Array.isArray(color)) {
      mat.diffuseColor = new Color3(color[0], color[1], color[2]);
    } else if (typeof color === 'string') {
      mat.diffuseColor = Color3.FromHexString(color);
    } else {
      mat.diffuseColor = color;
    }

    mat.specularColor = options.specular || new Color3(0.1, 0.1, 0.1);

    if (options.emissive) {
      mat.emissiveColor = Array.isArray(options.emissive)
        ? new Color3(...options.emissive)
        : options.emissive;
    }

    if (options.alpha !== undefined) {
      mat.alpha = options.alpha;
    }

    GameState.materials.set(id, mat);
    return mat;
  }
}

export default PrimitiveFactory;
