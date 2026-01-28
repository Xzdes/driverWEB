/**
 * Pickup - Collectible item
 */

import { MeshBuilder, Vector3, StandardMaterial, Color3 } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { EventBus, Events } from '../core/EventBus.js';
import { toVector3 } from '../utils/Math.js';

export class Pickup {
  constructor(scene, definition) {
    this.scene = scene;
    this.id = definition.id;
    this.position = toVector3(definition.position);

    // Pickup parameters
    this.itemType = definition.itemType || 'generic'; // key, health, ammo, generic
    this.itemId = definition.itemId || this.id;
    this.amount = definition.amount || 1;
    this.respawn = definition.respawn || false;
    this.respawnTime = definition.respawnTime || 30;
    this.autoPickup = definition.autoPickup !== false;
    this.pickupRadius = definition.pickupRadius || 1;

    // Visual
    this.meshType = definition.meshType || this.getMeshTypeForItem();
    this.color = definition.color || this.getColorForItem();
    this.size = definition.size || 0.3;
    this.floatHeight = definition.floatHeight || 0.3;
    this.rotationSpeed = definition.rotationSpeed || 1;

    // State
    this.isCollected = false;
    this.isVisible = true;
    this.respawnTimer = null;

    // Create mesh
    this.mesh = null;
    this.glowMesh = null;
    this.createMesh();

    // Store in GameState
    GameState.interactives.set(this.id, this);
  }

  getMeshTypeForItem() {
    switch (this.itemType) {
      case 'key': return 'box';
      case 'health': return 'sphere';
      case 'ammo': return 'cylinder';
      default: return 'sphere';
    }
  }

  getColorForItem() {
    switch (this.itemType) {
      case 'key': return [1, 0.8, 0];      // Gold
      case 'health': return [0.2, 0.9, 0.3]; // Green
      case 'ammo': return [0.9, 0.6, 0.1];   // Orange
      default: return [0.5, 0.5, 1];         // Blue
    }
  }

  createMesh() {
    // Create main mesh based on type
    switch (this.meshType) {
      case 'box':
        this.mesh = MeshBuilder.CreateBox(this.id, {
          size: this.size
        }, this.scene);
        break;
      case 'cylinder':
        this.mesh = MeshBuilder.CreateCylinder(this.id, {
          height: this.size,
          diameter: this.size * 0.5
        }, this.scene);
        break;
      case 'sphere':
      default:
        this.mesh = MeshBuilder.CreateSphere(this.id, {
          diameter: this.size
        }, this.scene);
    }

    this.mesh.position = this.position.clone();
    this.mesh.position.y += this.floatHeight;
    this.mesh.isPickable = true;

    // Create material
    const mat = new StandardMaterial(`${this.id}_mat`, this.scene);
    mat.diffuseColor = new Color3(this.color[0], this.color[1], this.color[2]);
    mat.emissiveColor = new Color3(
      this.color[0] * 0.4,
      this.color[1] * 0.4,
      this.color[2] * 0.4
    );
    mat.specularColor = new Color3(0.5, 0.5, 0.5);
    this.mesh.material = mat;

    // Create glow sphere
    this.glowMesh = MeshBuilder.CreateSphere(`${this.id}_glow`, {
      diameter: this.size * 1.5
    }, this.scene);
    this.glowMesh.position = this.mesh.position.clone();
    this.glowMesh.isPickable = false;

    const glowMat = new StandardMaterial(`${this.id}_glowMat`, this.scene);
    glowMat.diffuseColor = new Color3(0, 0, 0);
    glowMat.emissiveColor = new Color3(
      this.color[0] * 0.2,
      this.color[1] * 0.2,
      this.color[2] * 0.2
    );
    glowMat.alpha = 0.3;
    this.glowMesh.material = glowMat;
  }

  /**
   * Update pickup (call each frame for animation)
   */
  update(dt) {
    if (!this.isVisible || !this.mesh) return;

    // Rotate
    this.mesh.rotation.y += this.rotationSpeed * dt;

    // Float up and down
    const floatOffset = Math.sin(GameState.totalTime * 2) * 0.1;
    this.mesh.position.y = this.position.y + this.floatHeight + floatOffset;
    this.glowMesh.position.y = this.mesh.position.y;

    // Pulse glow
    const pulse = 0.25 + Math.sin(GameState.totalTime * 3) * 0.1;
    this.glowMesh.material.alpha = pulse;
  }

  /**
   * Collect the pickup
   */
  collect() {
    if (this.isCollected) return false;

    this.isCollected = true;
    this.setVisible(false);

    // Apply effect based on item type
    switch (this.itemType) {
      case 'key':
        GameState.addItem(this.itemId);
        break;
      case 'health':
        // Health would be handled by player system
        EventBus.emit('player:heal', { amount: this.amount });
        break;
      case 'ammo':
        EventBus.emit('player:addAmmo', { amount: this.amount });
        break;
      default:
        GameState.addItem(this.itemId);
    }

    EventBus.emit(Events.OBJECT_INTERACT, {
      id: this.id,
      action: 'collected',
      itemType: this.itemType,
      itemId: this.itemId,
      amount: this.amount
    });

    // Handle respawn
    if (this.respawn) {
      this.respawnTimer = setTimeout(() => {
        this.reset();
      }, this.respawnTime * 1000);
    }

    return true;
  }

  /**
   * Reset pickup (for respawn)
   */
  reset() {
    this.isCollected = false;
    this.setVisible(true);
  }

  /**
   * Set visibility
   */
  setVisible(visible) {
    this.isVisible = visible;
    if (this.mesh) {
      this.mesh.isVisible = visible;
    }
    if (this.glowMesh) {
      this.glowMesh.isVisible = visible;
    }
  }

  /**
   * Check if player is in pickup range
   */
  checkAutoPickup(playerPosition) {
    if (!this.isVisible || this.isCollected || !this.autoPickup) return;

    const distance = Vector3.Distance(playerPosition, this.position);
    if (distance <= this.pickupRadius) {
      this.collect();
    }
  }

  /**
   * Manual interact
   */
  interact() {
    return this.collect();
  }

  /**
   * Check if near
   */
  isNear(point, distance = null) {
    return Vector3.Distance(point, this.position) <= (distance || this.pickupRadius);
  }

  dispose() {
    if (this.respawnTimer) {
      clearTimeout(this.respawnTimer);
    }
    if (this.mesh) {
      this.mesh.dispose();
    }
    if (this.glowMesh) {
      this.glowMesh.dispose();
    }
    GameState.interactives.delete(this.id);
  }
}

export default Pickup;
