// AETHER — Effect G: Nebula
// Layered cosmic cloud banks + embedded star field, slow fbm drift.
import type { ParticleEffect, EffectContext } from '../engine/types';
import type { ParticleSystem } from '../engine/ParticleSystem';
import { randRange, TAU } from '../engine/utils';
import { SimplexNoise } from '../engine/SimplexNoise';
import { sdt, colorFromLUT } from './effectUtils';

/** Layer centers (world offsets) — three banks of cloud. */
const LAYERS = [
  { x: -7.6, y: 1.7, z: -2.6, r: 4.2 },
  { x: 5.8, y: -1.5, z: 1.7, r: 4.8 },
  { x: 0.3, y: 2.5, z: 5.8, r: 3.8 },
];

export class NebulaEffect implements ParticleEffect {
  readonly id = 'nebula';
  readonly name = 'Nebula Drift';
  readonly tagline = 'Cosmic cloud · layers';
  readonly description = 'Three banks of luminous interstellar cloud with an embedded twinkling star field.';

  private noise = new SimplexNoise(2718);
  private curl = { x: 0, y: 0, z: 0 };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  init(system: ParticleSystem, _ctx: EffectContext): void {
    for (let i = 0; i < system.max; i++) {
      const i3 = i * 3;
      const star = system.rng() < 0.13;
      system.miscB[i] = star ? 1 : 0;

      if (star) {
        // Wide star shell
        const radius = randRange(system.rng, 9, 26);
        const theta = system.rng() * TAU;
        const phi = Math.acos(2 * system.rng() - 1);
        system.positions[i3] = Math.sin(phi) * Math.cos(theta) * radius;
        system.positions[i3 + 1] = Math.cos(phi) * radius;
        system.positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
        system.sizes[i] = randRange(system.rng, 0.25, 0.75);
        system.life[i] = system.maxLife[i] = randRange(system.rng, 8, 20);
      } else {
        const layer = Math.floor(system.rng() * LAYERS.length);
        system.miscA[i] = layer;
        const L = LAYERS[layer];
        const radius = Math.pow(system.rng(), 0.62) * L.r;
        const theta = system.rng() * TAU;
        const phi = Math.acos(2 * system.rng() - 1);
        system.positions[i3] = L.x + Math.sin(phi) * Math.cos(theta) * radius;
        system.positions[i3 + 1] = L.y + Math.cos(phi) * radius * 0.72;
        system.positions[i3 + 2] = L.z + Math.sin(phi) * Math.sin(theta) * radius;
        system.velocities[i3] = (system.rng() - 0.5) * 0.35;
        system.velocities[i3 + 1] = (system.rng() - 0.5) * 0.3;
        system.velocities[i3 + 2] = (system.rng() - 0.5) * 0.35;
        system.sizes[i] = randRange(system.rng, 1.6, 4.6);
        system.life[i] = system.maxLife[i] = randRange(system.rng, 10, 24);
      }
      system.alphas[i] = 0.5;
    }
  }

  update(system: ParticleSystem, ctx: EffectContext): void {
    const p = ctx.params;
    const dt = sdt(ctx);
    const t = ctx.simTime;
    const swirl = p.rotation * 0.16;
    const turb = 0.25 + p.turbulence * 0.75;

    for (let i = 0; i < system.activeCount; i++) {
      const i3 = i * 3;
      const px = system.positions[i3], py = system.positions[i3 + 1], pz = system.positions[i3 + 2];

      if (system.miscB[i] === 1) {
        // Star: barely moves, twinkles
        system.life[i] -= dt;
        if (system.life[i] <= 0) system.life[i] = system.maxLife[i];
        colorFromLUT(ctx, system.colors, i, 0.88 + 0.1 * Math.sin(i * 3.7));
        system.alphas[i] = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.7 + i * 2.399));
        // slow parallax drift
        system.positions[i3] += Math.sin(i * 1.3) * 0.002;
        continue;
      }

      const layer = system.miscA[i] | 0;
      const L = LAYERS[layer];

      // Fbm-driven drift around the layer nucleus
      this.noise.curl3(px * 0.16 + layer * 9.3, py * 0.16 + t * 0.09, pz * 0.16, this.curl);
      const tf = turb * 1.5;
      system.velocities[i3] += this.curl.x * tf * dt;
      system.velocities[i3 + 1] += this.curl.y * tf * 0.8 * dt;
      system.velocities[i3 + 2] += this.curl.z * tf * dt;

      // Weak confinement spring to the layer center keeps banks coherent
      const k = 0.055 + p.attraction * 0.05;
      system.velocities[i3] += (L.x - px) * k * dt;
      system.velocities[i3 + 1] += (L.y - py) * k * dt;
      system.velocities[i3 + 2] += (L.z - pz) * k * dt;

      // Global slow rotation about Y
      system.velocities[i3] += -pz * swirl * dt;
      system.velocities[i3 + 2] += px * swirl * dt;

      // Internal spread (repulsion)
      if (p.repulsion > 0.01) {
        const dx = px - L.x, dy = py - L.y, dz = pz - L.z;
        const d = Math.hypot(dx, dy, dz) + 0.4;
        const f = p.repulsion * 0.35 / d;
        system.velocities[i3] += dx * f * dt;
        system.velocities[i3 + 1] += dy * f * dt;
        system.velocities[i3 + 2] += dz * f * dt;
      }

      // Strong damping — clouds drift, never fly
      const dragK = Math.exp(-0.9 * dt);
      system.velocities[i3] *= dragK;
      system.velocities[i3 + 1] *= dragK;
      system.velocities[i3 + 2] *= dragK;

      system.positions[i3] += system.velocities[i3] * dt;
      system.positions[i3 + 1] += system.velocities[i3 + 1] * dt;
      system.positions[i3 + 2] += system.velocities[i3 + 2] * dt;

      // Color: each layer biased to a slice of the palette
      const layerT = [0.30, 0.62, 0.88][layer];
      const wobble = 0.16 * Math.sin(t * 0.35 + i * 0.11 + layer * 2.1);
      colorFromLUT(ctx, system.colors, i, layerT + wobble + (p.turbulence - 1) * 0.02);
      system.alphas[i] = 0.062 + 0.046 * Math.sin(t * 0.5 + i * 1.7 + layer);
    }
  }
}
