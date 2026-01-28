/**
 * Portal - Room transition portal
 */

import { MeshBuilder, Vector3, StandardMaterial, Color3 } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { EventBus, Events } from '../core/EventBus.js';
import { toVector3 } from '../utils/Math.js';

export class Portal {
  constructor(scene, definition, roomBounds) {
    this.scene = scene;
    this.id = definition.id;
    this.wall = definition.wall; // north, south, east, west
    this.toRoom = definition.toRoom || definition.toRoomFile;
    this.exitPosition = definition.exitPosition || definition.exitPos;
    this.exitRotation = definition.exitRotation || definition.exitYaw || 0;
    this.locked = definition.locked || false;
    this.requiredKey = definition.requiredKey || null;

    // Portal dimensions
    const rect = definition.rect || { center: [0, 1.1], size: [1.6, 2.2] };
    this.rectCenter = rect.center;
    this.rectSize = rect.size;

    // Calculate world position based on wall and room bounds
    this.calculateWorldPosition(roomBounds);

    // Create visual
    this.mesh = null;
    this.createMesh();

    // Calculate trigger bounds
    this.calculateTriggerBounds(roomBounds);
  }

  calculateWorldPosition(roomBounds) {
    const [cx, cy, cz] = roomBounds.center;
    const [sx, sy, sz] = roomBounds.size;
    const hw = sx / 2;
    const hd = sz / 2;

    // rectCenter[0] is offset along the wall, rectCenter[1] is height
    switch (this.wall) {
      case 'north':
        this.position = new Vector3(cx + this.rectCenter[0], cy + this.rectCenter[1] - sy/2, cz + hd);
        this.size = [this.rectSize[0], this.rectSize[1], 0.1];
        break;
      case 'south':
        this.position = new Vector3(cx + this.rectCenter[0], cy + this.rectCenter[1] - sy/2, cz - hd);
        this.size = [this.rectSize[0], this.rectSize[1], 0.1];
        break;
      case 'east':
        this.position = new Vector3(cx + hw, cy + this.rectCenter[1] - sy/2, cz + this.rectCenter[0]);
        this.size = [0.1, this.rectSize[1], this.rectSize[0]];
        break;
      case 'west':
        this.position = new Vector3(cx - hw, cy + this.rectCenter[1] - sy/2, cz + this.rectCenter[0]);
        this.size = [0.1, this.rectSize[1], this.rectSize[0]];
        break;
    }
  }

  createMesh() {
    this.mesh = MeshBuilder.CreateBox(this.id, {
      width: this.size[0],
      height: this.size[1],
      depth: this.size[2]
    }, this.scene);

    this.mesh.position = this.position.clone();
    this.mesh.isPickable = false;

    // Material based on locked state
    this.material = new StandardMaterial(`${this.id}_mat`, this.scene);
    this.updateMaterial();
    this.mesh.material = this.material;
  }

  updateMaterial() {
    if (this.locked) {
      this.material.emissiveColor = new Color3(1, 0.2, 0.2); // Red
    } else {
      this.material.emissiveColor = new Color3(0.2, 1, 0.4); // Green
    }
    this.material.diffuseColor = new Color3(0, 0, 0);
    this.material.alpha = 0.25;
  }

  calculateTriggerBounds(roomBounds) {
    const [cx, cy, cz] = roomBounds.center;
    const [sx, sy, sz] = roomBounds.size;
    const hw = sx / 2;
    const hd = sz / 2;

    const halfWidth = this.rectSize[0] / 2 + 0.3; // Wider trigger
    const halfHeight = this.rectSize[1] / 2;
    const triggerDepth = 1.0; // How far into room the trigger extends

    let minX, maxX, minY, maxY, minZ, maxZ;

    // Set Y bounds (same for all walls)
    minY = this.position.y - halfHeight;
    maxY = this.position.y + halfHeight + 0.5; // Extra height for jumping

    // Extend trigger zone based on wall direction
    switch (this.wall) {
      case 'north': // +Z wall
        minX = this.position.x - halfWidth;
        maxX = this.position.x + halfWidth;
        minZ = cz + hd - triggerDepth;
        maxZ = cz + hd + 0.3;
        break;
      case 'south': // -Z wall
        minX = this.position.x - halfWidth;
        maxX = this.position.x + halfWidth;
        minZ = cz - hd - 0.3;
        maxZ = cz - hd + triggerDepth;
        break;
      case 'east': // +X wall
        minX = cx + hw - triggerDepth;
        maxX = cx + hw + 0.3;
        minZ = this.position.z - halfWidth;
        maxZ = this.position.z + halfWidth;
        break;
      case 'west': // -X wall
        minX = cx - hw - 0.3;
        maxX = cx - hw + triggerDepth;
        minZ = this.position.z - halfWidth;
        maxZ = this.position.z + halfWidth;
        break;
    }

    this.min = new Vector3(minX, minY, minZ);
    this.max = new Vector3(maxX, maxY, maxZ);
  }

  /**
   * Check if point is inside portal trigger zone
   */
  contains(point) {
    return point.x >= this.min.x && point.x <= this.max.x &&
           point.y >= this.min.y && point.y <= this.max.y &&
           point.z >= this.min.z && point.z <= this.max.z;
  }

  /**
   * Try to enter portal
   */
  enter() {
    if (this.locked) {
      if (this.requiredKey && GameState.hasItem(this.requiredKey)) {
        this.unlock();
      } else {
        EventBus.emit(Events.OBJECT_INTERACT, { id: this.id, action: 'locked' });
        return false;
      }
    }

    // Trigger room transition
    EventBus.emit(Events.PORTAL_ENTER, {
      id: this.id,
      toRoom: this.toRoom,
      exitPosition: this.exitPosition,
      exitRotation: this.exitRotation
    });

    return true;
  }

  /**
   * Unlock portal
   */
  unlock() {
    this.locked = false;
    this.updateMaterial();
    EventBus.emit(Events.OBJECT_INTERACT, { id: this.id, action: 'unlocked' });
  }

  /**
   * Lock portal
   */
  lock() {
    this.locked = true;
    this.updateMaterial();
  }

  dispose() {
    if (this.mesh) {
      this.mesh.dispose();
    }
  }
}

export default Portal;
