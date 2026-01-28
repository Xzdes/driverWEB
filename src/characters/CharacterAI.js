/**
 * CharacterAI - Simple AI behaviors for characters
 */

import { Vector3 } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { Logger } from '../utils/Logger.js';

/**
 * AI Behavior types
 */
export const AIBehavior = {
  IDLE: 'idle',
  PATROL: 'patrol',
  WANDER: 'wander',
  CHASE: 'chase'
};

/**
 * CharacterAI - Controls character movement and behavior
 */
export class CharacterAI {
  constructor(character, options = {}) {
    this.character = character;
    this.root = character.root;

    // Movement
    this.speed = options.speed || 1.5;
    this.turnSpeed = options.turnSpeed || 3.0;

    // Behavior
    this.behavior = options.behavior || AIBehavior.WANDER;
    this.patrolPoints = options.patrolPoints || [];
    this.patrolIndex = 0;

    // Wander settings
    this.wanderRadius = options.wanderRadius || 4;
    this.wanderCenter = this.root.position.clone();
    this.targetPosition = null;
    this.waitTime = 0;
    this.minWait = options.minWait || 1;
    this.maxWait = options.maxWait || 4;

    // Animation
    this.isMoving = false;

    // State
    this.enabled = true;
  }

  update(dt) {
    if (!this.enabled || !this.root) return;

    switch (this.behavior) {
      case AIBehavior.PATROL:
        this.updatePatrol(dt);
        break;
      case AIBehavior.WANDER:
        this.updateWander(dt);
        break;
      case AIBehavior.CHASE:
        this.updateChase(dt);
        break;
      case AIBehavior.IDLE:
      default:
        this.updateIdle(dt);
        break;
    }
  }

  /**
   * Idle behavior - just stand
   */
  updateIdle(dt) {
    this.isMoving = false;
    if (this.character.playAnimation) {
      this.character.playAnimation('idle');
    }
  }

  /**
   * Patrol behavior - move between patrol points
   */
  updatePatrol(dt) {
    if (this.patrolPoints.length === 0) {
      this.updateIdle(dt);
      return;
    }

    // Wait at patrol point
    if (this.waitTime > 0) {
      this.waitTime -= dt;
      this.isMoving = false;
      if (this.character.playAnimation) {
        this.character.playAnimation('idle');
      }
      return;
    }

    // Get current patrol target
    const target = this.patrolPoints[this.patrolIndex];
    const targetPos = new Vector3(target[0], this.root.position.y, target[2]);

    // Move towards target
    if (this.moveTowards(targetPos, dt)) {
      // Reached target, go to next point
      this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
      this.waitTime = this.minWait + Math.random() * (this.maxWait - this.minWait);
    }
  }

  /**
   * Wander behavior - randomly walk around
   */
  updateWander(dt) {
    // Wait before moving
    if (this.waitTime > 0) {
      this.waitTime -= dt;
      this.isMoving = false;
      if (this.character.playAnimation) {
        this.character.playAnimation('idle');
      }
      return;
    }

    // Pick new target if needed
    if (!this.targetPosition) {
      this.pickWanderTarget();
    }

    // Move towards target
    if (this.moveTowards(this.targetPosition, dt)) {
      // Reached target
      this.targetPosition = null;
      this.waitTime = this.minWait + Math.random() * (this.maxWait - this.minWait);
    }
  }

  /**
   * Chase behavior - follow the player
   */
  updateChase(dt) {
    if (!GameState.camera) {
      this.updateIdle(dt);
      return;
    }

    const playerPos = GameState.camera.position;
    const targetPos = new Vector3(playerPos.x, this.root.position.y, playerPos.z);

    // Keep some distance from player
    const dist = Vector3.Distance(this.root.position, targetPos);
    if (dist > 2) {
      this.moveTowards(targetPos, dt);
    } else {
      this.isMoving = false;
      // Face player
      this.faceTarget(targetPos, dt);
      if (this.character.playAnimation) {
        this.character.playAnimation('idle');
      }
    }
  }

  /**
   * Pick a random point to wander to
   */
  pickWanderTarget() {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.wanderRadius;

    const x = this.wanderCenter.x + Math.cos(angle) * radius;
    const z = this.wanderCenter.z + Math.sin(angle) * radius;

    // Clamp to room bounds
    const bounds = GameState.collisionBounds;
    const clampedX = Math.max(bounds.minX + 1, Math.min(bounds.maxX - 1, x));
    const clampedZ = Math.max(bounds.minZ + 1, Math.min(bounds.maxZ - 1, z));

    this.targetPosition = new Vector3(clampedX, this.root.position.y, clampedZ);
  }

  /**
   * Move towards a target position
   * Returns true if reached
   */
  moveTowards(target, dt) {
    const pos = this.root.position;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.3) {
      this.isMoving = false;
      return true;
    }

    // Face target
    this.faceTarget(target, dt);

    // Move
    const moveX = (dx / dist) * this.speed * dt;
    const moveZ = (dz / dist) * this.speed * dt;

    // Check collision with room bounds
    const newX = pos.x + moveX;
    const newZ = pos.z + moveZ;
    const bounds = GameState.collisionBounds;

    if (newX > bounds.minX && newX < bounds.maxX) {
      pos.x = newX;
    }
    if (newZ > bounds.minZ && newZ < bounds.maxZ) {
      pos.z = newZ;
    }

    this.isMoving = true;
    if (this.character.playAnimation) {
      this.character.playAnimation('walk');
    }

    return false;
  }

  /**
   * Rotate to face target
   */
  faceTarget(target, dt) {
    const pos = this.root.position;
    const targetAngle = Math.atan2(target.x - pos.x, target.z - pos.z);

    // Smooth rotation
    let currentAngle = this.root.rotation.y;
    let diff = targetAngle - currentAngle;

    // Normalize angle difference to -PI to PI
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const rotateAmount = this.turnSpeed * dt;
    if (Math.abs(diff) < rotateAmount) {
      this.root.rotation.y = targetAngle;
    } else {
      this.root.rotation.y += Math.sign(diff) * rotateAmount;
    }
  }

  /**
   * Set behavior
   */
  setBehavior(behavior) {
    this.behavior = behavior;
    this.targetPosition = null;
    this.waitTime = 0;
  }

  /**
   * Set patrol points
   */
  setPatrolPoints(points) {
    this.patrolPoints = points;
    this.patrolIndex = 0;
  }
}

export default CharacterAI;
