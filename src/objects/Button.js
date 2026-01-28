/**
 * Button - Interactive button/switch
 */

import { MeshBuilder, Vector3, StandardMaterial, Color3 } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { EventBus, Events } from '../core/EventBus.js';
import { toVector3 } from '../utils/Math.js';

export class Button {
  constructor(scene, definition) {
    this.scene = scene;
    this.id = definition.id;
    this.position = toVector3(definition.position);
    this.rotation = definition.rotation || 0;

    // Button parameters
    this.size = definition.size || 0.15;
    this.depth = definition.depth || 0.05;
    this.color = definition.color || [0.2, 0.8, 0.2]; // Green
    this.pressedColor = definition.pressedColor || [0.8, 0.2, 0.2]; // Red
    this.isToggle = definition.isToggle || false;
    this.cooldown = definition.cooldown || 0.5;

    // Target action
    this.targetAction = definition.targetAction || null;

    // State
    this.isPressed = false;
    this.canPress = true;
    this.lastPressTime = 0;

    // Create mesh
    this.mesh = null;
    this.baseMesh = null;
    this.createMesh();

    // Store in GameState
    GameState.interactives.set(this.id, this);
  }

  createMesh() {
    // Button base
    this.baseMesh = MeshBuilder.CreateBox(`${this.id}_base`, {
      width: this.size * 1.5,
      height: this.size * 1.5,
      depth: this.depth
    }, this.scene);
    this.baseMesh.position = this.position.clone();
    this.baseMesh.rotation.y = this.rotation * Math.PI / 180;
    this.baseMesh.isPickable = false;

    const baseMat = new StandardMaterial(`${this.id}_baseMat`, this.scene);
    baseMat.diffuseColor = new Color3(0.3, 0.3, 0.3);
    baseMat.specularColor = new Color3(0.1, 0.1, 0.1);
    this.baseMesh.material = baseMat;

    // Button surface
    this.mesh = MeshBuilder.CreateCylinder(this.id, {
      diameter: this.size,
      height: this.depth * 0.8,
      tessellation: 16
    }, this.scene);

    // Position slightly in front of base
    const offset = new Vector3(0, 0, this.depth * 0.5);
    const angle = this.rotation * Math.PI / 180;
    const rotatedOffset = new Vector3(
      offset.z * Math.sin(angle),
      0,
      offset.z * Math.cos(angle)
    );

    this.mesh.position = this.position.add(rotatedOffset);
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.rotation.y = this.rotation * Math.PI / 180;
    this.mesh.isPickable = true;

    // Button material
    this.buttonMat = new StandardMaterial(`${this.id}_mat`, this.scene);
    this.updateButtonColor();
    this.mesh.material = this.buttonMat;
  }

  updateButtonColor() {
    const color = this.isPressed ? this.pressedColor : this.color;
    this.buttonMat.diffuseColor = new Color3(color[0], color[1], color[2]);
    this.buttonMat.emissiveColor = new Color3(color[0] * 0.3, color[1] * 0.3, color[2] * 0.3);
  }

  /**
   * Press the button
   */
  press() {
    const now = performance.now() / 1000;

    if (!this.canPress || (now - this.lastPressTime) < this.cooldown) {
      return false;
    }

    this.lastPressTime = now;

    if (this.isToggle) {
      this.isPressed = !this.isPressed;
    } else {
      this.isPressed = true;
      // Auto-release after short delay
      setTimeout(() => {
        this.isPressed = false;
        this.updateButtonColor();
      }, 200);
    }

    this.updateButtonColor();
    this.animatePress();

    // Execute target action
    if (this.targetAction) {
      EventBus.emit('action', this.targetAction);
    }

    EventBus.emit(Events.OBJECT_INTERACT, {
      id: this.id,
      action: 'pressed',
      state: this.isPressed
    });

    return true;
  }

  /**
   * Animate button press
   */
  animatePress() {
    const originalZ = this.mesh.position.z;
    const pressDepth = this.depth * 0.3;

    // Quick press animation
    const angle = this.rotation * Math.PI / 180;
    const pressOffset = new Vector3(
      -pressDepth * Math.sin(angle),
      0,
      -pressDepth * Math.cos(angle)
    );

    this.mesh.position.addInPlace(pressOffset);

    setTimeout(() => {
      this.mesh.position.subtractInPlace(pressOffset);
    }, 100);
  }

  /**
   * Interact with button
   */
  interact() {
    return this.press();
  }

  /**
   * Check if point is near button
   */
  isNear(point, distance = 1.5) {
    return Vector3.Distance(point, this.position) <= distance;
  }

  /**
   * Enable/disable button
   */
  setEnabled(enabled) {
    this.canPress = enabled;
    this.buttonMat.alpha = enabled ? 1.0 : 0.5;
  }

  dispose() {
    if (this.mesh) {
      this.mesh.dispose();
    }
    if (this.baseMesh) {
      this.baseMesh.dispose();
    }
    GameState.interactives.delete(this.id);
  }
}

export default Button;
