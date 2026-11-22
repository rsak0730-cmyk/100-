// AETHER — Effect F: Smoke & Fire
// Temperature-driven dual population: bright fast fire + slow expanding smoke.
import type { ParticleEffect, EffectContext } from '../engine/types';
import type { ParticleSystem } from '../engine/ParticleSystem';
import { randRange, TAU } from '../engine/utils';
import { SimplexNoise } from '../engine/SimplexNoise';
import { sdt, colorFromLUT } from './effectUtils';

export class SmokeEffect implements ParticleEffect {
  readonly id = 'smokefire';
  readonly name = 'Smoke & Fire';
  readonly tagline = 'Thermal · turbulent';
  readonly description = 'Temperature-colored plume: fast shrinking embers below slow expanding smoke, curl-driven.';

  private noise = new SimplexNoise(31337);
  private curl = { x: 0, y: 0, z: 0 };

  init(system: ParticleSystem, ctx: EffectContext): void {
    for (let i = 0; i < system.max; i++) {
      const isFire = system.rng() < 0.44;
      system.miscB[i] = isFire ? 0 : 1; // 0 = fire, 1 = smoke
      this.respawn(system, i, true, ctx);
    }
  }

  private respawn(system: ParticleSystem, i: number, stagger: boolean, ctx: EffectContext): void {
    const rng = system.rng;
    const i3 = i * 3;
    const isFire = system.miscB[i] === 0;

    // Emit from a shallow cone at the base
    const angle = rng() * TAU;
    const radius = Math.pow(rng(), 0.7) * (isFire ? 2.3 : 3.3);
    const rise = isFire ? 3.4 : 7.5;          // pre-spread the column on spawn/reset
    const spreadY = stagger ? rng() * rise : 0;
    system.positions[i3] = Math.cos(angle) * radius * (1 + spreadY * 0.16);
    system.positions[i3 + 1] = -4.6 + rng() * 0.5 + spreadY;
    system.positions[i3 + 2] = Math.sin(angle) * radius * (1 + spreadY * 0.16);

    if (isFire) {
      system.velocities[i3] = Math.cos(angle) * randRange(rng, 0.4, 1.6) + (rng() - 0.5);
      system.velocities[i3 + 1] = randRange(rng, 4.6, 8.2);
      system.velocities[i3 + 2] = Math.sin(angle) * randRange(rng, 0.4, 1.6) + (rng() - 0.5);
      system.maxLife[i] = randRange(rng, 0.65, 1.35);
      system.sizes[i] = randRange(rng, 0.55, 1.15);
    } else {
      system.velocities[i3] = Math.cos(angle) * randRange(rng, 0.2, 1.0);
      system.velocities[i3 + 1] = randRange(rng, 1.7, 3.1);
      system.velocities[i3 + 2] = Math.sin(angle) * randRange(rng, 0.2, 1.0);
      system.maxLife[i] = randRange(rng, 2.0, 4.2);
      system.sizes[i] = randRange(rng, 1.4, 2.6);
    }
    system.life[i] = stagger ? randRange(rng, 0.05, system.maxLife[i]) : system.maxLife[i];
    system.miscA[i] = rng() * TAU;
    void ctx;
  }

  update(system: ParticleSystem, ctx: EffectContext): void {
    const p = ctx.params;
    const dt = sdt(ctx);
    const t = ctx.simTime;
    const buoyancy = 1.35 - p.gravity * 0.85;         // gravity stifles the plume
    const turb = 0.35 + p.turbulence * 1.35;
    const wind = Math.sin(t * 0.32) * 0.55 + 0.25;    // slow ambient breeze

    for (let i = 0; i < system.activeCount; i++) {
      const i3 = i * 3;
      system.life[i] -= dt;
      if (system.life[i] <= 0) {
        this.respawn(system, i, false, ctx);
        continue;
      }
      const isFire = system.miscB[i] === 0;
      const px = system.positions[i3], py = system.positions[i3 + 1], pz = system.positions[i3 + 2];

      // Buoyancy + wind
      system.velocities[i3 + 1] += buoyancy * (isFire ? 2.1 : 0.9) * dt;
      system.velocities[i3] += wind * (isFire ? 0.25 : 0.6) * dt;

      // Curl turbulence — smoke wobbles more than fire
      this.noise.curl3(px * 0.55 + 5.1, py * 0.38 + t * 0.5, pz * 0.55, this.curl);
      const tf = turb * (isFire ? 2.3 : 3.6);
      system.velocities[i3] += this.curl.x * tf * dt;
      system.velocities[i3 + 1] += this.curl.y * tf * 0.6 * dt;
      system.velocities[i3 + 2] += this.curl.z * tf * dt;

      // Drag
      const dragK = Math.exp(-(isFire ? 1.15 : 0.55) * dt);
      system.velocities[i3] *= dragK;
      system.velocities[i3 + 1] *= dragK;
      system.velocities[i3 + 2] *= dragK;

      system.positions[i3] += system.velocities[i3] * dt;
      system.positions[i3 + 1] += system.velocities[i3 + 1] * dt;
      system.positions[i3 + 2] += system.velocities[i3 + 2] * dt;

      const lifeFrac = system.life[i] / system.maxLife[i];   // 1 fresh → 0 dead

      if (isFire) {
        // Physical temperature ramp: white-hot → gold → orange → ember → ash
        temperatureRamp(lifeFrac, system.colors, i);
        system.alphas[i] = Math.pow(lifeFrac, 0.75) * 0.62;
        system.sizes[i] = 0.34 + 0.55 * lifeFrac;
      } else {
        // Smoke: cool palette low end, dim, expanding
        const grey = 0.30 + 0.22 * lifeFrac;
        colorFromLUT(ctx, system.colors, i, 0.06 + 0.08 * lifeFrac);
        system.colors[i3] = system.colors[i3] * 0.22 + grey;
        system.colors[i3 + 1] = system.colors[i3 + 1] * 0.22 + grey;
        system.colors[i3 + 2] = system.colors[i3 + 2] * 0.22 + grey * 1.06;
        system.alphas[i] = Math.min(0.26, 0.055 + lifeFrac * 0.15);
        system.sizes[i] = 1.2 + (1 - lifeFrac) * 3.2;
      }

      // Extinguish fire particles that stall out, keep smoke rising
      if (system.positions[i3 + 1] > 9.5) system.life[i] *= Math.exp(-2.2 * dt);
    }
  }
}


/** Inferno-style 5-stop temperature ramp, writing straight into the color buffer. */
function temperatureRamp(t: number, colors: Float32Array, i: number): void {
  // stops: 0 = dead ash, 1 = white-hot fresh flame
  const stops: ReadonlyArray<[number, number, number, number]> = [
    [0.00, 0.16, 0.05, 0.03],
    [0.22, 0.55, 0.10, 0.03],
    [0.45, 0.93, 0.32, 0.05],
    [0.68, 1.00, 0.58, 0.12],
    [0.85, 1.00, 0.80, 0.35],
    [1.00, 1.00, 0.97, 0.85],
  ];
  const o = i * 3;
  for (let k = 0; k < stops.length - 1; k++) {
    const a = stops[k], b = stops[k + 1];
    if (t <= b[0] || k === stops.length - 2) {
      const span = b[0] - a[0];
      const f = span > 0 ? Math.min(1, Math.max(0, (t - a[0]) / span)) : 0;
      colors[o] = a[1] + (b[1] - a[1]) * f;
      colors[o + 1] = a[2] + (b[2] - a[2]) * f;
      colors[o + 2] = a[3] + (b[3] - a[3]) * f;
      return;
    }
  }
}
