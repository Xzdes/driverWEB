/**
 * Door - Interactive door object
 */

import { MeshBuilder, Vector3, Animation } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { EventBus, Events } from '../core/EventBus.js';
import { toVector3 } from '../utils/Math.js';

export class Door {
  constructor(scene, definition) {
    this.scene = scene;
    this.id = definition.id;
    this.position = toVector3(definition.position);
    this.rotation = definition.rotation || 0;

    // Door parameters
    this.width = definition.width || 1.2;
    this.height = definition.height || 2.2;
    this.depth = definition.depth || 0.1;
    this.openDirection = definition.openDirection || 'slide_left'; // slide_left, slide_right, swing_in, swing_out
    this.openSpeed = definition.openSpeed || 2;
    this.autoClose = definition.autoClose || false;
    this.autoCloseDelay = definition.autoCloseDelay || 3;
    this.requiresKey = definition.requiresKey || null;
    this.locked = definition.locked || false;

    // State
    this.isOpen = false;
    this.isAnimating = false;
    this.openAmount = 0; // 0 = closed, 1 = open
    this.autoCloseTimer = null;

    // Create mesh
    this.mesh = null;
    this.frame = null;
    this.createMesh(definition.material);

    // Store in GameState
    GameState.interactives.set(this.id, this);
  }

  createMesh(materialId) {
    // Door frame
    this.frame = MeshBuilder.CreateBox(`${this.id}_frame`, {
      width: this.width + 0.1,
      height: this.height + 0.1,
      depth: this.depth + 0.05
    }, this.scene);
    this.frame.position = this.position.clone();
    this.frame.rotation.y = this.rotation * Math.PI / 180;
    this.frame.isPickable = false;

    // Door panel
    this.mesh = MeshBuilder.CreateBox(this.id, {
      width: this.width,
      height: this.height,
      depth: this.depth
    }, this.scene);
    this.mesh.position = this.position.clone();
    this.mesh.rotation.y = this.rotation * Math.PI / 180;
    this.mesh.isPickable = true;

    // Apply material
    if (materialId) {
      const mat = GameState.getMaterial(materialId);
      if (mat) {
        this.mesh.material = mat;
        this.frame.material = mat;
      }
    }
  }

  /**
   * Open the door
   */
  open() {
    if (this.isOpen || this.isAnimating) return false;

    if (this.locked) {
      if (this.requiresKey && GameState.hasItem(this.requiresKey)) {
        this.locked = false;
        GameState.removeItem(this.requiresKey);
      } else {
        EventBus.emit(Events.OBJECT_INTERACT, { id: this.id, action: 'locked' });
        return false;
      }
    }

    this.isAnimating = true;
    this.animateOpen();
    return true;
  }

  /**
   * Close the door
   */
  close() {
    if (!this.isOpen || this.isAnimating) return false;

    this.isAnimating = true;
    this.animateClose();
    return true;
  }

  /**
   * Toggle door state
   */
  toggle() {
    if (this.isOpen) {
      return this.close();
    } else {
      return this.open();
    }
  }

  /**
   * Animate door opening
   */
  animateOpen() {
    const duration = 1 / this.openSpeed;
    const fps = 60;
    const frames = duration * fps;

    if (this.openDirection.startsWith('slide')) {
      // Sliding door
      const direction = this.openDirection === 'slide_left' ? -1 : 1;
      const targetOffset = direction * this.width;

      // Calculate offset in local space
      const angle = this.rotation * Math.PI / 180;
      const offsetX = Math.cos(angle) * targetOffset;
      const offsetZ = Math.sin(angle) * targetOffset;

      const startPos = this.mesh.position.clone();
      const endPos = startPos.add(new Vector3(offsetX, 0, offsetZ));

      this.animatePosition(startPos, endPos, duration, () => {
        this.isOpen = true;
        this.isAnimating = false;
        this.openAmount = 1;
        EventBus.emit(Events.OBJECT_INTERACT, { id: this.id, action: 'opened' });
        this.startAutoCloseTimer();
      });

    } else {
      // Swinging door
      const direction = this.openDirection === 'swing_in' ? 1 : -1;
      const targetAngle = direction * Math.PI / 2;

      this.animateRotation(0, targetAngle, duration, () => {
        this.isOpen = true;
        this.isAnimating = false;
        this.openAmount = 1;
        EventBus.emit(Events.OBJECT_INTERACT, { id: this.id, action: 'opened' });
        this.startAutoCloseTimer();
      });
    }
  }

  /**
   * Animate door closing
   */
  animateClose() {
    const duration = 1 / this.openSpeed;

    if (this.openDirection.startsWith('slide')) {
      const direction = this.openDirection === 'slide_left' ? -1 : 1;
      const currentOffset = direction * this.width;

      const angle = this.rotation * Math.PI / 180;
      const offsetX = Math.cos(angle) * currentOffset;
      const offsetZ = Math.sin(angle) * currentOffset;

      const startPos = this.mesh.position.clone();
      const endPos = startPos.subtract(new Vector3(offsetX, 0, offsetZ));

      this.animatePosition(startPos, endPos, duration, () => {
        this.isOpen = false;
        this.isAnimating = false;
        this.openAmount = 0;
        EventBus.emit(Events.OBJECT_INTERACT, { id: this.id, action: 'closed' });
      });

    } else {
      const direction = this.openDirection === 'swing_in' ? 1 : -1;
      const currentAngle = direction * Math.PI / 2;

      this.animateRotation(currentAngle, 0, duration, () => {
        this.isOpen = false;
        this.isAnimating = false;
        this.openAmount = 0;
        EventBus.emit(Events.OBJECT_INTERACT, { id: this.id, action: 'closed' });
      });
    }
  }

  animatePosition(start, end, duration, onComplete) {
    const anim = new Animation(
      `${this.id}_posAnim`,
      'position',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    anim.setKeys([
      { frame: 0, value: start },
      { frame: 60 * duration, value: end }
    ]);

    this.mesh.animations = [anim];
    this.scene.beginAnimation(this.mesh, 0, 60 * duration, false, 1, onComplete);
  }

  animateRotation(startAngle, endAngle, duration, onComplete) {
    const baseRotation = this.rotation * Math.PI / 180;

    const anim = new Animation(
      `${this.id}_rotAnim`,
      'rotation.y',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    anim.setKeys([
      { frame: 0, value: baseRotation + startAngle },
      { frame: 60 * duration, value: baseRotation + endAngle }
    ]);

    this.mesh.animations = [anim];
    this.scene.beginAnimation(this.mesh, 0, 60 * duration, false, 1, onComplete);
  }

  startAutoCloseTimer() {
    if (this.autoClose) {
      this.autoCloseTimer = setTimeout(() => {
        this.close();
      }, this.autoCloseDelay * 1000);
    }
  }

  /**
   * Interact with door (called when player uses it)
   */
  interact() {
    return this.toggle();
  }

  /**
   * Check if point is near door (for interaction)
   */
  isNear(point, distance = 2) {
    return Vector3.Distance(point, this.position) <= distance;
  }

  dispose() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
    if (this.mesh) {
      this.mesh.dispose();
    }
    if (this.frame) {
      this.frame.dispose();
    }
    GameState.interactives.delete(this.id);
  }
}

export default Door;
