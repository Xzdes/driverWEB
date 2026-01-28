/**
 * AudioEngine - Web Audio API wrapper
 */

import { GameState } from '../core/GameState.js';
import { EventBus, Events } from '../core/EventBus.js';
import { Logger } from '../utils/Logger.js';

export class AudioEngine {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.ambientGain = null;
    this.sounds = new Map();
    this.activeSources = new Map();

    this.init();
  }

  init() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();

      // Master gain
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);

      // Category gains
      this.sfxGain = this.context.createGain();
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.context.createGain();
      this.musicGain.connect(this.masterGain);

      this.ambientGain = this.context.createGain();
      this.ambientGain.connect(this.masterGain);

      // Handle user gesture to resume context
      document.addEventListener('click', () => this.resume(), { once: true });
      document.addEventListener('keydown', () => this.resume(), { once: true });

      Logger.info('AUDIO', 'Audio engine initialized');
    } catch (e) {
      Logger.error('AUDIO', 'Failed to initialize audio:', e);
    }
  }

  async resume() {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
      Logger.info('AUDIO', 'Audio context resumed');
    }
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  /**
   * Set SFX volume (0-1)
   */
  setSFXVolume(value) {
    if (this.sfxGain) {
      this.sfxGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  /**
   * Set ambient volume (0-1)
   */
  setAmbientVolume(value) {
    if (this.ambientGain) {
      this.ambientGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  /**
   * Register a sound generator function
   */
  registerSound(id, generator) {
    this.sounds.set(id, generator);
    GameState.sounds.set(id, { id, generator });
  }

  /**
   * Play a registered sound
   */
  play(id, options = {}) {
    const { volume = 1.0, loop = false, category = 'sfx' } = options;

    const generator = this.sounds.get(id);
    if (!generator) {
      Logger.warn('AUDIO', `Sound not found: ${id}`);
      return null;
    }

    // Get the appropriate gain node
    let outputGain;
    switch (category) {
      case 'music':
        outputGain = this.musicGain;
        break;
      case 'ambient':
        outputGain = this.ambientGain;
        break;
      default:
        outputGain = this.sfxGain;
    }

    // Create a gain node for this instance
    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(outputGain);

    // Generate and play the sound
    const source = generator(this.context, gainNode, { loop });

    if (source) {
      const sourceId = `${id}_${Date.now()}`;
      this.activeSources.set(sourceId, { source, gainNode });

      if (source.onended) {
        const originalOnEnded = source.onended;
        source.onended = () => {
          originalOnEnded();
          this.activeSources.delete(sourceId);
        };
      } else {
        source.onended = () => {
          this.activeSources.delete(sourceId);
        };
      }

      EventBus.emit(Events.SOUND_PLAY, { id, sourceId });
      return sourceId;
    }

    return null;
  }

  /**
   * Stop a playing sound
   */
  stop(sourceId) {
    const entry = this.activeSources.get(sourceId);
    if (entry && entry.source) {
      try {
        entry.source.stop();
      } catch (e) {
        // Already stopped
      }
      this.activeSources.delete(sourceId);
      EventBus.emit(Events.SOUND_STOP, { sourceId });
    }
  }

  /**
   * Stop all sounds
   */
  stopAll() {
    for (const [sourceId, entry] of this.activeSources) {
      try {
        entry.source.stop();
      } catch (e) {
        // Already stopped
      }
    }
    this.activeSources.clear();
  }

  /**
   * Create a noise buffer
   */
  createNoiseBuffer(duration, type = 'white') {
    const sampleRate = this.context.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    switch (type) {
      case 'white':
        for (let i = 0; i < length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        break;

      case 'pink':
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
        break;

      case 'brown':
        let lastOut = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
        break;
    }

    return buffer;
  }

  /**
   * Dispose audio engine
   */
  dispose() {
    this.stopAll();
    if (this.context) {
      this.context.close();
    }
    Logger.info('AUDIO', 'Audio engine disposed');
  }
}

export default AudioEngine;
