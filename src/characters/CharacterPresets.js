/**
 * CharacterPresets - Preset configurations for different character types
 */

export const CharacterPresets = {
  // SUPERHOT style red mannequin - enemies
  mannequin_red: {
    height: 1.8,
    materials: {
      body: [0.9, 0.15, 0.15]
    },
    ai: {
      type: 'hostile',
      sightRange: 15,
      attackRange: 1.5,
      patrolSpeed: 2,
      chaseSpeed: 5
    }
  },

  // White mannequin - neutral/friendly
  mannequin_white: {
    height: 1.8,
    materials: {
      body: [0.95, 0.95, 0.95]
    },
    ai: {
      type: 'neutral'
    }
  },

  // Black mannequin - special enemy
  mannequin_black: {
    height: 1.9,
    materials: {
      body: [0.1, 0.1, 0.1]
    },
    ai: {
      type: 'hostile',
      sightRange: 20,
      attackRange: 2,
      patrolSpeed: 3,
      chaseSpeed: 7
    }
  },

  // Military soldier
  soldier: {
    height: 1.8,
    materials: {
      head: 'preset:skin_tan',
      neck: 'preset:skin_tan',
      torso: 'preset:camo_green',
      arms: 'preset:camo_green',
      hands: 'preset:skin_tan',
      pelvis: 'preset:fabric_black',
      legs: 'preset:fabric_black',
      feet: 'preset:fabric_black'
    },
    ai: {
      type: 'hostile',
      sightRange: 25,
      attackRange: 15,
      patrolSpeed: 2.5,
      chaseSpeed: 5,
      hasRangedAttack: true
    }
  },

  // Desert soldier
  soldier_desert: {
    height: 1.8,
    materials: {
      head: 'preset:skin_tan',
      neck: 'preset:skin_tan',
      torso: 'preset:camo_desert',
      arms: 'preset:camo_desert',
      hands: 'preset:skin_tan',
      pelvis: 'preset:fabric_black',
      legs: 'preset:fabric_black',
      feet: 'preset:fabric_black'
    },
    ai: {
      type: 'hostile',
      sightRange: 25,
      attackRange: 15,
      patrolSpeed: 2.5,
      chaseSpeed: 5
    }
  },

  // Combat robot
  robot: {
    height: 2.0,
    materials: {
      head: 'preset:metal_chrome',
      neck: 'preset:metal_dark',
      torso: 'preset:metal_dark',
      arms: 'preset:metal_chrome',
      hands: 'preset:metal_chrome',
      pelvis: 'preset:metal_dark',
      legs: 'preset:metal_dark',
      feet: 'preset:metal_dark'
    },
    ai: {
      type: 'hostile',
      sightRange: 30,
      attackRange: 2,
      patrolSpeed: 3,
      chaseSpeed: 6
    }
  },

  // Friendly robot
  robot_friendly: {
    height: 1.6,
    materials: {
      head: { color: [0.3, 0.6, 0.9], emissive: [0.1, 0.2, 0.4] },
      neck: 'preset:metal_chrome',
      torso: 'preset:metal_chrome',
      arms: 'preset:metal_chrome',
      hands: 'preset:metal_chrome',
      pelvis: 'preset:metal_chrome',
      legs: 'preset:metal_chrome',
      feet: 'preset:metal_chrome'
    },
    ai: {
      type: 'friendly'
    }
  },

  // Zombie
  zombie: {
    height: 1.75,
    proportions: {
      torsoHeight: 0.22, // Hunched
    },
    materials: {
      body: 'preset:skin_zombie'
    },
    ai: {
      type: 'hostile',
      sightRange: 10,
      attackRange: 1.2,
      patrolSpeed: 1,
      chaseSpeed: 3.5
    }
  },

  // Fast zombie
  zombie_runner: {
    height: 1.7,
    materials: {
      body: 'preset:skin_zombie'
    },
    ai: {
      type: 'hostile',
      sightRange: 15,
      attackRange: 1.2,
      patrolSpeed: 2,
      chaseSpeed: 7
    }
  },

  // Alien
  alien: {
    height: 1.9,
    proportions: {
      headRadius: 0.1,
      torsoHeight: 0.2,
      torsoWidth: 0.14
    },
    materials: {
      body: 'preset:skin_alien'
    },
    ai: {
      type: 'hostile',
      sightRange: 20,
      attackRange: 2,
      patrolSpeed: 2,
      chaseSpeed: 6
    }
  },

  // Civilian - neutral NPC
  civilian: {
    height: 1.75,
    materials: {
      head: 'preset:skin_light',
      neck: 'preset:skin_light',
      hands: 'preset:skin_light',
      torso: 'preset:fabric_blue',
      arms: 'preset:fabric_blue',
      pelvis: 'preset:fabric_black',
      legs: 'preset:fabric_black',
      feet: 'preset:fabric_black'
    },
    ai: {
      type: 'neutral',
      fleesOnDanger: true
    }
  },

  // Security guard
  guard: {
    height: 1.85,
    materials: {
      head: 'preset:skin_tan',
      neck: 'preset:skin_tan',
      hands: 'preset:skin_tan',
      torso: 'preset:fabric_black',
      arms: 'preset:fabric_black',
      pelvis: 'preset:fabric_black',
      legs: 'preset:fabric_black',
      feet: 'preset:fabric_black'
    },
    ai: {
      type: 'hostile',
      sightRange: 15,
      attackRange: 1.5,
      patrolSpeed: 2,
      chaseSpeed: 4.5
    }
  },

  // Scientist
  scientist: {
    height: 1.75,
    materials: {
      head: 'preset:skin_light',
      neck: 'preset:skin_light',
      hands: 'preset:skin_light',
      torso: [0.9, 0.9, 0.95], // White coat
      arms: [0.9, 0.9, 0.95],
      pelvis: 'preset:fabric_black',
      legs: 'preset:fabric_black',
      feet: 'preset:fabric_black'
    },
    ai: {
      type: 'neutral',
      fleesOnDanger: true
    }
  },

  // Target dummy for shooting range
  target: {
    height: 1.8,
    materials: {
      body: [0.95, 0.95, 0.9]
    },
    ai: {
      type: 'static'
    }
  },

  // Training dummy - takes hits
  training_dummy: {
    height: 1.8,
    materials: {
      body: [0.7, 0.5, 0.3]
    },
    ai: {
      type: 'static',
      invulnerable: true
    }
  }
};

/**
 * Get preset by name
 */
export function getPreset(name) {
  return CharacterPresets[name] || CharacterPresets.mannequin_red;
}

/**
 * List all available presets
 */
export function listPresets() {
  return Object.keys(CharacterPresets);
}

export default CharacterPresets;
