// AETHER Particle Lab — shared type definitions

import type * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';

export type QualityPreset = 'performance' | 'balanced' | 'ultra';
export type InteractionMode = 'attract' | 'repel' | 'off';

export interface EffectParams {
  particleCount: number;
  particleSize: number;
  speed: number;
  gravity: number;
  attraction: number;
  repulsion: number;
  turbulence: number;
  rotation: number;
  opacity: number;
  glow: number;
  bloom: number;
  trail: number;
  palette: string;
  quality: QualityPreset;
  reduceMotion: boolean;
}

export interface PointerWell {
  /** World-space position of the interaction point. */
  x: number; y: number; z: number;
  /** Signed strength; engine passes mode separately. */
  strength: number;
  mode: 'attract' | 'repel';
}

export interface AudioLevels {
  bass: number;    // 0..1
  mid: number;     // 0..1
  treble: number;  // 0..1
  energy: number;  // 0..1 overall RMS-ish
  beat: boolean;   // true on the frame a beat is detected
  source: 'none' | 'microphone' | 'file' | 'demo';
}

export interface EffectContext {
  /** Frame delta in seconds, clamped. NOT scaled by sim speed. */
  dt: number;
  /** Scaled simulation time (accumulates dt * speed). */
  simTime: number;
  /** Real elapsed time in seconds. */
  time: number;
  params: EffectParams;
  /** Palette gradient LUT (256 * 3 RGB floats), rebuilt on palette change. */
  lut: Float32Array;
  /** Active pointer wells (0..N). */
  wells: PointerWell[];
  /** Live audio levels. */
  audio: AudioLevels;
  /** Group for effect-owned meshes (core spheres, ring, poles, bonds…). Cleared on switch. */
  fxGroup: THREE.Group;
  /** Request a shockwave ring visual at a world position. */
  spawnShockwave: (x: number, y: number, z: number, colorHex: number, maxRadius: number) => void;
}

export interface ParticleEffect {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly description: string;
  /** One-time placement of all particles after (re)spawn/reset. */
  init(system: ParticleSystem, ctx: EffectContext): void;
  /** Per-frame simulation step. Write positions/colors/alphas/sizes into the system buffers. */
  update(system: ParticleSystem, ctx: EffectContext): void;
  /** Optional cleanup of owned GPU resources (meshes in fxGroup are disposed by the engine). */
  dispose?(): void;
}
