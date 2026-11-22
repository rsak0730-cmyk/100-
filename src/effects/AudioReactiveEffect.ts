// AETHER — Effect J: Audio-Reactive Particles
// Phyllotaxis disc pulsing with live FFT (mic / file / demo signal).
import type { ParticleEffect, EffectContext } from '../engine/types';
import type { ParticleSystem } from '../engine/ParticleSystem';
import { clamp } from '../engine/utils';
import { sdt, colorFromLUT } from './effectUtils';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export class AudioReactiveEffect implements ParticleEffect {
  readonly id = 'audio';
  readonly name = 'Audio Reactive';
  readonly tagline = 'FFT · beat drive';
  readonly description = 'A phyllotaxis mandala driven by bass, mids and treble — mic, audio file or demo signal.';

  private lastBeatPulse = -1;
  private shockCooldown = 0;

  init(system: ParticleSystem, ctx: EffectContext): void {
    for (let i = 0; i < system.max; i++) {
      const i3 = i * 3;
      const frac = (i + 0.5) / system.max;
      const R = Math.sqrt(frac) * 8.6;
      const a = i * GOLDEN_ANGLE;
      system.positions[i3] = Math.cos(a) * R;
      system.positions[i3 + 1] = (system.rng() - 0.5) * 1.2;
      system.positions[i3 + 2] = Math.sin(a) * R;
      system.velocities[i3] = 0;
      system.velocities[i3 + 1] = 0;
      system.velocities[i3 + 2] = 0;
      system.miscA[i] = a;            // angular slot
      system.miscB[i] = frac;         // radial slot
      system.sizes[i] = 0.55;
      system.maxLife[i] = 1;
      system.life[i] = 1;
    }
    this.lastBeatPulse = ctx.simTime;
    this.shockCooldown = 0;
  }

  update(system: ParticleSystem, ctx: EffectContext): void {
    const p = ctx.params;
    const dt = Math.min(sdt(ctx), 0.033);
    const t = ctx.simTime;
    const { bass, mid, treble, energy, beat } = ctx.audio;

    if (this.shockCooldown > 0) this.shockCooldown -= dt;

    // Beat → radial shockwave (throttled)
    if (beat && this.shockCooldown <= 0) {
      ctx.spawnShockwave(0, 0, 0, 0xff6fd8, 6 + energy * 8);
      this.shockCooldown = 0.34;
    }

    const spring = 26;
    const dampK = Math.exp(-3.9 * dt);
    const rot = t * (0.10 + p.rotation * 0.24);
    const pulse = 1 + bass * 0.42;
    const yAmp = 0.5 + mid * 2.6;

    for (let i = 0; i < system.activeCount; i++) {
      const i3 = i * 3;
      const a = system.miscA[i] + rot;
      const frac = system.miscB[i];
      // Bass breathing: disc expands; treble ripples the rim
      const baseR = Math.sqrt(frac) * 8.6;
      const rimRipple = Math.sin(frac * 9.0 - t * (2.0 + treble * 5.0)) * (0.22 + treble * 1.5);
      const R = (baseR + rimRipple) * pulse;
      const ty = Math.sin(a * 2.0 + t * 1.6) * yAmp * (0.35 + frac * 0.75) + Math.sin(t * 0.9 + frac * 4.0) * 0.3;

      const tx = Math.cos(a) * R;
      const tz = Math.sin(a) * R;

      system.velocities[i3] += (tx - system.positions[i3]) * spring * dt;
      system.velocities[i3 + 1] += (ty - system.positions[i3 + 1]) * spring * dt;
      system.velocities[i3 + 2] += (tz - system.positions[i3 + 2]) * spring * dt;

      // Beat kicks push the whole mandala outward
      if (beat && t - this.lastBeatPulse > 0.12) {
        const inv = 1 / Math.max(0.6, Math.hypot(system.positions[i3], system.positions[i3 + 2]));
        const kick = 2.6 + energy * 5.2;
        system.velocities[i3] += system.positions[i3] * inv * kick;
        system.velocities[i3 + 2] += system.positions[i3 + 2] * inv * kick;
        system.velocities[i3 + 1] += (Math.random() - 0.5) * kick * 0.5;
      }

      // Gravity sags the disc; turbulence shimmers it
      system.velocities[i3 + 1] -= p.gravity * 0.6 * dt;
      if (p.turbulence > 0.01) {
        const j = p.turbulence * 0.8;
        system.velocities[i3] += Math.sin(t * 3.1 + i * 1.7) * j * dt;
        system.velocities[i3 + 1] += Math.cos(t * 2.7 + i * 2.3) * j * dt;
      }

      system.velocities[i3] *= dampK;
      system.velocities[i3 + 1] *= dampK;
      system.velocities[i3 + 2] *= dampK;

      system.positions[i3] += system.velocities[i3] * dt;
      system.positions[i3 + 1] += system.velocities[i3 + 1] * dt;
      system.positions[i3 + 2] += system.velocities[i3 + 2] * dt;

      const hue = clamp(frac * 0.72 + treble * 0.3 + t * 0.015, 0, 1);
      colorFromLUT(ctx, system.colors, i, hue);
      system.alphas[i] = clamp(0.38 + energy * 0.62, 0, 1);
      system.sizes[i] = 0.4 + treble * 1.5 + frac * 0.35;
    }

    if (beat) this.lastBeatPulse = t;
  }
}
