/**
 * Engine Entry Point
 * JSON-driven FPS движок на Babylon.js
 */

import { Engine } from './core/Engine.js';
import { Logger } from './utils/Logger.js';

// Engine instance
let engine = null;

/**
 * Initialize and start the game
 */
async function start() {
  Logger.info('MAIN', 'Starting game engine...');

  try {
    // Create engine
    engine = new Engine('renderCanvas');

    // Initialize
    await engine.init();

    // Start game from manifest
    await engine.start('/game.json');

    Logger.info('MAIN', 'Game started successfully');
    Logger.info('MAIN', 'Controls: WASD - move, Shift - run, Mouse - look, ESC - release cursor');

  } catch (err) {
    Logger.error('MAIN', 'Failed to start game:', err);
    console.error(err);

    // Show error to user
    const canvas = document.getElementById('renderCanvas');
    if (canvas) {
      canvas.style.display = 'none';
    }

    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#f00;font-size:20px;text-align:center;';
    errorDiv.innerHTML = `<h2>Failed to start game</h2><p>${err.message}</p>`;
    document.body.appendChild(errorDiv);
  }
}

// Export for external access
window.GameEngine = {
  get engine() { return engine; },
  start
};

// Auto-start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

export { engine, start };
