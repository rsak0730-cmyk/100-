// AETHER — Effect C: Spiral Galaxy
// Logarithmic spiral arms, Keplerian rotation curve, hot core, halo stars.
import * as THREE from 'three';
import type { ParticleEffect, EffectContext } from '../engine/types';
import type { ParticleSystem } from '../engine/ParticleSystem';
import { randRange, TAU } from '../engine/utils';
import { sdt, colorFromLUT, getGlowTexture } from './effectUtils';

const ARM_COUNT = 4;
const TWIST = 4.85;   // radians of wind-up from core to rim
const GM = 30.0;

export class GalaxyEffect implements ParticleEffect {
  readonly id = 'galaxy';
  readonly name = 'Galaxy Spiral';
  readonly tagline = 'Spiral arms · core';
  readonly description = 'Grand-design spiral galaxy: differential Keplerian rotation, four arms and a glowing core.';

  private coreGlow!: THREE.Sprite;
  private core!: THREE.Sprite;

  init(system: ParticleSystem, ctx: EffectContext): void {
    this.coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(), color: 0xcfa8ff, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
      })
    );
    this.coreGlow.scale.setScalar(2.9);
    this.core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(), color: 0xfff6e0, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1,
      })
    );
    this.core.scale.setScalar(2.0);
    ctx.fxGroup.add(this.coreGlow, this.core);

    for (let i = 0; i < system.max; i++) this.spawnArmParticle(system, i, true, ctx);
  }

  private gaussian(rng: () => number): number {
    // Box–Muller
    const u = Math.max(1e-6, rng());
    const v = Math.max(1e-6, rng());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }

  private spawnArmParticle(system: ParticleSystem, i: number, randomAge: boolean, ctx: EffectContext): void {
    const rng = system.rng;
    const i3 = i * 3;
    const isArm = rng() < 0.84;

    if (isArm) {
      const arm = Math.floor(rng() * ARM_COUNT);
      const t = Math.pow(rng(), 0.65);              // 0 = core → 1 = rim
      const radius = 0.55 + t * 13.2;
      const scatter = (1.15 - t) * 0.30 + 0.05;
      const angle =
        (arm * TAU) / ARM_COUNT +
        t * TWIST +
        this.gaussian(rng) * scatter;
      const thick = (0.32 + t * 0.55) * 0.42;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.gaussian(rng) * thick;

      // Near-rigid rotation: keeps the spiral arms coherent over time
      const vCirc = 3.35 + 1.05 * Math.pow(Math.max(0, 1 - radius / 15), 1.35);
      system.positions[i3] = x;
      system.positions[i3 + 1] = y;
      system.positions[i3 + 2] = z;
      system.velocities[i3] = -Math.sin(angle) * vCirc;
      system.velocities[i3 + 1] = (rng() - 0.5) * 0.12;
      system.velocities[i3 + 2] = Math.cos(angle) * vCirc;

      system.miscA[i] = t;               // radius fraction
      system.maxLife[i] = randRange(rng, 14, 30);
      system.sizes[i] = randRange(rng, 0.32, 1.05) + (1 - t) * 0.35;
    } else {
      // Halo / star cluster population
      const radius = randRange(rng, 3, 21);
      const theta = rng() * TAU;
      const phi = Math.acos(2 * rng() - 1);
      const x = Math.sin(phi) * Math.cos(theta) * radius;
      const y = Math.cos(phi) * radius * 0.7;
      const z = Math.sin(phi) * Math.sin(theta) * radius;
      const inv = 1 / Math.max(0.01, Math.hypot(x, y, z));
      const v = Math.sqrt(GM * inv) * 0.32;
      system.positions[i3] = x;
      system.positions[i3 + 1] = y;
      system.positions[i3 + 2] = z;
      system.velocities[i3] = -z * inv * v * 0.8 + (rng() - 0.5) * 0.3;
      system.velocities[i3 + 1] = (rng() - 0.5) * 0.25;
      system.velocities[i3 + 2] = x * inv * v * 0.8 + (rng() - 0.5) * 0.3;
      system.miscA[i] = 0.92 + rng() * 0.08; // halo flag-ish (outer color)
      system.maxLife[i] = randRange(rng, 10, 26);
      system.sizes[i] = randRange(rng, 0.4, 0.95);
    }
    system.life[i] = randomAge ? randRange(rng, 0.1, system.maxLife[i]) : system.maxLife[i];
    system.alphas[i] = 0.8;
    void ctx;
  }

  update(system: ParticleSystem, ctx: EffectContext): void {
    const p = ctx.params;
    const dt = sdt(ctx);
    const GM_eff = GM * (0.4 + p.gravity * 0.8);
    const rotBoost = 0.3 + p.rotation * 0.75;
    const soft2 = 0.35;

    for (let i = 0; i < system.activeCount; i++) {
      const i3 = i * 3;
      system.life[i] -= dt;

      const px = system.positions[i3], py = system.positions[i3 + 1], pz = system.positions[i3 + 2];
      const r2 = px * px + py * py + pz * pz;
      const r = Math.sqrt(r2) + soft2;

      // Respawn escapees / expired stars
      if (system.life[i] <= 0 || r > 30) {
        this.spawnArmParticle(system, i, false, ctx);
        continue;
      }

      // Gravity (keeps arms coherent)
      const invR = 1 / r;
      const accel = GM_eff * invR * invR;
      system.velocities[i3] -= px * invR * accel * dt;
      system.velocities[i3 + 1] -= py * invR * accel * dt * 2.4; // stronger vertical restoring → disk shape
      system.velocities[i3 + 2] -= pz * invR * accel * dt;

      // Steer tangential speed toward the rotation-controlled target (Keplerian)
      const tLen = Math.hypot(px, pz);
      if (tLen > 0.05) {
        const tx = -pz / tLen, tz = px / tLen;
        const vT = system.velocities[i3] * tx + system.velocities[i3 + 2] * tz;
        const desired = (3.35 + 1.05 * Math.pow(Math.max(0, 1 - r / 15), 1.35)) * rotBoost;
        const delta = (desired - vT) * Math.min(1, 2.4 * dt);
        system.velocities[i3] += tx * delta;
        system.velocities[i3 + 2] += tz * delta;
      }

      // Gentle damping kills vertical jitter over time
      system.velocities[i3 + 1] *= Math.exp(-1.4 * dt);

      system.positions[i3] += system.velocities[i3] * dt;
      system.positions[i3 + 1] += system.velocities[i3 + 1] * dt;
      system.positions[i3 + 2] += system.velocities[i3 + 2] * dt;

      // Color: white-gold core → palette mid → palette edge; halo stars stay cool
      const t = system.miscA[i];
      const heat = Math.pow(Math.max(0, 1 - t), 1.6);      // 1 core → 0 rim
      const mixed = Math.min(1, Math.max(0, (1 - t * 0.92) * 0.85 + 0.08));
      colorFromLUT(ctx, system.colors, i, Math.min(1, mixed * (0.35 + 0.65 * heat) + heat * 0.55));
      const twinkle = 0.68 + 0.32 * Math.sin(ctx.simTime * 3.4 + i * 12.9898);
      system.alphas[i] = (0.30 + 0.52 * (1 - t * 0.6)) * twinkle;
      system.sizes[i] = (t > 0.9 ? 0.40 : 0.24 + Math.pow(1 - t, 2.2) * 0.66);
    }

    // Core breathing
    const breathe = 1 + 0.06 * Math.sin(ctx.simTime * 1.6);
    this.coreGlow.scale.setScalar(2.9 * breathe + p.glow * 0.55);
    this.core.scale.setScalar(2.0 * breathe);
  }
}
