/**
 * AnimationController - Procedural animations for humanoids
 */

import { Vector3 } from "babylonjs";
import { GameState } from '../core/GameState.js';

export class AnimationController {
  constructor() {
    this.animations = new Map();
  }

  /**
   * Start animation on a character
   */
  play(characterId, animationType, options = {}) {
    const character = GameState.characters.get(characterId);
    if (!character) return;

    const animState = {
      type: animationType,
      time: 0,
      speed: options.speed || 1,
      loop: options.loop !== false,
      onComplete: options.onComplete,
      ...options
    };

    this.animations.set(characterId, animState);
  }

  /**
   * Stop animation on a character
   */
  stop(characterId) {
    this.animations.delete(characterId);
  }

  /**
   * Update all animations
   */
  update(dt) {
    for (const [characterId, animState] of this.animations) {
      const character = GameState.characters.get(characterId);
      if (!character) {
        this.animations.delete(characterId);
        continue;
      }

      animState.time += dt * animState.speed;

      switch (animState.type) {
        case 'idle':
          this.animateIdle(character, animState);
          break;
        case 'walk':
          this.animateWalk(character, animState);
          break;
        case 'run':
          this.animateRun(character, animState);
          break;
        case 'attack':
          this.animateAttack(character, animState);
          break;
        case 'death':
          this.animateDeath(character, animState);
          break;
        case 'hit':
          this.animateHit(character, animState);
          break;
      }
    }
  }

  /**
   * Idle animation - subtle breathing and swaying
   */
  animateIdle(character, state) {
    const t = state.time;
    const parts = character.parts;

    // Breathing - torso moves up/down slightly
    if (parts.torso) {
      const breathOffset = Math.sin(t * 2) * 0.005;
      parts.torso.position.y += breathOffset;
    }

    // Head subtle movement
    if (parts.head) {
      parts.head.rotation.y = Math.sin(t * 0.5) * 0.05;
      parts.head.rotation.x = Math.sin(t * 0.7) * 0.02;
    }

    // Arms slight swing
    if (parts.leftUpperArm) {
      parts.leftUpperArm.rotation.x = Math.sin(t * 0.8) * 0.03;
    }
    if (parts.rightUpperArm) {
      parts.rightUpperArm.rotation.x = Math.sin(t * 0.8 + 0.5) * 0.03;
    }
  }

  /**
   * Walk animation
   */
  animateWalk(character, state) {
    const t = state.time * 4; // Walking speed
    const parts = character.parts;
    const swing = 0.4; // Leg swing angle
    const armSwing = 0.25;

    // Legs
    if (parts.leftUpperLeg) {
      parts.leftUpperLeg.rotation.x = Math.sin(t) * swing;
    }
    if (parts.rightUpperLeg) {
      parts.rightUpperLeg.rotation.x = Math.sin(t + Math.PI) * swing;
    }
    if (parts.leftLowerLeg) {
      parts.leftLowerLeg.rotation.x = Math.max(0, Math.sin(t + 0.5)) * swing * 0.5;
    }
    if (parts.rightLowerLeg) {
      parts.rightLowerLeg.rotation.x = Math.max(0, Math.sin(t + Math.PI + 0.5)) * swing * 0.5;
    }

    // Arms swing opposite to legs
    if (parts.leftUpperArm) {
      parts.leftUpperArm.rotation.x = Math.sin(t + Math.PI) * armSwing;
    }
    if (parts.rightUpperArm) {
      parts.rightUpperArm.rotation.x = Math.sin(t) * armSwing;
    }

    // Body bob
    if (parts.torso) {
      parts.torso.position.y += Math.abs(Math.sin(t * 2)) * 0.02;
    }

    // Head stays relatively stable
    if (parts.head) {
      parts.head.rotation.x = 0;
    }
  }

  /**
   * Run animation - faster, more exaggerated
   */
  animateRun(character, state) {
    const t = state.time * 7; // Faster
    const parts = character.parts;
    const swing = 0.7;
    const armSwing = 0.5;

    // Legs - more swing
    if (parts.leftUpperLeg) {
      parts.leftUpperLeg.rotation.x = Math.sin(t) * swing;
    }
    if (parts.rightUpperLeg) {
      parts.rightUpperLeg.rotation.x = Math.sin(t + Math.PI) * swing;
    }
    if (parts.leftLowerLeg) {
      parts.leftLowerLeg.rotation.x = Math.max(0, Math.sin(t + 0.5)) * swing * 0.7;
    }
    if (parts.rightLowerLeg) {
      parts.rightLowerLeg.rotation.x = Math.max(0, Math.sin(t + Math.PI + 0.5)) * swing * 0.7;
    }

    // Arms pump
    if (parts.leftUpperArm) {
      parts.leftUpperArm.rotation.x = Math.sin(t + Math.PI) * armSwing;
      parts.leftUpperArm.rotation.z = -0.3; // Arms bent
    }
    if (parts.rightUpperArm) {
      parts.rightUpperArm.rotation.x = Math.sin(t) * armSwing;
      parts.rightUpperArm.rotation.z = 0.3;
    }
    if (parts.leftLowerArm) {
      parts.leftLowerArm.rotation.x = -0.5; // Bent elbow
    }
    if (parts.rightLowerArm) {
      parts.rightLowerArm.rotation.x = -0.5;
    }

    // Body leans forward and bobs
    if (parts.torso) {
      parts.torso.rotation.x = 0.1;
      parts.torso.position.y += Math.abs(Math.sin(t * 2)) * 0.03;
    }
  }

  /**
   * Attack animation - swing arm
   */
  animateAttack(character, state) {
    const t = state.time;
    const duration = state.duration || 0.5;
    const parts = character.parts;

    if (t >= duration) {
      // Animation complete
      if (!state.loop) {
        this.resetPose(character);
        if (state.onComplete) state.onComplete();
        this.animations.delete(character.id);
        return;
      }
      state.time = 0;
      return;
    }

    const progress = t / duration;

    // Right arm swing
    if (parts.rightUpperArm) {
      if (progress < 0.3) {
        // Wind up
        parts.rightUpperArm.rotation.x = -1.5 * (progress / 0.3);
        parts.rightUpperArm.rotation.z = 0.5 * (progress / 0.3);
      } else if (progress < 0.6) {
        // Swing forward
        const swingProgress = (progress - 0.3) / 0.3;
        parts.rightUpperArm.rotation.x = -1.5 + 2.5 * swingProgress;
        parts.rightUpperArm.rotation.z = 0.5 - 0.5 * swingProgress;
      } else {
        // Follow through
        const followProgress = (progress - 0.6) / 0.4;
        parts.rightUpperArm.rotation.x = 1 - 1 * followProgress;
        parts.rightUpperArm.rotation.z = 0;
      }
    }

    // Body rotation for power
    if (parts.torso) {
      if (progress < 0.3) {
        parts.torso.rotation.y = -0.2 * (progress / 0.3);
      } else if (progress < 0.6) {
        const swingProgress = (progress - 0.3) / 0.3;
        parts.torso.rotation.y = -0.2 + 0.4 * swingProgress;
      } else {
        const followProgress = (progress - 0.6) / 0.4;
        parts.torso.rotation.y = 0.2 - 0.2 * followProgress;
      }
    }
  }

  /**
   * Death animation - ragdoll-like fall
   */
  animateDeath(character, state) {
    const t = state.time;
    const duration = 1.0;
    const parts = character.parts;

    if (t >= duration) {
      if (state.onComplete) state.onComplete();
      this.animations.delete(character.id);
      return;
    }

    const progress = t / duration;
    const fall = Math.min(1, progress * 2);

    // Whole body falls backward
    character.root.rotation.x = fall * 1.5;
    character.root.position.y = -fall * 0.8;

    // Arms flail
    if (parts.leftUpperArm) {
      parts.leftUpperArm.rotation.x = -fall * 1;
      parts.leftUpperArm.rotation.z = -fall * 0.5;
    }
    if (parts.rightUpperArm) {
      parts.rightUpperArm.rotation.x = -fall * 1.2;
      parts.rightUpperArm.rotation.z = fall * 0.5;
    }

    // Head falls back
    if (parts.head) {
      parts.head.rotation.x = -fall * 0.8;
    }

    // Legs buckle
    if (parts.leftUpperLeg) {
      parts.leftUpperLeg.rotation.x = fall * 0.5;
    }
    if (parts.rightUpperLeg) {
      parts.rightUpperLeg.rotation.x = fall * 0.3;
    }
  }

  /**
   * Hit reaction animation
   */
  animateHit(character, state) {
    const t = state.time;
    const duration = 0.3;
    const parts = character.parts;

    if (t >= duration) {
      this.resetPose(character);
      if (state.onComplete) state.onComplete();
      this.animations.delete(character.id);
      return;
    }

    const progress = t / duration;

    // Flinch backward
    const flinch = Math.sin(progress * Math.PI);

    if (parts.torso) {
      parts.torso.rotation.x = -flinch * 0.2;
    }

    if (parts.head) {
      parts.head.rotation.x = -flinch * 0.3;
    }

    // Raise arms defensively
    if (parts.leftUpperArm) {
      parts.leftUpperArm.rotation.x = -flinch * 0.5;
    }
    if (parts.rightUpperArm) {
      parts.rightUpperArm.rotation.x = -flinch * 0.5;
    }
  }

  /**
   * Reset character to default pose
   */
  resetPose(character) {
    const parts = character.parts;

    for (const [name, mesh] of Object.entries(parts)) {
      if (mesh) {
        mesh.rotation.x = 0;
        mesh.rotation.y = 0;
        mesh.rotation.z = 0;
      }
    }

    character.root.rotation.x = 0;
    character.root.position.y = character.position.y || 0;
  }
}

export default AnimationController;
