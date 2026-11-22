// AETHER — Effect H: Wave Field
// Ripple-tank model: analytic superposition of circular wave trains emitted
// by two orbiting coherent sources (classic interference), plus pointer wells
// as driven sources. A critically-damped spring layer under the analytic
// field lets click-burst impulses splash and settle naturally.
import type { ParticleEffect, EffectContext } from '../engine/types';
import type { ParticleSystem } from '../engine/ParticleSystem';
import { clamp } from '../engine/utils';
import { sdt, colorFromLUT } from './effectUtils';

export const WAVE_SIDE = 127;            // hard cap; side derives from activeCount
const WORLD_WIDTH = 27;

export class WaveEffect implements ParticleEffect {
  private side = WAVE_SIDE;
  private spacing = WORLD_WIDTH / (WAVE_SIDE - 1);

  readonly id = 'wave';
  readonly name = 'Wave Field';
  readonly tagline = 'Ripples · interference';
  readonly description = 'A live ripple tank: two orbiting coherent sources interfere — touch it, click it.';

  init(system: ParticleSystem, _ctx: EffectContext): void {
    this.side = Math.max(12, Math.floor(Math.sqrt(Math.min(system.activeCount, WAVE_SIDE * WAVE_SIDE))));
    this.spacing = WORLD_WIDTH / (this.side - 1);
    const gridCells = this.side * this.side;

    for (let i = 0; i < system.max; i++) {
      const i3 = i * 3;
      if (i >= gridCells) {
        system.positions[i3] = 0; system.positions[i3 + 1] = -60; system.positions[i3 + 2] = 0;
        system.alphas[i] = 0;
        system.miscA[i] = 0; system.miscB[i] = 0;
        system.sizes[i] = 0.01;
        system.maxLife[i] = 1; system.life[i] = 1;
        continue;
      }
      const ix = i % this.side;
      const iz = Math.floor(i / this.side);
      const jx = (system.rng() - 0.5) * 0.05;
      const jz = (system.rng() - 0.5) * 0.05;
      system.positions[i3] = (ix - (this.side - 1) / 2) * this.spacing + jx;
      system.positions[i3 + 1] = 0;
      system.positions[i3 + 2] = (iz - (this.side - 1) / 2) * this.spacing + jz;
      system.velocities[i3] = 0;
      system.velocities[i3 + 1] = 0;
      system.velocities[i3 + 2] = 0;
      system.miscA[i] = 0;               // current height (dynamic layer)
      system.miscB[i] = 0;               // vertical velocity (dynamic layer)
      system.sizes[i] = 0.58;
      system.maxLife[i] = 1;
      system.life[i] = 1;
      system.seeds[i] = system.rng();
    }
  }

  update(system: ParticleSystem, ctx: EffectContext): void {
    const p = ctx.params;
    const dt = sdt(ctx);
    const t = ctx.simTime;

    // Wave numbers/frequencies — gravity slider acts as the restoring force
    const k = 1.18 + p.gravity * 0.85;                 // spatial frequency (1/world unit)
    const omega = Math.sqrt(0.4 + p.gravity * 1.75) * 3.1;
    const emitterAmp = 1.0 + p.attraction * 1.28;      // source strength
    const dampingRate = 5.4 + p.repulsion * 3.2;       // spring layer damping
    const springK = 68;                                 // spring toward the analytic field
    const orbitSpeed = 0.30 + p.rotation * 0.42;
    const chop = p.turbulence;                          // phase shimmer amount

    // Two coherent orbiting sources → classic two-source interference
    const orbitR = 5.0;
    const ax = Math.cos(t * orbitSpeed) * orbitR;
    const az = Math.sin(t * orbitSpeed) * orbitR;
    const bx = Math.cos(t * orbitSpeed + Math.PI) * (orbitR * 0.76);
    const bz = Math.sin(t * orbitSpeed + Math.PI) * (orbitR * 0.76);
    const phaseA = t * omega;
    const phaseB = t * omega + Math.PI * 0.62;

    const yArr = system.miscA;
    const vArr = system.miscB;
    const active = Math.min(system.activeCount, this.side * this.side);
    const wellAmp = 0.85 + p.attraction * 1.15;

    // Pointer wells act as continuous wave sources (attract = crest, repel = trough)
    const wellCount = ctx.wells.length;

    for (let i = 0; i < active; i++) {
      const i3 = i * 3;
      const px = system.positions[i3];
      const pz = system.positions[i3 + 2];

      // --- Analytic ripple-tank field: u(r) = A·sin(kr − ωt)·exp(−λr) ---
      const dAx = px - ax, dAz = pz - az;
      const dA = Math.sqrt(dAx * dAx + dAz * dAz);
      const dBx = px - bx, dBz = pz - bz;
      const dB = Math.sqrt(dBx * dBx + dBz * dBz);

      let field =
        emitterAmp * Math.sin(k * dA - phaseA) * Math.exp(-dA * 0.115) / (1 + 0.16 * dA) +
        emitterAmp * 0.88 * Math.sin(k * dB - phaseB) * Math.exp(-dB * 0.125) / (1 + 0.17 * dB);

      for (let w = 0; w < wellCount; w++) {
        const well = ctx.wells[w];
        const dx = px - well.x, dz = pz - well.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const sign = well.mode === 'attract' ? 1 : -1;
        field += sign * wellAmp * Math.sin(k * d - phaseA * 1.35) * Math.exp(-d * 0.19) / (1 + 0.3 * d);
      }

      // Turbulence: per-cell phase shimmer (cheap value noise via trig lattice)
      if (chop > 0.01) {
        field += chop * 0.24 * Math.sin(px * 0.9 + t * 1.7 + Math.sin(pz * 1.3 + t * 1.1) * 1.7) * Math.exp(-(dA * dA + dB * dB) * 0.008);
      }

      // --- Dynamic spring layer: y chases the analytic field.
      //     Click-burst impulses land in vy and ripple outward before settling. ---
      const y = yArr[i];
      let v = vArr[i];
      // Absorb engine-applied velocity kick (y component), drop x/z (grid-locked)
      v += system.velocities[i3 + 1] * 0.55;
      system.velocities[i3] = 0;
      system.velocities[i3 + 1] = 0;
      system.velocities[i3 + 2] = 0;

      const acc = (field - y) * springK - v * dampingRate;
      v += acc * dt;
      const nextY = clamp(y + v * dt, -3.4, 3.4);
      yArr[i] = nextY;
      vArr[i] = v;

      system.positions[i3 + 1] = nextY;

      const heat = clamp(Math.abs(nextY) / 1.5, 0, 1);
      colorFromLUT(ctx, system.colors, i, 0.28 + heat * 0.70);
      system.alphas[i] = 0.46 + heat * 0.52;
      system.sizes[i] = 0.6 + heat * 0.9;
    }
    for (let i = active; i < system.activeCount; i++) system.alphas[i] = 0;
  }
}
