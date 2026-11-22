// AETHER — Effect B: Black Hole
// Gravitational attraction, Keplerian accretion disk, photon ring, absorption.
import * as THREE from 'three';
import type { ParticleEffect, EffectContext } from '../engine/types';
import type { ParticleSystem } from '../engine/ParticleSystem';
import { randRange, TAU } from '../engine/utils';
import { SimplexNoise } from '../engine/SimplexNoise';
import { sdt, colorFromLUT, getGlowTexture } from './effectUtils';

const GM_BASE = 17.0;
/** Disk tilt applied at spawn so the disk reads as a 3D ellipse. */
const TILT_X = 0.42;
const TILT_Z = 0.30;

export class BlackHoleEffect implements ParticleEffect {
  readonly id = 'blackhole';
  readonly name = 'Black Hole';
  readonly tagline = 'Accretion · lensing glow';
  readonly description = 'Keplerian accretion disk with tidal gravity, photon-ring glow and event-horizon absorption.';

  private noise = new SimplexNoise(4242);
  private ringInner!: THREE.Mesh;
  private ringOuter!: THREE.Mesh;
  private coreGlow!: THREE.Sprite;
  private core!: THREE.Mesh;

  init(system: ParticleSystem, ctx: EffectContext): void {
    // --- Event horizon + photon ring visuals ---
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(1.02, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    this.coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0xffd9a6,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.82,
      })
    );
    this.coreGlow.scale.setScalar(2.7);

    this.ringInner = new THREE.Mesh(
      new THREE.RingGeometry(1.13, 1.34, 96),
      new THREE.MeshBasicMaterial({
        color: 0xfff1cf, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
      })
    );
    this.ringOuter = new THREE.Mesh(
      new THREE.RingGeometry(1.34, 2.05, 96),
      new THREE.MeshBasicMaterial({
        color: 0xff9a3d, transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
      })
    );
    for (const m of [this.ringInner, this.ringOuter]) {
      m.rotation.x = -Math.PI / 2 + TILT_X * 0.6;
      m.rotation.y = TILT_Z * 0.6;
    }
    ctx.fxGroup.add(this.core, this.coreGlow, this.ringInner, this.ringOuter);

    // --- Disk + halo particles ---
    for (let i = 0; i < system.max; i++) this.spawnDiskParticle(system, i, true);
    system.life.fill(1);
  }

  private spawnDiskParticle(system: ParticleSystem, i: number, randomizeRadius: boolean): void {
    const rng = system.rng;
    const i3 = i * 3;
    const inDisk = rng() < 0.78;

    let x: number, y: number, z: number, vx: number, vy: number, vz: number;
    if (inDisk) {
      const r = randomizeRadius ? 1.5 + Math.pow(rng(), 1.55) * 11.5 : randRange(rng, 9.5, 13);
      const theta = rng() * TAU;
      const thick = 0.16 + r * 0.028;
      x = Math.cos(theta) * r;
      z = Math.sin(theta) * r;
      y = (rng() * 2 - 1) * thick * 0.5 + (rng() * 2 - 1) * thick * 0.5;
      const vCirc = Math.sqrt(GM_BASE / Math.max(r, 0.6));
      // tangential direction (counter-clockwise)
      const tx = -Math.sin(theta), tz = Math.cos(theta);
      vx = tx * vCirc - Math.cos(theta) * 0.42;
      vz = tz * vCirc - Math.sin(theta) * 0.42;
      vy = (rng() - 0.5) * 0.15;
    } else {
      // Spherical infall halo
      const theta = rng() * TAU;
      const phi = Math.acos(2 * rng() - 1);
      const r = randomizeRadius ? randRange(rng, 3.5, 14) : randRange(rng, 10, 14.5);
      x = Math.sin(phi) * Math.cos(theta) * r;
      y = Math.cos(phi) * r * 0.75;
      z = Math.sin(phi) * Math.sin(theta) * r;
      const inv = 1 / Math.max(0.001, Math.hypot(x, y, z));
      const fall = Math.sqrt(GM_BASE * inv) * 0.35;
      vx = -x * inv * fall + (rng() - 0.5) * 0.7;
      vy = -y * inv * fall + (rng() - 0.5) * 0.7;
      vz = -z * inv * fall + (rng() - 0.5) * 0.7;
    }

    // Apply disk tilt so the system reads volumetric from the default camera
    const cosX = Math.cos(TILT_X), sinX = Math.sin(TILT_X);
    const y1 = y * cosX - z * sinX, z1 = y * sinX + z * cosX;
    const vy1 = vy * cosX - vz * sinX, vz1 = vy * sinX + vz * cosX;
    const cosZ = Math.cos(TILT_Z), sinZ = Math.sin(TILT_Z);
    const x2 = x * cosZ - y1 * sinZ, y2 = x * sinZ + y1 * cosZ;
    const vx2 = vx * cosZ - vy1 * sinZ, vy2 = vx * sinZ + vy1 * cosZ;

    system.positions[i3] = x2; system.positions[i3 + 1] = y2; system.positions[i3 + 2] = z1;
    system.velocities[i3] = vx2; system.velocities[i3 + 1] = vy2; system.velocities[i3 + 2] = vz1;
    system.sizes[i] = randRange(rng, 0.35, 1.25);
    system.maxLife[i] = 1;
    system.life[i] = 1;
    system.miscA[i] = randRange(rng, 0, TAU); // shimmer phase
  }

  update(system: ParticleSystem, ctx: EffectContext): void {
    const p = ctx.params;
    const dt = sdt(ctx);
    const GM = GM_BASE * (0.35 + p.gravity * 0.85);
    const rotBoost = 0.35 + p.rotation * 0.85;
    const turb = p.turbulence;
    const soft = 0.55; // softening to avoid singularities

    for (let i = 0; i < system.activeCount; i++) {
      const i3 = i * 3;
      const px = system.positions[i3], py = system.positions[i3 + 1], pz = system.positions[i3 + 2];
      const r2 = px * px + py * py + pz * pz;
      const r = Math.sqrt(r2) + soft;

      // --- Event horizon absorption → respawn at the outer rim ---
      if (r < 1.12) {
        this.spawnDiskParticle(system, i, false);
        continue;
      }

      // --- Newtonian attraction ---
      const invR = 1 / r;
      const accel = GM * invR * invR;
      system.velocities[i3] -= px * invR * accel * dt;
      system.velocities[i3 + 1] -= py * invR * accel * dt;
      system.velocities[i3 + 2] -= pz * invR * accel * dt;

      // --- Rotation control: steer tangential speed toward target orbit ---
      const tx0 = -pz, tz0 = px;
      const tLen = Math.hypot(tx0, tz0);
      if (tLen > 0.001) {
        const tx = tx0 / tLen, tz = tz0 / tLen;
        const vTang = system.velocities[i3] * tx + system.velocities[i3 + 2] * tz;
        const desired = Math.sqrt(GM / r) * rotBoost;
        const delta = (desired - vTang) * Math.min(1, 1.6 * dt);
        system.velocities[i3] += tx * delta;
        system.velocities[i3 + 2] += tz * delta;
      }

      // --- Turbulence (differential streaming) ---
      if (turb > 0.01) {
        this.noise.curl3(px * 0.22, py * 0.22 + ctx.simTime * 0.25, pz * 0.22, this.tmpV);
        const tf = turb * 1.6;
        system.velocities[i3] += this.tmpV.x * tf * dt;
        system.velocities[i3 + 1] += this.tmpV.y * tf * dt;
        system.velocities[i3 + 2] += this.tmpV.z * tf * dt;
      }

      system.positions[i3] += system.velocities[i3] * dt;
      system.positions[i3 + 1] += system.velocities[i3 + 1] * dt;
      system.positions[i3 + 2] += system.velocities[i3 + 2] * dt;

      // --- Color: white-hot inner rim cooling outward ---
      const heat = Math.max(0, Math.min(1, 1.18 - r / 8.5));
      colorFromLUT(ctx, system.colors, i, Math.pow(heat, 0.75));
      // Fade in near horizon (absorption), twinkle everywhere
      const absorb = Math.min(1, Math.max(0, (r - 1.05) / 2.1));
      const twinkle = 0.72 + 0.28 * Math.sin(ctx.simTime * 2.6 + system.miscA[i] * 7.0 + r * 0.9);
      system.alphas[i] = absorb * twinkle;
      system.sizes[i] = 0.30 + Math.pow(Math.max(0, 1 - r / 14), 2.2) * 1.15;
    }

    // --- Animate photon ring / core glow ---
    const pulse = 1 + 0.05 * Math.sin(ctx.simTime * 3.1) + 0.028 * Math.sin(ctx.simTime * 7.7);
    this.ringInner.scale.setScalar(pulse);
    this.ringOuter.scale.setScalar(2 - pulse);
    (this.ringInner.material as THREE.MeshBasicMaterial).opacity = 0.75 + 0.25 * Math.sin(ctx.simTime * 5.3);
    this.coreGlow.scale.setScalar(2.6 + 0.55 * Math.sin(ctx.simTime * 2.2) + p.glow * 0.6);
    this.coreGlow.material.rotation = ctx.simTime * 0.05;
  }

  private tmpV = { x: 0, y: 0, z: 0 };
}
