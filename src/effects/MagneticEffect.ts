// AETHER — Effect E: Magnetic Particles
// Two unlike poles; ferrous grains flow along the dipole field toward either
// pole (field-gradient attraction) with a stylized tangential swirl.
import * as THREE from 'three';
import type { ParticleEffect, EffectContext } from '../engine/types';
import type { ParticleSystem } from '../engine/ParticleSystem';
import { randRange, TAU } from '../engine/utils';
import { sdt, colorFromLUT } from './effectUtils';

const POLE_DIST = 3.4; // magnet axis = X

export class MagneticEffect implements ParticleEffect {
  readonly id = 'magnetic';
  readonly name = 'Magnetic Field';
  readonly tagline = 'Dipole · field lines';
  readonly description = 'A bar-magnet dipole: grains snap toward the poles along visible field lines.';

  private poleN!: THREE.Group;
  private poleS!: THREE.Group;
  private glowN!: THREE.Mesh;
  private glowS!: THREE.Mesh;

  init(system: ParticleSystem, ctx: EffectContext): void {
    // --- Field sources (visual) ---
    const n = this.makePole(0x50261c, 0xff6a3c, POLE_DIST);   // N — red
    const sPole = this.makePole(0x10263a, 0x35c4ff, -POLE_DIST); // S — cyan
    this.poleN = n.group; this.glowN = n.glow;
    this.poleS = sPole.group; this.glowS = sPole.glow;
    ctx.fxGroup.add(this.poleN, this.poleS);

    // --- Field line visualization (dipole: r = L sin²θ) ---
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x5f8dff, transparent: true, opacity: 0.34,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    for (let l = 0; l < 7; l++) {
      const L = 3.8 + l * 0.98;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 72; s++) {
        const theta = (s / 72) * Math.PI;
        const r = L * Math.sin(theta) * Math.sin(theta);
        const phi = (l * TAU) / 7;
        pts.push(new THREE.Vector3(
          r * Math.cos(theta),
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.sin(theta) * Math.sin(phi),
        ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      ctx.fxGroup.add(new THREE.Line(geo, lineMat));
    }

    // --- Seed grains in the field volume ---
    for (let i = 0; i < system.max; i++) this.respawnGrain(system, i, true);
  }

  private makePole(base: number, emissive: number, x: number): { group: THREE.Group; glow: THREE.Mesh } {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: base, emissive, emissiveIntensity: 0.85,
      roughness: 0.32, metalness: 0.72,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.7, 24), mat);
    body.rotation.z = Math.PI / 2; // cylinder Y-axis → X
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), mat);
    cap.position.x = 0.85;
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 12),
      new THREE.MeshBasicMaterial({ color: emissive, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glow.position.x = 0.98;
    group.add(body, cap, glow);
    group.position.set(x, 0, 0);
    return { group, glow };
  }

  private respawnGrain(system: ParticleSystem, i: number, randomAge: boolean): void {
    const rng = system.rng;
    const i3 = i * 3;
    system.positions[i3] = (rng() * 2 - 1) * 7.5;
    system.positions[i3 + 1] = (rng() * 2 - 1) * 7.5;
    system.positions[i3 + 2] = (rng() * 2 - 1) * 6.5;
    system.velocities[i3] = (rng() - 0.5) * 1.6;
    system.velocities[i3 + 1] = (rng() - 0.5) * 1.6;
    system.velocities[i3 + 2] = (rng() - 0.5) * 1.6;
    system.sizes[i] = randRange(rng, 0.4, 1.05);
    system.maxLife[i] = 1;
    system.life[i] = 1;
    system.miscA[i] = rng() * TAU;
    void randomAge;
  }

  update(system: ParticleSystem, ctx: EffectContext): void {
    const p = ctx.params;
    const dt = sdt(ctx);
    const t = ctx.simTime;
    const attract = 26 * (0.15 + p.attraction * 0.85);
    const spread = p.repulsion * 3.0;
    const damp = Math.exp(-(1.7 - Math.min(1.1, p.speed * 0.22)) * dt);

    for (let i = 0; i < system.activeCount; i++) {
      const i3 = i * 3;
      let px = system.positions[i3], py = system.positions[i3 + 1], pz = system.positions[i3 + 2];

      // Distance to each pole
      const dxN = px - POLE_DIST, dxS = px + POLE_DIST;
      const rN2 = dxN * dxN + py * py + pz * pz + 0.35;
      const rS2 = dxS * dxS + py * py + pz * pz + 0.35;
      const rN = Math.sqrt(rN2), rS = Math.sqrt(rS2);

      // Grains snap to either pole (ferrous — pole sign independent), ∝ 1/r²
      const fN = attract / rN2;
      const fS = attract / rS2;
      system.velocities[i3] += (-dxN / rN * fN - dxS / rS * fS) * dt;
      system.velocities[i3 + 1] += (-py / rN * fN - py / rS * fS) * dt;
      system.velocities[i3 + 2] += (-pz / rN * fN - pz / rS * fS) * dt;

      // Field-line swirl: perpendicular drift around the dipole axis
      const swirl = 0.9 + p.rotation * 1.15;
      system.velocities[i3 + 1] += -pz * swirl * dt * 0.4;
      system.velocities[i3 + 2] += py * swirl * dt * 0.4;

      // Weak gravity sag
      system.velocities[i3 + 1] -= p.gravity * 0.55 * dt;

      // Turbulence jitter
      if (p.turbulence > 0.01) {
        const j = p.turbulence * 0.85;
        system.velocities[i3] += Math.sin(t * 2.1 + system.miscA[i] * 9.0 + py * 0.7) * j * dt;
        system.velocities[i3 + 1] += Math.sin(t * 1.7 + system.miscA[i] * 7.0 + pz * 0.6) * j * dt;
        system.velocities[i3 + 2] += Math.cos(t * 1.9 + system.miscA[i] * 8.0 + px * 0.6) * j * dt;
      }

      // Repulsion: inflate grains away from the mid-plane
      if (spread > 0.01) {
        system.velocities[i3] += Math.sign(px || 0.01) * spread * dt;
        system.velocities[i3 + 1] += Math.sign(py || 0.01) * spread * dt;
      }

      system.velocities[i3] *= damp;
      system.velocities[i3 + 1] *= damp;
      system.velocities[i3 + 2] *= damp;

      px += system.velocities[i3] * dt;
      py += system.velocities[i3 + 1] * dt;
      pz += system.velocities[i3 + 2] * dt;

      // Recycle grains absorbed by a pole
      if ((rN < 0.72 || rS < 0.72) || Math.abs(px) > 16 || Math.abs(py) > 16 || Math.abs(pz) > 16) {
        this.respawnGrain(system, i, false);
        continue;
      }

      system.positions[i3] = px;
      system.positions[i3 + 1] = py;
      system.positions[i3 + 2] = pz;

      // Color: hot white at poles → orange/cyan tint by side → palette body
      const poleHeat = Math.max(0, 1 - Math.min(rN, rS) / 5.2);
      const side = px / POLE_DIST; // -1 S … +1 N
      colorFromLUT(ctx, system.colors, i, Math.min(1, 0.22 + poleHeat * 0.75));
      // Tint toward pole identity
      const tintN = 1 + Math.max(0, side) * 0.55;
      const tintS = 1 + Math.max(0, -side) * 0.55;
      system.colors[i3] *= tintN;
      system.colors[i3 + 2] *= tintS;
      system.alphas[i] = 0.45 + poleHeat * 0.55;
      system.sizes[i] = 0.32 + Math.pow(poleHeat, 1.7) * 0.85;
    }

    // Pole glow pulse
    const pulse = 1 + 0.12 * Math.sin(t * 2.6);
    this.glowN.scale.setScalar(pulse);
    this.glowS.scale.setScalar(pulse * 0.95);
  }
}
