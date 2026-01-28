/**
 * SoundSynthesizer - Procedural sound synthesis
 */

export class SoundSynthesizer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.context = audioEngine.context;
  }

  /**
   * Create an ADSR envelope
   */
  createEnvelope(gainNode, options = {}) {
    const {
      attack = 0.01,
      decay = 0.1,
      sustain = 0.5,
      release = 0.2,
      peakLevel = 1.0
    } = options;

    const now = this.context.currentTime;
    const gain = gainNode.gain;

    gain.setValueAtTime(0, now);
    gain.linearRampToValueAtTime(peakLevel, now + attack);
    gain.linearRampToValueAtTime(peakLevel * sustain, now + attack + decay);

    return {
      triggerRelease: (time = this.context.currentTime) => {
        gain.cancelScheduledValues(time);
        gain.setValueAtTime(gain.value, time);
        gain.linearRampToValueAtTime(0, time + release);
      }
    };
  }

  /**
   * Create oscillator with envelope
   */
  createTone(options = {}) {
    const {
      frequency = 440,
      type = 'sine', // sine, square, sawtooth, triangle
      duration = 0.5,
      attack = 0.01,
      decay = 0.1,
      sustain = 0.5,
      release = 0.1
    } = options;

    return (context, output) => {
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency;

      const gainNode = context.createGain();
      osc.connect(gainNode);
      gainNode.connect(output);

      // Apply envelope
      const now = context.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + attack);
      gainNode.gain.linearRampToValueAtTime(sustain, now + attack + decay);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      osc.start(now);
      osc.stop(now + duration + 0.01);

      return osc;
    };
  }

  /**
   * Create noise burst (for impacts, footsteps)
   */
  createNoiseBurst(options = {}) {
    const {
      duration = 0.1,
      filterType = 'lowpass',
      filterFreq = 400,
      attack = 0.005,
      decay = 0.1
    } = options;

    return (context, output) => {
      const buffer = this.audioEngine.createNoiseBuffer(duration, 'white');
      const source = context.createBufferSource();
      source.buffer = buffer;

      const filter = context.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterFreq;

      const gainNode = context.createGain();

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(output);

      // Envelope
      const now = context.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + decay);

      source.start(now);
      source.stop(now + duration);

      return source;
    };
  }

  /**
   * Create impact sound (thump + noise)
   */
  createImpact(options = {}) {
    const {
      lowFreq = 80,
      highFreq = 200,
      duration = 0.15
    } = options;

    return (context, output) => {
      const now = context.currentTime;

      // Low frequency thump
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(highFreq, now);
      osc.frequency.exponentialRampToValueAtTime(lowFreq, now + 0.05);

      const oscGain = context.createGain();
      oscGain.gain.setValueAtTime(0.8, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(oscGain);
      oscGain.connect(output);

      // Noise burst
      const noise = this.audioEngine.createNoiseBuffer(0.05, 'white');
      const noiseSource = context.createBufferSource();
      noiseSource.buffer = noise;

      const noiseFilter = context.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 500;

      const noiseGain = context.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(output);

      osc.start(now);
      osc.stop(now + duration);
      noiseSource.start(now);
      noiseSource.stop(now + 0.05);

      return osc;
    };
  }

  /**
   * Create beep sound (for UI, alerts)
   */
  createBeep(options = {}) {
    const {
      frequency = 800,
      duration = 0.1,
      type = 'sine'
    } = options;

    return this.createTone({ frequency, duration, type, attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.05 });
  }

  /**
   * Create whoosh sound (for movement, swings)
   */
  createWhoosh(options = {}) {
    const {
      duration = 0.3,
      startFreq = 200,
      endFreq = 800
    } = options;

    return (context, output) => {
      const now = context.currentTime;

      const noise = this.audioEngine.createNoiseBuffer(duration, 'pink');
      const source = context.createBufferSource();
      source.buffer = noise;

      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration * 0.5);
      filter.frequency.exponentialRampToValueAtTime(startFreq, now + duration);
      filter.Q.value = 2;

      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + duration * 0.2);
      gain.gain.linearRampToValueAtTime(0.5, now + duration * 0.6);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      source.start(now);
      source.stop(now + duration);

      return source;
    };
  }

  /**
   * Create ambient drone
   */
  createDrone(options = {}) {
    const {
      baseFreq = 55,
      harmonics = [1, 2, 3, 4],
      modRate = 0.1
    } = options;

    return (context, output, { loop = true }) => {
      const now = context.currentTime;

      const masterGain = context.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(output);

      // LFO for subtle modulation
      const lfo = context.createOscillator();
      lfo.frequency.value = modRate;
      const lfoGain = context.createGain();
      lfoGain.gain.value = 5;
      lfo.connect(lfoGain);

      // Create harmonics
      const oscs = harmonics.map((h, i) => {
        const osc = context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = baseFreq * h;
        lfoGain.connect(osc.frequency);

        const gain = context.createGain();
        gain.gain.value = 1 / (i + 1);

        osc.connect(gain);
        gain.connect(masterGain);

        return osc;
      });

      // Start all oscillators
      lfo.start(now);
      oscs.forEach(osc => osc.start(now));

      // Return first oscillator as the main source
      return oscs[0];
    };
  }

  /**
   * Create siren/alert sound
   */
  createSiren(options = {}) {
    const {
      lowFreq = 400,
      highFreq = 800,
      sweepRate = 2,
      duration = 2
    } = options;

    return (context, output) => {
      const now = context.currentTime;

      const osc = context.createOscillator();
      osc.type = 'sawtooth';

      // Modulate frequency
      const lfo = context.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = sweepRate;

      const lfoGain = context.createGain();
      lfoGain.gain.value = (highFreq - lowFreq) / 2;

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.frequency.value = (lowFreq + highFreq) / 2;

      const gain = context.createGain();
      gain.gain.value = 0.3;

      osc.connect(gain);
      gain.connect(output);

      lfo.start(now);
      osc.start(now);
      osc.stop(now + duration);

      return osc;
    };
  }
}

export default SoundSynthesizer;
