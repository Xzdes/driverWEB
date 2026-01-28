/**
 * InputManager - Управление вводом (клавиатура, мышь)
 */

import { GameState } from '../core/GameState.js';
import { EventBus, Events } from '../core/EventBus.js';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.pointerLocked = false;

    // Bind methods
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);

    // Setup listeners
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('click', this.onClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  onKeyDown(e) {
    GameState.keys[e.code] = true;

    // Escape to release pointer lock
    if (e.code === 'Escape' && this.pointerLocked) {
      document.exitPointerLock();
    }

    // E for interaction
    if (e.code === 'KeyE') {
      EventBus.emit(Events.PLAYER_INTERACT);
    }
  }

  onKeyUp(e) {
    GameState.keys[e.code] = false;
  }

  onMouseMove(e) {
    if (this.pointerLocked) {
      GameState.mouse.dx = e.movementX;
      GameState.mouse.dy = e.movementY;
    }
    GameState.mouse.x = e.clientX;
    GameState.mouse.y = e.clientY;
  }

  onClick() {
    if (!this.pointerLocked) {
      this.canvas.requestPointerLock();
    }
  }

  onPointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this.canvas;
  }

  /**
   * Check if a key is currently pressed
   */
  isKeyDown(code) {
    return GameState.keys[code] === true;
  }

  /**
   * Get movement input as normalized vector
   */
  getMovementInput() {
    let x = 0, z = 0;

    if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) z += 1;
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) z -= 1;
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) x += 1;
    if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) x -= 1;

    // Normalize
    const len = Math.sqrt(x * x + z * z);
    if (len > 0) {
      x /= len;
      z /= len;
    }

    return { x, z };
  }

  /**
   * Check if running
   */
  isRunning() {
    return this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight');
  }

  /**
   * Check if crouching
   */
  isCrouching() {
    return this.isKeyDown('ControlLeft') || this.isKeyDown('ControlRight');
  }

  /**
   * Check if jump pressed
   */
  isJumping() {
    return this.isKeyDown('Space');
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('click', this.onClick);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}

export default InputManager;
