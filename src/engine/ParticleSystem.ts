// AETHER Particle Lab — typed-array particle storage + GPU point rendering
// CPU simulation in flat Float32Arrays; rendered as THREE.Points with a
// custom ShaderMaterial (additive blending). No per-particle DOM/GL objects.

import * as THREE from 'three';
import { mulberry32 } from './utils';

export const MAX_PARTICLES = 16000;

export class ParticleSystem {
  readonly max = MAX_PARTICLES;

  /** Number of particles currently simulated + drawn. */
  activeCount = MAX_PARTICLES;

  readonly positions = new Float32Array(MAX_PARTICLES * 3);
  readonly velocities = new Float32Array(MAX_PARTICLES * 3);
  readonly colors = new Float32Array(MAX_PARTICLES * 3);
  readonly sizes = new Float32Array(MAX_PARTICLES);
  readonly alphas = new Float32Array(MAX_PARTICLES);
  readonly life = new Float32Array(MAX_PARTICLES);
  readonly maxLife = new Float32Array(MAX_PARTICLES);
  readonly seeds = new Float32Array(MAX_PARTICLES);
  /** Scratch per-particle slot A (effect-defined). */
  readonly miscA = new Float32Array(MAX_PARTICLES);
  /** Scratch per-particle slot B (effect-defined). */
  readonly miscB = new Float32Array(MAX_PARTICLES);

  /** Deterministic RNG; reseeded by the engine on reset/effect switch. */
  rng: () => number = mulberry32(1337);

  readonly geometry = new THREE.BufferGeometry();
  readonly material: THREE.ShaderMaterial;
  readonly points: THREE.Points;

  private readonly posAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly sizeAttr: THREE.BufferAttribute;
  private readonly alphaAttr: THREE.BufferAttribute;
  private readonly seedAttr: THREE.BufferAttribute;

  constructor(vertexShader: string, fragmentShader: string) {
    for (let i = 0; i < MAX_PARTICLES; i++) this.seeds[i] = Math.random();

    this.posAttr = new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage);
    this.colorAttr = new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage);
    this.alphaAttr = new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage);
    this.seedAttr = new THREE.BufferAttribute(this.seeds, 1);

    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('aColor', this.colorAttr);
    this.geometry.setAttribute('aSize', this.sizeAttr);
    this.geometry.setAttribute('aAlpha', this.alphaAttr);
    this.geometry.setAttribute('aSeed', this.seedAttr);
    this.geometry.setDrawRange(0, this.activeCount);
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1000);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uPixelRatio: { value: 1 },
        uSizeScale: { value: 1 },
        uScale: { value: 600 },
        uGlow: { value: 1 },
        uOpacity: { value: 1 },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  reseed(seed: number): void {
    this.rng = mulberry32(seed >>> 0);
  }

  setActiveCount(count: number): void {
    this.activeCount = Math.max(100, Math.min(this.max, Math.floor(count)));
    this.geometry.setDrawRange(0, this.activeCount);
  }

  /** Push mutated CPU buffers to the GPU. Call once per frame after simulation. */
  commit(updateColor = true): void {
    this.posAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    if (updateColor) this.colorAttr.needsUpdate = true;
  }

  killAll(): void {
    this.life.fill(0);
    this.alphas.fill(0);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
