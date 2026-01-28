/**
 * SoundPresets - Pre-configured sound presets
 */

import { SoundSynthesizer } from './SoundSynthesizer.js';

export class SoundPresets {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.synth = new SoundSynthesizer(audioEngine);
  }

  /**
   * Register all presets with the audio engine
   */
  registerAll() {
    // Footsteps
    this.audioEngine.registerSound('footstep_concrete', this.footstepConcrete());
    this.audioEngine.registerSound('footstep_metal', this.footstepMetal());
    this.audioEngine.registerSound('footstep_wood', this.footstepWood());

    // Actions
    this.audioEngine.registerSound('jump', this.jump());
    this.audioEngine.registerSound('land', this.land());

    // Weapons
    this.audioEngine.registerSound('gunshot', this.gunshot());
    this.audioEngine.registerSound('reload', this.reload());
    this.audioEngine.registerSound('melee_swing', this.meleeSwing());
    this.audioEngine.registerSound('melee_hit', this.meleeHit());

    // Objects
    this.audioEngine.registerSound('door_open', this.doorOpen());
    this.audioEngine.registerSound('door_close', this.doorClose());
    this.audioEngine.registerSound('button_click', this.buttonClick());
    this.audioEngine.registerSound('pickup', this.pickup());
    this.audioEngine.registerSound('portal_enter', this.portalEnter());

    // UI
    this.audioEngine.registerSound('ui_beep', this.uiBeep());
    this.audioEngine.registerSound('ui_error', this.uiError());
    this.audioEngine.registerSound('ui_success', this.uiSuccess());

    // Alerts
    this.audioEngine.registerSound('alert_siren', this.alertSiren());
    this.audioEngine.registerSound('alert_beep', this.alertBeep());

    // Ambient
    this.audioEngine.registerSound('ambient_hum', this.ambientHum());
    this.audioEngine.registerSound('ambient_wind', this.ambientWind());
    this.audioEngine.registerSound('ambient_machine', this.ambientMachine());

    // Character
    this.audioEngine.registerSound('voice_alert', this.voiceAlert());
    this.audioEngine.registerSound('voice_death', this.voiceDeath());
  }

  // === FOOTSTEPS ===

  footstepConcrete() {
    return this.synth.createNoiseBurst({
      duration: 0.08,
      filterType: 'lowpass',
      filterFreq: 300,
      attack: 0.005,
      decay: 0.08
    });
  }

  footstepMetal() {
    return (context, output) => {
      const now = context.currentTime;

      // Metal click
      const osc = context.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc.stop(now + 0.1);

      return osc;
    };
  }

  footstepWood() {
    return (context, output) => {
      const now = context.currentTime;

      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc.stop(now + 0.1);

      return osc;
    };
  }

  // === ACTIONS ===

  jump() {
    return this.synth.createWhoosh({ duration: 0.2, startFreq: 150, endFreq: 400 });
  }

  land() {
    return this.synth.createImpact({ lowFreq: 60, highFreq: 150, duration: 0.15 });
  }

  // === WEAPONS ===

  gunshot() {
    return (context, output) => {
      const now = context.currentTime;

      // Noise crack
      const noise = this.audioEngine.createNoiseBuffer(0.08, 'white');
      const noiseSource = context.createBufferSource();
      noiseSource.buffer = noise;

      const highpass = context.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 1000;

      const noiseGain = context.createGain();
      noiseGain.gain.setValueAtTime(1, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      noiseSource.connect(highpass);
      highpass.connect(noiseGain);
      noiseGain.connect(output);

      // Low thump
      const osc = context.createOscillator();
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

      const oscGain = context.createGain();
      oscGain.gain.setValueAtTime(0.8, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(oscGain);
      oscGain.connect(output);

      noiseSource.start(now);
      noiseSource.stop(now + 0.08);
      osc.start(now);
      osc.stop(now + 0.12);

      return osc;
    };
  }

  reload() {
    return (context, output) => {
      const now = context.currentTime;

      // Click 1
      const osc1 = context.createOscillator();
      osc1.type = 'square';
      osc1.frequency.value = 2000;

      const gain1 = context.createGain();
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.02);

      osc1.connect(gain1);
      gain1.connect(output);

      // Click 2
      const osc2 = context.createOscillator();
      osc2.type = 'square';
      osc2.frequency.value = 1500;

      const gain2 = context.createGain();
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.3, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.17);

      osc2.connect(gain2);
      gain2.connect(output);

      osc1.start(now);
      osc1.stop(now + 0.03);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.18);

      return osc1;
    };
  }

  meleeSwing() {
    return this.synth.createWhoosh({ duration: 0.2, startFreq: 300, endFreq: 600 });
  }

  meleeHit() {
    return this.synth.createImpact({ lowFreq: 80, highFreq: 200, duration: 0.1 });
  }

  // === OBJECTS ===

  doorOpen() {
    return (context, output) => {
      const now = context.currentTime;

      // Creaking sound
      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.3);
      osc.frequency.linearRampToValueAtTime(80, now + 0.5);

      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.4);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc.stop(now + 0.5);

      return osc;
    };
  }

  doorClose() {
    return this.synth.createImpact({ lowFreq: 60, highFreq: 120, duration: 0.2 });
  }

  buttonClick() {
    return this.synth.createTone({
      frequency: 1000,
      type: 'square',
      duration: 0.05,
      attack: 0.001,
      decay: 0.04,
      sustain: 0.5
    });
  }

  pickup() {
    return (context, output) => {
      const now = context.currentTime;

      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc.stop(now + 0.15);

      return osc;
    };
  }

  portalEnter() {
    return (context, output) => {
      const now = context.currentTime;

      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc.stop(now + 0.4);

      return osc;
    };
  }

  // === UI ===

  uiBeep() {
    return this.synth.createBeep({ frequency: 800, duration: 0.08 });
  }

  uiError() {
    return (context, output) => {
      const now = context.currentTime;

      const osc = context.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 200;

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.setValueAtTime(0, now + 0.1);
      gain.gain.setValueAtTime(0.2, now + 0.15);
      gain.gain.setValueAtTime(0, now + 0.25);

      osc.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc.stop(now + 0.25);

      return osc;
    };
  }

  uiSuccess() {
    return (context, output) => {
      const now = context.currentTime;

      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(800, now + 0.1);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc.stop(now + 0.2);

      return osc;
    };
  }

  // === ALERTS ===

  alertSiren() {
    return this.synth.createSiren({ lowFreq: 400, highFreq: 800, sweepRate: 3, duration: 2 });
  }

  alertBeep() {
    return (context, output) => {
      const now = context.currentTime;

      const osc = context.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 1000;

      const gain = context.createGain();
      for (let i = 0; i < 3; i++) {
        gain.gain.setValueAtTime(0.3, now + i * 0.2);
        gain.gain.setValueAtTime(0, now + i * 0.2 + 0.1);
      }

      osc.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc.stop(now + 0.6);

      return osc;
    };
  }

  // === AMBIENT ===

  ambientHum() {
    return this.synth.createDrone({ baseFreq: 55, harmonics: [1, 2, 3], modRate: 0.05 });
  }

  ambientWind() {
    return (context, output, { loop }) => {
      const noise = this.audioEngine.createNoiseBuffer(2, 'pink');
      const source = context.createBufferSource();
      source.buffer = noise;
      source.loop = loop;

      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      // LFO for wind gusts
      const lfo = context.createOscillator();
      lfo.frequency.value = 0.2;
      const lfoGain = context.createGain();
      lfoGain.gain.value = 150;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const gain = context.createGain();
      gain.gain.value = 0.15;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      lfo.start();
      source.start();

      return source;
    };
  }

  ambientMachine() {
    return (context, output, { loop }) => {
      const now = context.currentTime;

      // Low rumble
      const osc1 = context.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 40;

      // Motor whine
      const osc2 = context.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 120;

      // LFO
      const lfo = context.createOscillator();
      lfo.frequency.value = 0.5;
      const lfoGain = context.createGain();
      lfoGain.gain.value = 5;
      lfo.connect(lfoGain);
      lfoGain.connect(osc2.frequency);

      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;

      const gain = context.createGain();
      gain.gain.value = 0.2;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);

      return osc1;
    };
  }

  // === CHARACTER ===

  voiceAlert() {
    return (context, output) => {
      const now = context.currentTime;

      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(300, now + 0.1);
      osc.frequency.linearRampToValueAtTime(200, now + 0.3);

      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 2;

      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.25);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc.stop(now + 0.3);

      return osc;
    };
  }

  voiceDeath() {
    return (context, output) => {
      const now = context.currentTime;

      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);

      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.5);
      filter.Q.value = 3;

      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc.stop(now + 0.5);

      return osc;
    };
  }
}

export default SoundPresets;
