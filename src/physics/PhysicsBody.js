/**
 * PhysicsBody - Простая физика для подвижных объектов
 */

import { Vector3 } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { Logger } from '../utils/Logger.js';

export class PhysicsBody {
  constructor(mesh, options = {}) {
    this.mesh = mesh;
    this.mass = options.mass || 1;
    this.friction = options.friction || 0.85;
    this.bounciness = options.bounciness || 0.2;
    this.isStatic = options.isStatic || false;

    // Velocity
    this.velocity = new Vector3(0, 0, 0);

    // Gravity
    this.useGravity = options.useGravity !== false;
    this.gravity = 15;
    this.isGrounded = false;
    this.groundY = options.groundY || 0;

    // Collision shape
    this.type = options.type || 'box';
    this.radius = options.radius || 0.5;
    this.halfExtents = options.halfExtents || new Vector3(0.5, 0.5, 0.5);

    // Constraints
    this.canPush = options.canPush !== false;
    this.pushResistance = options.pushResistance || 0.5; // 0 = легко толкать, 1 = сложно
  }

  update(dt) {
    if (this.isStatic) return;

    // Apply gravity
    if (this.useGravity && !this.isGrounded) {
      this.velocity.y -= this.gravity * dt;
    }

    // Apply friction (horizontal)
    this.velocity.x *= this.friction;
    this.velocity.z *= this.friction;

    // Stop if very slow
    if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
    if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;

    // Move
    const pos = this.mesh.position;
    pos.x += this.velocity.x * dt;
    pos.y += this.velocity.y * dt;
    pos.z += this.velocity.z * dt;

    // Ground collision
    const minY = this.groundY + this.halfExtents.y;
    if (pos.y <= minY) {
      pos.y = minY;
      this.velocity.y = -this.velocity.y * this.bounciness;
      if (Math.abs(this.velocity.y) < 0.5) {
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    } else {
      this.isGrounded = false;
    }

    // Room bounds collision
    this.clampToRoom();
  }

  /**
   * Apply impulse (for pushing)
   */
  applyImpulse(impulse) {
    if (this.isStatic) return;

    const factor = 1 - this.pushResistance;
    this.velocity.x += (impulse.x / this.mass) * factor;
    this.velocity.z += (impulse.z / this.mass) * factor;

    // Small upward push
    if (this.isGrounded && impulse.lengthSquared() > 0.1) {
      this.velocity.y += 1.5;
      this.isGrounded = false;
    }
  }

  /**
   * Check collision with point (player position)
   */
  checkCollisionWithPoint(point, radius) {
    const pos = this.mesh.position;

    if (this.type === 'cylinder' || this.type === 'sphere') {
      // Circular collision
      const dx = point.x - pos.x;
      const dz = point.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = this.radius + radius;

      if (dist < minDist && dist > 0) {
        return {
          collision: true,
          penetration: minDist - dist,
          normal: new Vector3(dx / dist, 0, dz / dist)
        };
      }
    } else {
      // Box collision (AABB)
      const minX = pos.x - this.halfExtents.x - radius;
      const maxX = pos.x + this.halfExtents.x + radius;
      const minZ = pos.z - this.halfExtents.z - radius;
      const maxZ = pos.z + this.halfExtents.z + radius;

      if (point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ) {
        // Calculate penetration
        const dxL = point.x - minX;
        const dxR = maxX - point.x;
        const dzT = point.z - minZ;
        const dzB = maxZ - point.z;
        const minPen = Math.min(dxL, dxR, dzT, dzB);

        let normal = new Vector3(0, 0, 0);
        if (minPen === dxL) normal.x = -1;
        else if (minPen === dxR) normal.x = 1;
        else if (minPen === dzT) normal.z = -1;
        else normal.z = 1;

        return {
          collision: true,
          penetration: minPen,
          normal: normal
        };
      }
    }

    return { collision: false };
  }

  /**
   * Clamp to room bounds
   */
  clampToRoom() {
    const bounds = GameState.collisionBounds;
    if (!bounds) return;

    const pos = this.mesh.position;
    const hx = this.halfExtents.x;
    const hz = this.halfExtents.z;

    // Bounce off walls
    if (pos.x - hx < bounds.minX) {
      pos.x = bounds.minX + hx;
      this.velocity.x = Math.abs(this.velocity.x) * this.bounciness;
    }
    if (pos.x + hx > bounds.maxX) {
      pos.x = bounds.maxX - hx;
      this.velocity.x = -Math.abs(this.velocity.x) * this.bounciness;
    }
    if (pos.z - hz < bounds.minZ) {
      pos.z = bounds.minZ + hz;
      this.velocity.z = Math.abs(this.velocity.z) * this.bounciness;
    }
    if (pos.z + hz > bounds.maxZ) {
      pos.z = bounds.maxZ - hz;
      this.velocity.z = -Math.abs(this.velocity.z) * this.bounciness;
    }
  }
}

/**
 * PhysicsWorld - Manages all physics bodies
 */
export class PhysicsWorld {
  constructor() {
    this.bodies = new Map();
  }

  addBody(id, body) {
    this.bodies.set(id, body);
    Logger.debug('PHYSICS', `Added physics body: ${id}`);
  }

  removeBody(id) {
    this.bodies.delete(id);
  }

  clear() {
    this.bodies.clear();
  }

  update(dt) {
    // Update all bodies
    for (const [id, body] of this.bodies) {
      body.update(dt);
    }

    // Resolve collisions between physics bodies
    this.resolveBodyCollisions();
  }

  /**
   * Check and resolve collisions between physics bodies
   */
  resolveBodyCollisions() {
    const bodiesArray = Array.from(this.bodies.values());
    const count = bodiesArray.length;

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const bodyA = bodiesArray[i];
        const bodyB = bodiesArray[j];

        if (bodyA.isStatic && bodyB.isStatic) continue;

        const collision = this.checkBodyCollision(bodyA, bodyB);
        if (collision.collides) {
          this.separateBodies(bodyA, bodyB, collision);
        }
      }
    }
  }

  /**
   * Check collision between two bodies
   */
  checkBodyCollision(bodyA, bodyB) {
    const posA = bodyA.mesh.position;
    const posB = bodyB.mesh.position;

    // Both cylinders/spheres - circle collision
    if ((bodyA.type === 'cylinder' || bodyA.type === 'sphere') &&
        (bodyB.type === 'cylinder' || bodyB.type === 'sphere')) {
      const dx = posB.x - posA.x;
      const dz = posB.z - posA.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = bodyA.radius + bodyB.radius;

      if (dist < minDist && dist > 0.001) {
        return {
          collides: true,
          penetration: minDist - dist,
          normal: new Vector3(dx / dist, 0, dz / dist)
        };
      }
    }
    // Both boxes - AABB collision
    else if (bodyA.type === 'box' && bodyB.type === 'box') {
      const minAX = posA.x - bodyA.halfExtents.x;
      const maxAX = posA.x + bodyA.halfExtents.x;
      const minAZ = posA.z - bodyA.halfExtents.z;
      const maxAZ = posA.z + bodyA.halfExtents.z;

      const minBX = posB.x - bodyB.halfExtents.x;
      const maxBX = posB.x + bodyB.halfExtents.x;
      const minBZ = posB.z - bodyB.halfExtents.z;
      const maxBZ = posB.z + bodyB.halfExtents.z;

      // Check overlap
      if (maxAX > minBX && minAX < maxBX && maxAZ > minBZ && minAZ < maxBZ) {
        // Calculate penetration on each axis
        const overlapX = Math.min(maxAX - minBX, maxBX - minAX);
        const overlapZ = Math.min(maxAZ - minBZ, maxBZ - minAZ);

        if (overlapX < overlapZ) {
          const sign = posB.x > posA.x ? 1 : -1;
          return {
            collides: true,
            penetration: overlapX,
            normal: new Vector3(sign, 0, 0)
          };
        } else {
          const sign = posB.z > posA.z ? 1 : -1;
          return {
            collides: true,
            penetration: overlapZ,
            normal: new Vector3(0, 0, sign)
          };
        }
      }
    }
    // Mixed: box vs cylinder - simplified as circle vs AABB
    else {
      const boxBody = bodyA.type === 'box' ? bodyA : bodyB;
      const circBody = bodyA.type === 'box' ? bodyB : bodyA;
      const boxPos = boxBody.mesh.position;
      const circPos = circBody.mesh.position;

      // Find closest point on box to circle center
      const closestX = Math.max(boxPos.x - boxBody.halfExtents.x,
                       Math.min(circPos.x, boxPos.x + boxBody.halfExtents.x));
      const closestZ = Math.max(boxPos.z - boxBody.halfExtents.z,
                       Math.min(circPos.z, boxPos.z + boxBody.halfExtents.z));

      const dx = circPos.x - closestX;
      const dz = circPos.z - closestZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < circBody.radius && dist > 0.001) {
        const normal = bodyA.type === 'box'
          ? new Vector3(dx / dist, 0, dz / dist)
          : new Vector3(-dx / dist, 0, -dz / dist);
        return {
          collides: true,
          penetration: circBody.radius - dist,
          normal: normal
        };
      }
    }

    return { collides: false };
  }

  /**
   * Separate two colliding bodies
   */
  separateBodies(bodyA, bodyB, collision) {
    const { penetration, normal } = collision;

    // Calculate mass ratio for separation
    const totalMass = bodyA.mass + bodyB.mass;
    const ratioA = bodyB.mass / totalMass;
    const ratioB = bodyA.mass / totalMass;

    // Separate bodies
    if (!bodyA.isStatic) {
      bodyA.mesh.position.x -= normal.x * penetration * ratioA;
      bodyA.mesh.position.z -= normal.z * penetration * ratioA;
    }
    if (!bodyB.isStatic) {
      bodyB.mesh.position.x += normal.x * penetration * ratioB;
      bodyB.mesh.position.z += normal.z * penetration * ratioB;
    }

    // Exchange momentum (simplified elastic collision)
    const relVelX = bodyB.velocity.x - bodyA.velocity.x;
    const relVelZ = bodyB.velocity.z - bodyA.velocity.z;
    const relVelNormal = relVelX * normal.x + relVelZ * normal.z;

    // Only resolve if objects are moving towards each other
    if (relVelNormal < 0) {
      const restitution = Math.min(bodyA.bounciness, bodyB.bounciness);
      const impulse = -(1 + restitution) * relVelNormal / totalMass;

      if (!bodyA.isStatic) {
        bodyA.velocity.x -= impulse * bodyB.mass * normal.x;
        bodyA.velocity.z -= impulse * bodyB.mass * normal.z;
      }
      if (!bodyB.isStatic) {
        bodyB.velocity.x += impulse * bodyA.mass * normal.x;
        bodyB.velocity.z += impulse * bodyA.mass * normal.z;
      }
    }
  }

  /**
   * Check player collision with all physics bodies
   * Returns adjusted position and applies push to objects
   */
  resolvePlayerCollision(prevPos, currentPos, playerRadius, playerVelocity) {
    let x = currentPos.x;
    let z = currentPos.z;

    for (const [id, body] of this.bodies) {
      const result = body.checkCollisionWithPoint(new Vector3(x, currentPos.y, z), playerRadius);

      if (result.collision) {
        // Push the object
        if (body.canPush && playerVelocity) {
          const pushForce = new Vector3(
            playerVelocity.x * 0.5,
            0,
            playerVelocity.z * 0.5
          );
          body.applyImpulse(pushForce);
        }

        // Push player out
        x += result.normal.x * result.penetration;
        z += result.normal.z * result.penetration;
      }
    }

    return new Vector3(x, currentPos.y, z);
  }

  getBody(id) {
    return this.bodies.get(id);
  }
}

export default PhysicsBody;
