/**
 * PlayerController - Управление движением игрока с прыжками и взаимодействием
 */

import { Vector3 } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { EventBus, Events } from '../core/EventBus.js';
import { CollisionSystem } from '../physics/CollisionSystem.js';
import { Logger } from '../utils/Logger.js';

export class PlayerController {
  constructor(camera, config) {
    this.camera = camera;
    this.config = config;

    // Movement settings
    this.walkSpeed = config.movement?.walkSpeed || config.walkSpeed || 5.4;
    this.runSpeed = config.movement?.runSpeed || config.runSpeed || 9.2;
    this.crouchSpeed = config.movement?.crouchSpeed || 2.5;

    // Jump & gravity
    this.jumpSpeed = config.movement?.jumpForce || config.jumpSpeed || 6.0;
    this.gravity = 20.0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.groundY = 0;

    // Interaction
    this.interactDistance = 2.5;

    // Collision
    this.collisionSystem = new CollisionSystem();
    this.playerRadius = config.radius || 0.36;

    // Input state for jump (one-shot)
    this.jumpPressed = false;
  }

  update(dt) {
    const keys = GameState.keys;

    // Calculate movement direction from camera
    const forward = this.camera.getDirection(Vector3.Forward());
    const right = this.camera.getDirection(Vector3.Right());

    // Flatten to XZ plane
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    // Get input
    let wishDir = Vector3.Zero();

    if (keys['KeyW'] || keys['ArrowUp']) wishDir.addInPlace(forward);
    if (keys['KeyS'] || keys['ArrowDown']) wishDir.subtractInPlace(forward);
    if (keys['KeyD'] || keys['ArrowRight']) wishDir.addInPlace(right);
    if (keys['KeyA'] || keys['ArrowLeft']) wishDir.subtractInPlace(right);

    // Determine speed
    let speed = this.walkSpeed;
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
      speed = this.runSpeed;
    } else if (keys['ControlLeft'] || keys['ControlRight']) {
      speed = this.crouchSpeed;
    }

    // Calculate horizontal velocity
    let velocityXZ = Vector3.Zero();
    if (wishDir.lengthSquared() > 0) {
      wishDir.normalize();
      velocityXZ = wishDir.scale(speed * dt);
    }

    // Jump
    if ((keys['Space']) && this.isGrounded && !this.jumpPressed) {
      this.velocityY = this.jumpSpeed;
      this.isGrounded = false;
      this.jumpPressed = true;
      Logger.debug('PLAYER', 'Jump!');
    }
    if (!keys['Space']) {
      this.jumpPressed = false;
    }

    // Apply gravity
    if (!this.isGrounded) {
      this.velocityY -= this.gravity * dt;
    }

    // Calculate target position
    const prevPos = this.camera.position.clone();
    let targetPos = prevPos.add(velocityXZ);
    targetPos.y += this.velocityY * dt;

    // Ground check
    if (GameState.fixedEyeY != null) {
      this.groundY = GameState.fixedEyeY;
      if (targetPos.y <= this.groundY) {
        targetPos.y = this.groundY;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    }

    // Check portals before applying collision
    if (performance.now() >= GameState.portalCooldownUntil) {
      for (const portal of GameState.portals) {
        if (this.isInPortal(targetPos, portal)) {
          if (portal.locked) {
            if (portal.requiredKey && GameState.hasItem(portal.requiredKey)) {
              portal.locked = false;
              if (portal.updateMaterial) portal.updateMaterial();
              Logger.info('PLAYER', `Unlocked portal with ${portal.requiredKey}`);
            } else {
              continue;
            }
          }

          EventBus.emit(Events.PORTAL_ENTER, { portal });
          GameState.nextRoomFile = portal.toRoom || portal.toRoomFile;
          GameState.playerSpawnInfo = {
            pos: portal.exitPosition || portal.exitPos,
            yaw: portal.exitRotation || portal.exitYaw || 0
          };
          return;
        }
      }
    }

    // Apply room bounds collision
    let finalPos = this.collisionSystem.clampToRoom(prevPos, targetPos);

    // Apply collision with solid objects
    finalPos = this.collisionSystem.sweepSolids(prevPos, finalPos);

    // Apply collision with characters
    finalPos = this.collisionWithCharacters(prevPos, finalPos);

    // Apply collision with physics objects (and push them)
    if (GameState.physicsWorld) {
      finalPos = GameState.physicsWorld.resolvePlayerCollision(
        prevPos,
        finalPos,
        this.playerRadius,
        velocityXZ.lengthSquared() > 0 ? wishDir.scale(speed) : null
      );
    }

    // Preserve Y from gravity calculations
    finalPos.y = targetPos.y;
    if (GameState.fixedEyeY != null && finalPos.y < GameState.fixedEyeY) {
      finalPos.y = GameState.fixedEyeY;
    }

    // Update camera position
    this.camera.position.copyFrom(finalPos);

    if (velocityXZ.lengthSquared() > 0) {
      EventBus.emit(Events.PLAYER_MOVE, {
        position: this.camera.position.clone(),
        velocity: wishDir.scale(speed)
      });
    }

    // Interaction (E key)
    if (keys['KeyE'] && !this.interactPressed) {
      this.interactPressed = true;
      this.tryInteract();
    }
    if (!keys['KeyE']) {
      this.interactPressed = false;
    }
  }

  /**
   * Collision with characters
   */
  collisionWithCharacters(prevPos, currentPos) {
    let x = currentPos.x;
    let z = currentPos.z;
    const R = this.playerRadius;

    for (const [id, character] of GameState.characters) {
      if (!character.root) continue;

      const charPos = character.root.position;
      const charRadius = 0.4; // Character collision radius

      // Distance check on XZ plane
      const dx = x - charPos.x;
      const dz = z - charPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = R + charRadius;

      if (dist < minDist && dist > 0) {
        // Push player out
        const pushX = (dx / dist) * (minDist - dist);
        const pushZ = (dz / dist) * (minDist - dist);
        x += pushX;
        z += pushZ;
      }
    }

    return new Vector3(x, currentPos.y, z);
  }

  /**
   * Try to interact with nearby objects
   */
  tryInteract() {
    const playerPos = this.camera.position;
    let closestDist = this.interactDistance;
    let closestObj = null;

    // Check interactives
    for (const [id, obj] of GameState.interactives) {
      if (!obj.position && !obj.mesh) continue;

      const objPos = obj.position || obj.mesh?.position;
      if (!objPos) continue;

      const dist = Vector3.Distance(playerPos, objPos);
      if (dist < closestDist) {
        closestDist = dist;
        closestObj = obj;
      }
    }

    // Check pickups that can be manually picked
    for (const [id, obj] of GameState.interactives) {
      if (obj.itemType && obj.interact) {
        const objPos = obj.position;
        if (!objPos) continue;

        const dist = Vector3.Distance(playerPos, objPos);
        if (dist < closestDist) {
          closestDist = dist;
          closestObj = obj;
        }
      }
    }

    if (closestObj && closestObj.interact) {
      Logger.info('PLAYER', `Interacting with ${closestObj.id}`);
      closestObj.interact();
      EventBus.emit(Events.PLAYER_INTERACT, { object: closestObj });
    }
  }

  /**
   * Check if position is inside portal trigger zone
   */
  isInPortal(pos, portal) {
    if (!portal.min || !portal.max) return false;
    return pos.x >= portal.min.x && pos.x <= portal.max.x &&
           pos.y >= portal.min.y && pos.y <= portal.max.y &&
           pos.z >= portal.min.z && pos.z <= portal.max.z;
  }

  /**
   * Teleport player to position
   */
  teleport(position, rotation = null) {
    if (Array.isArray(position)) {
      this.camera.position = new Vector3(position[0], position[1], position[2]);
    } else {
      this.camera.position.copyFrom(position);
    }

    if (rotation != null) {
      const yaw = typeof rotation === 'number' ? rotation : rotation.y || 0;
      this.camera.rotation = new Vector3(0, yaw * Math.PI / 180, 0);
    }

    // Reset vertical velocity
    this.velocityY = 0;
    this.isGrounded = true;
  }

  /**
   * Get current player position
   */
  getPosition() {
    return this.camera.position.clone();
  }

  /**
   * Get current player rotation (yaw in degrees)
   */
  getRotation() {
    return this.camera.rotation.y * 180 / Math.PI;
  }
}

export default PlayerController;
