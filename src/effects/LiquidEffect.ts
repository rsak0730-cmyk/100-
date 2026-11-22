// AETHER — Effect D: Liquid Particles
// Incompressible-ish droplet: curl-flow field, wobbling implicit boundary,
// cluster attraction wells, viscous damping.
import type { ParticleEffect, EffectContext } from '../engine/types';
import type { ParticleSystem } from '../engine/ParticleSystem';
import { randRange, TAU } from '../engine/utils';
import { SimplexNoise } from '../engine/SimplexNoise';
import { sdt, colorFromLUT } from './effectUtils';

const CLUSTER_COUNT = 5;

export class LiquidEffect implements ParticleEffect {
  readonly id = 'liquid';
  readonly name = 'Liquid Cluster';
  readonly tagline = 'Fluid-like · cohesive';
  readonly description = 'A cohesive droplet driven by curl-noise flow, wobbling surface tension and wandering cluster wells.';

  private noise = new SimplexNoise(777);
  private curl = { x: 0, y: 0, z: 0 };
  private clusters = new Float32Array(CLUSTER_COUNT * 3);

  init(system: ParticleSystem, ctx: EffectContext): void {
    const R = 5.1;
    for (let i = 0; i < system.max; i++) {
      const i3 = i * 3;
      // Uniform-ish sphere fill
      const u = system.rng() * 2 - 1;
      const theta = system.rng() * TAU;
      const r = Math.cbrt(system.rng()) * R;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      system.positions[i3] = r * s * Math.cos(theta);
      system.positions[i3 + 1] = r * u * 0.82;
      system.positions[i3 + 2] = r * s * Math.sin(theta);
      system.velocities[i3] = (system.rng() - 0.5) * 2.4;
      system.velocities[i3 + 1] = (system.rng() - 0.5) * 2.4;
      system.velocities[i3 + 2] = (system.rng() - 0.5) * 2.4;
      system.sizes[i] = randRange(system.rng, 0.55, 1.35);
      system.maxLife[i] = 1;
      system.life[i] = 1;
      system.miscA[i] = system.rng() * TAU;
      system.miscB[i] = randRange(system.rng, 0.5, 1.5);
    }
    this.updateClusters(ctx.simTime);
  }

  private updateClusters(t: number): void {
    for (let c = 0; c < CLUSTER_COUNT; c++) {
      const o = c * 3;
      const p1 = t * 0.32 + (c * TAU) / CLUSTER_COUNT;
      const p2 = t * 0.21 + (c * TAU * 1.7) / CLUSTER_COUNT + 1.3;
      this.clusters[o] = Math.sin(p1) * 2.6 + Math.sin(p2 * 1.3) * 1.1;
      this.clusters[o + 1] = Math.cos(p1 * 0.9) * 1.9 + Math.sin(p2) * 0.8;
      this.clusters[o + 2] = Math.cos(p1 * 1.15 + 0.7) * 2.6;
    }
  }

  update(system: ParticleSystem, ctx: EffectContext): void {
    const p = ctx.params;
    const dt = sdt(ctx);
    const t = ctx.simTime;
    this.updateClusters(t);

    // Wobbling implicit boundary (sum of sines ≈ surface tension breathing)
    const R = 5.1 * (1 + 0.10 * Math.sin(t * 0.65) + 0.065 * Math.sin(t * 1.55 + 1.3) + 0.04 * Math.sin(t * 2.3 + 4.1));
    const pull = 2.1 + p.gravity * 2.0;      // surface tension strength
    const clusterPull = p.attraction * 2.6;   // clustering
    const spread = p.repulsion * 2.1;         // internal spreading
    const swirl = p.rotation * 0.55;
    const turb = p.turbulence;
    const viscosity = Math.exp(-(1.15 - Math.min(0.75, p.speed * 0.18)) * dt);

    for (let i = 0; i < system.activeCount; i++) {
      const i3 = i * 3;
      const px = system.positions[i3], py = system.positions[i3 + 1], pz = system.positions[i3 + 2];
      const r = Math.sqrt(px * px + py * py + pz * pz) + 1e-5;

      // --- Curl-noise flow (incompressible feel) ---
      if (turb > 0.01) {
        this.noise.curl3(px * 0.30 + 11.7, py * 0.30 + t * 0.22, pz * 0.30, this.curl);
        const tf = turb * 4.6;
        system.velocities[i3] += this.curl.x * tf * dt;
        system.velocities[i3 + 1] += this.curl.y * tf * dt;
        system.velocities[i3 + 2] += this.curl.z * tf * dt;
      }

      // --- Surface tension: spring back inside the wobbling boundary ---
      if (r > R * 0.72) {
        const over = Math.max(0, r - R * 0.72) / (R * 0.28);
        const invR = 1 / r;
        const f = -over * over * pull * 6.5;
        system.velocities[i3] += px * invR * f * dt;
        system.velocities[i3 + 1] += py * invR * f * dt;
        system.velocities[i3 + 2] += pz * invR * f * dt;
      }

      // --- Gravity: the droplet sags ---
      system.velocities[i3 + 1] -= p.gravity * 4.1 * dt * (r / R);

      // --- Cluster attraction: pull toward the nearest wandering node ---
      if (clusterPull > 0.01) {
        let best = Infinity, bx = 0, by = 0, bz = 0;
        for (let c = 0; c < CLUSTER_COUNT; c++) {
          const o = c * 3;
          const dx = this.clusters[o] - px, dy = this.clusters[o + 1] - py, dz = this.clusters[o + 2] - pz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < best) { best = d2; bx = dx; by = dy; bz = dz; }
        }
        const d = Math.sqrt(best) + 0.35;
        const f = (clusterPull / (d * d)) * Math.min(1, d * 0.8);
        const inv = 1 / d;
        system.velocities[i3] += bx * inv * f * dt;
        system.velocities[i3 + 1] += by * inv * f * dt;
        system.velocities[i3 + 2] += bz * inv * f * dt;
      }

      // --- Repulsion: gentle internal spreading ---
      if (spread > 0.01) {
        const invR = 1 / r;
        system.velocities[i3] += px * invR * spread * dt * (0.6 + 0.4 * Math.sin(t + system.miscA[i]));
        system.velocities[i3 + 1] += py * invR * spread * 0.6 * dt;
        system.velocities[i3 + 2] += pz * invR * spread * dt * (0.6 + 0.4 * Math.cos(t * 0.8 + system.miscA[i]));
      }

      // --- Global swirl around the Y axis ---
      if (swirl > 0.01) {
        system.velocities[i3] += -pz * swirl * dt * 0.6;
        system.velocities[i3 + 2] += px * swirl * dt * 0.6;
      }

      // --- Viscous damping ---
      system.velocities[i3] *= viscosity;
      system.velocities[i3 + 1] *= viscosity;
      system.velocities[i3 + 2] *= viscosity;

      system.positions[i3] += system.velocities[i3] * dt;
      system.positions[i3 + 1] += system.velocities[i3 + 1] * dt;
      system.positions[i3 + 2] += system.velocities[i3 + 2] * dt;

      // Hard clamp inside an outer shell
      const rAfter = Math.hypot(system.positions[i3], system.positions[i3 + 1], system.positions[i3 + 2]);
      if (rAfter > R * 1.3) {
        const inv = (R * 1.3) / rAfter;
        system.positions[i3] *= inv; system.positions[i3 + 1] *= inv; system.positions[i3 + 2] *= inv;
        system.velocities[i3] *= -0.4; system.velocities[i3 + 1] *= -0.4; system.velocities[i3 + 2] *= -0.4;
      }

      // Color: deep palette at the core shell → bright rim highlights
      const rim = Math.min(1, rAfter / R);
      const speed = Math.hypot(system.velocities[i3], system.velocities[i3 + 1], system.velocities[i3 + 2]);
      const heat = Math.min(1, rim * 0.55 + Math.min(1, speed * 0.16) * 0.45);
      colorFromLUT(ctx, system.colors, i, 0.18 + heat * 0.74);
      system.alphas[i] = 0.38 + rim * 0.34;
      system.sizes[i] = system.miscB[i] * (0.62 + rim * 0.55 + Math.min(0.6, speed * 0.05));
    }
  }
}
