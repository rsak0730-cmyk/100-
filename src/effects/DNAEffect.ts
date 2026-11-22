// AETHER — Effect I: Molecular Helix
// Double-helix strands + rungs as a spring-mass system with Ångström-style
// bond rendering. Click to knock it out of equilibrium.
import * as THREE from 'three';
import type { ParticleEffect, EffectContext } from '../engine/types';
import type { ParticleSystem } from '../engine/ParticleSystem';
import { randRange, TAU, clamp } from '../engine/utils';
import { SimplexNoise } from '../engine/SimplexNoise';
import { sdt, colorFromLUT } from './effectUtils';

const TURNS = 3.1;
const HELIX_HEIGHT = 13.2;
const HELIX_RADIUS = 2.65;
const MAX_BONDS = (16000 / 2) * 2 + 4200; // backbone + rungs

export class DNAEffect implements ParticleEffect {
  readonly id = 'dna';
  readonly name = 'Molecular Helix';
  readonly tagline = 'Bonds · springs';
  readonly description = 'Double-helix nucleotide strands held by spring physics, bonds rendered as glowing links.';

  private noise = new SimplexNoise(555);
  private bonds!: THREE.LineSegments;
  private bondPos!: Float32Array;
  private bondColor!: Float32Array;

  init(system: ParticleSystem, ctx: EffectContext): void {
    const geo = new THREE.BufferGeometry();
    this.bondPos = new Float32Array(MAX_BONDS * 2 * 3);
    this.bondColor = new Float32Array(MAX_BONDS * 2 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.bondPos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.bondColor, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.38,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.bonds = new THREE.LineSegments(geo, mat);
    this.bonds.frustumCulled = false;
    this.bonds.renderOrder = 5;
    ctx.fxGroup.add(this.bonds);

    for (let i = 0; i < system.max; i++) {
      const i3 = i * 3;
      const strand = i % 2 === 0 ? 0 : 1;         // even = A, odd = B
      const target = this.helixTarget(i, 0, system.max / 2, strand);
      system.positions[i3] = target[0] + (system.rng() - 0.5) * 0.4;
      system.positions[i3 + 1] = target[1] + (system.rng() - 0.5) * 0.4;
      system.positions[i3 + 2] = target[2] + (system.rng() - 0.5) * 0.4;
      system.velocities[i3] = 0; system.velocities[i3 + 1] = 0; system.velocities[i3 + 2] = 0;
      system.sizes[i] = randRange(system.rng, 0.55, 0.9);
      system.maxLife[i] = 1;
      system.life[i] = 1;
      system.miscA[i] = clamp((i / 2 / (system.max / 2)) * 4, 0, 3.999); // nucleotide slot 0..3
      system.miscB[i] = strand;
    }
  }

  private helixTarget(i: number, phase: number, half: number, strand: number): [number, number, number] {
    const pairIndex = Math.floor(i / 2);
    const t = half > 1 ? pairIndex / (half - 1) : 0;
    const angle = t * TURNS * TAU + phase + strand * Math.PI;
    const x = (t - 0.5) * HELIX_HEIGHT;   // axis laid along X — side-on view
    return [x, Math.cos(angle) * HELIX_RADIUS, Math.sin(angle) * HELIX_RADIUS];
  }

  update(system: ParticleSystem, ctx: EffectContext): void {
    const p = ctx.params;
    const dt = Math.min(sdt(ctx), 0.033);
    const t = ctx.simTime;
    const half = Math.floor(system.activeCount / 2);
    const spring = 30 + p.attraction * 18;
    const damp = Math.exp(-4.6 * dt);
    const rotSpeed = 0.16 + p.rotation * 0.4;
    const phase = t * rotSpeed;

    const c3 = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < system.activeCount; i++) {
      const i3 = i * 3;
      const strand = system.miscB[i] | 0;
      const pairIndex = Math.floor(i / 2);
      if (pairIndex >= half) { system.alphas[i] = 0; continue; }
      const tt = half > 1 ? pairIndex / (half - 1) : 0;
      const angle = tt * TURNS * TAU + phase + strand * Math.PI;
      const tx = (tt - 0.5) * HELIX_HEIGHT;
      const ty = Math.cos(angle) * HELIX_RADIUS;
      const tz = Math.sin(angle) * HELIX_RADIUS;

      // Spring toward the moving parametric target
      system.velocities[i3] += (tx - system.positions[i3]) * spring * dt;
      system.velocities[i3 + 1] += (ty - system.positions[i3 + 1]) * spring * dt;
      system.velocities[i3 + 2] += (tz - system.positions[i3 + 2]) * spring * dt;

      // Turbulence wobble
      if (p.turbulence > 0.01) {
        this.noise.curl3(system.positions[i3] * 0.5, system.positions[i3 + 1] * 0.5 + t * 0.3, system.positions[i3 + 2] * 0.5, c3);
        const tf = p.turbulence * 1.15;
        system.velocities[i3] += c3.x * tf * dt;
        system.velocities[i3 + 1] += c3.y * tf * dt;
        system.velocities[i3 + 2] += c3.z * tf * dt;
      }

      system.velocities[i3] *= damp;
      system.velocities[i3 + 1] *= damp;
      system.velocities[i3 + 2] *= damp;

      system.positions[i3] += system.velocities[i3] * dt;
      system.positions[i3 + 1] += system.velocities[i3 + 1] * dt;
      system.positions[i3 + 2] += system.velocities[i3 + 2] * dt;

      // Three tiers: dim backbone rail beads · bright atom beads · hidden
      const slot = system.miscA[i] | 0;
      colorFromLUT(ctx, system.colors, i, 0.14 + slot * 0.24 + strand * 0.08);
      if (pairIndex % 12 === 0) {
        system.alphas[i] = 0.92;                       // atom bead
        system.sizes[i] = 0.62 + slot * 0.05;
      } else if (pairIndex % 2 === 0) {
        system.alphas[i] = 0.28;                       // backbone rail
        system.sizes[i] = 0.30;
      } else {
        system.alphas[i] = 0;                          // parked — springs still integrate
        system.sizes[i] = 0.01;
      }
    }

    this.rebuildBonds(system, half);
  }

  private rebuildBonds(system: ParticleSystem, half: number): void {
    const pairCount = half;
    let bonds = 0;
    const P = this.bondPos;
    const C = this.bondColor;

    const pushBond = (a: number, b: number, r: number, g: number, bl: number): boolean => {
      if (bonds >= MAX_BONDS) return false;
      const a3 = a * 3, b3 = b * 3, o = bonds * 6;
      P[o] = system.positions[a3]; P[o + 1] = system.positions[a3 + 1]; P[o + 2] = system.positions[a3 + 2];
      P[o + 3] = system.positions[b3]; P[o + 4] = system.positions[b3 + 1]; P[o + 5] = system.positions[b3 + 2];
      C[o] = r; C[o + 1] = g; C[o + 2] = bl;
      C[o + 3] = r; C[o + 4] = g; C[o + 5] = bl;
      bonds++;
      return true;
    };

    // Strand backbones link successive visible pairs
    for (let pair = 0; pair < pairCount - 2; pair += 2) {
      if (!pushBond(pair * 2, (pair + 2) * 2, 0.45, 0.85, 1.0)) break;
    }
    if (bonds < MAX_BONDS) {
      for (let pair = 0; pair < pairCount - 2; pair += 2) {
        if (!pushBond(pair * 2 + 1, (pair + 2) * 2 + 1, 0.9, 0.5, 0.95)) break;
      }
    }
    // ~24 rungs, evenly spaced along the strand
    if (bonds < MAX_BONDS) {
      const rungStride = Math.max(2, Math.floor(pairCount / 24));
      for (let pair = 0; pair < pairCount; pair += rungStride) {
        const iA = pair * 2, iB = pair * 2 + 1;
        if (iB >= system.activeCount) break;
        if (!pushBond(iA, iB, 0.95, 0.92, 0.75)) break;
      }
    }

    const geo = this.bonds.geometry;
    geo.setDrawRange(0, bonds * 2);
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }
}
