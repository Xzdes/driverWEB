/**
 * CollisionSystem - Система коллизий
 */

import { Vector3 } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { Logger } from '../utils/Logger.js';

export class CollisionSystem {
  constructor() {
    // Nothing to initialize
  }

  /**
   * Clamp position to room bounds, respecting portal openings
   */
  clampToRoom(prevPos, targetPos) {
    const bounds = GameState.collisionBounds;
    let x = targetPos.x;
    let z = targetPos.z;

    // North wall (positive Z)
    if (z > bounds.maxZ) {
      const canPass = bounds.openings.north.some(o => x >= o.x1 && x <= o.x2);
      if (!canPass) z = bounds.maxZ;
    }

    // South wall (negative Z)
    if (z < bounds.minZ) {
      const canPass = bounds.openings.south.some(o => x >= o.x1 && x <= o.x2);
      if (!canPass) z = bounds.minZ;
    }

    // East wall (positive X)
    if (x > bounds.maxX) {
      const canPass = bounds.openings.east.some(o => z >= o.z1 && z <= o.z2);
      if (!canPass) x = bounds.maxX;
    }

    // West wall (negative X)
    if (x < bounds.minX) {
      const canPass = bounds.openings.west.some(o => z >= o.z1 && z <= o.z2);
      if (!canPass) x = bounds.minX;
    }

    return new Vector3(x, targetPos.y, z);
  }

  /**
   * Sweep against solid objects (AABB and cylinder collision)
   */
  sweepSolids(prevPos, currentPos) {
    const solids = GameState.collisionBounds.solids;
    let x = currentPos.x;
    let z = currentPos.z;

    for (const solid of solids) {
      if (solid.type === 'cylinder') {
        // Circular collision for cylinders
        const dx = x - solid.x;
        const dz = z - solid.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < solid.radius && dist > 0) {
          // Push out
          x = solid.x + (dx / dist) * solid.radius;
          z = solid.z + (dz / dist) * solid.radius;
        }
      } else {
        // AABB collision for boxes
        if (x >= solid.minX && x <= solid.maxX && z >= solid.minZ && z <= solid.maxZ) {
          const dxL = Math.abs(x - solid.minX);
          const dxR = Math.abs(solid.maxX - x);
          const dzT = Math.abs(z - solid.minZ);
          const dzB = Math.abs(solid.maxZ - z);
          const minPen = Math.min(dxL, dxR, dzT, dzB);

          if (minPen === dxL) x = solid.minX;
          else if (minPen === dxR) x = solid.maxX;
          else if (minPen === dzT) z = solid.minZ;
          else z = solid.maxZ;
        }
      }
    }

    return new Vector3(x, currentPos.y, z);
  }

  /**
   * Setup collision bounds from room data
   */
  static setupFromRoom(room, playerRadius) {
    const bounds = room.bounds || { center: room.center, size: room.size };
    const [cx, cy, cz] = bounds.center;
    const [sx, sy, sz] = bounds.size;
    const hw = sx / 2;
    const hd = sz / 2;
    const R = playerRadius;

    const collBounds = GameState.collisionBounds;
    collBounds.minX = cx - hw + R;
    collBounds.maxX = cx + hw - R;
    collBounds.minZ = cz - hd + R;
    collBounds.maxZ = cz + hd - R;

    // Reset openings
    collBounds.openings = { north: [], south: [], west: [], east: [] };

    // Setup portal openings
    for (const portal of room.portals || []) {
      const rect = portal.rect || { center: [0, 1.1], size: [1.6, 2.2] };
      const halfWidth = rect.size[0] / 2;

      if (portal.wall === 'north' || portal.wall === 'south') {
        const xCenter = cx + rect.center[0];
        collBounds.openings[portal.wall].push({
          x1: xCenter - halfWidth,
          x2: xCenter + halfWidth
        });
      } else if (portal.wall === 'east' || portal.wall === 'west') {
        const zCenter = cz + rect.center[0];
        collBounds.openings[portal.wall].push({
          z1: zCenter - halfWidth,
          z2: zCenter + halfWidth
        });
      }
    }

    // Setup solid objects
    collBounds.solids = [];
    const objects = room.geometry || room.objects || [];

    for (const obj of objects) {
      if (!obj.collision && !obj.solid) continue;

      const pos = obj.position || obj.center;
      const size = obj.size;
      if (!pos || !size) continue;

      if (obj.type === 'cylinder') {
        // Cylinder collision (circular)
        const radius = size[0] / 2 + R; // size[0] is diameter for cylinders
        collBounds.solids.push({
          type: 'cylinder',
          x: pos[0],
          z: pos[2],
          radius: radius
        });
      } else {
        // Box collision (AABB)
        const hx = size[0] / 2 + R;
        const hz = size[2] / 2 + R;

        collBounds.solids.push({
          type: 'box',
          minX: pos[0] - hx,
          maxX: pos[0] + hx,
          minZ: pos[2] - hz,
          maxZ: pos[2] + hz
        });
      }
    }

    Logger.info('PHYSICS', `Collision setup: ${collBounds.solids.length} solids`);
  }
}

export default CollisionSystem;
