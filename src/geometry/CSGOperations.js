/**
 * CSGOperations - Constructive Solid Geometry operations
 */

import { CSG } from "babylonjs";
import { GameState } from '../core/GameState.js';

export class CSGOperations {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * Union of two meshes (A + B)
   */
  union(meshA, meshB, resultId) {
    const csgA = CSG.FromMesh(meshA);
    const csgB = CSG.FromMesh(meshB);
    const result = csgA.union(csgB);

    const mesh = result.toMesh(resultId, null, this.scene);
    GameState.meshes.set(resultId, mesh);

    return mesh;
  }

  /**
   * Subtract mesh B from mesh A (A - B)
   */
  subtract(meshA, meshB, resultId) {
    const csgA = CSG.FromMesh(meshA);
    const csgB = CSG.FromMesh(meshB);
    const result = csgA.subtract(csgB);

    const mesh = result.toMesh(resultId, null, this.scene);
    GameState.meshes.set(resultId, mesh);

    return mesh;
  }

  /**
   * Intersection of two meshes (A ∩ B)
   */
  intersect(meshA, meshB, resultId) {
    const csgA = CSG.FromMesh(meshA);
    const csgB = CSG.FromMesh(meshB);
    const result = csgA.intersect(csgB);

    const mesh = result.toMesh(resultId, null, this.scene);
    GameState.meshes.set(resultId, mesh);

    return mesh;
  }

  /**
   * Execute CSG operation from definition
   * @param {object} def - { operation: 'union'|'subtract'|'intersect', operands: ['meshA', 'meshB'], resultId: 'result' }
   */
  executeFromDefinition(def) {
    const { operation, operands, resultId } = def;

    if (!operands || operands.length < 2) {
      console.error('CSG operation requires at least 2 operands');
      return null;
    }

    // Get meshes by ID
    const meshA = GameState.getMesh(operands[0]);
    const meshB = GameState.getMesh(operands[1]);

    if (!meshA || !meshB) {
      console.error('CSG operand mesh not found:', operands);
      return null;
    }

    let result;
    switch (operation) {
      case 'union':
        result = this.union(meshA, meshB, resultId);
        break;
      case 'subtract':
        result = this.subtract(meshA, meshB, resultId);
        break;
      case 'intersect':
        result = this.intersect(meshA, meshB, resultId);
        break;
      default:
        console.error('Unknown CSG operation:', operation);
        return null;
    }

    // If more than 2 operands, chain operations
    if (operands.length > 2) {
      for (let i = 2; i < operands.length; i++) {
        const nextMesh = GameState.getMesh(operands[i]);
        if (nextMesh) {
          const tempId = `${resultId}_temp_${i}`;
          result = this[operation](result, nextMesh, tempId);
        }
      }
    }

    return result;
  }

  /**
   * Create a mesh with a hole (subtract)
   * Useful for doorways, windows, etc.
   */
  createWithHole(baseMesh, holeMesh, resultId) {
    return this.subtract(baseMesh, holeMesh, resultId);
  }
}

export default CSGOperations;
