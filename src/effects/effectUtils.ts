// AETHER Particle Lab — shared effect helpers
import type { EffectContext } from '../engine/types';
import { clamp } from '../engine/utils';

/** Delta scaled by the simulation speed setting. */
export function sdt(ctx: EffectContext): number {
  return ctx.dt * ctx.params.speed;
}

/** Write a LUT gradient sample into the color buffer at particle i. */
export function colorFromLUT(ctx: EffectContext, colors: Float32Array, i: number, t: number): void {
  const idx = clamp(Math.round(clamp(t, 0, 1) * 255), 0, 255) * 3;
  const o = i * 3;
  colors[o] = ctx.lut[idx];
  colors[o + 1] = ctx.lut[idx + 1];
  colors[o + 2] = ctx.lut[idx + 2];
}

/** Smooth alpha envelope from normalized life fraction. */
export function lifeEnvelope(lifeFrac: number): number {
  const fadeIn = clamp((1 - lifeFrac) / 0.12, 0, 1);       // ramps up right after spawn
  const fadeOut = clamp(lifeFrac / 0.28, 0, 1);            // ramps down before death
  return fadeIn * fadeOut;
}

import * as THREE from 'three';

let cachedGlowTexture: THREE.CanvasTexture | null = null;

/** Procedural radial-gradient glow sprite (no external assets). */
export function getGlowTexture(): THREE.CanvasTexture {
  if (cachedGlowTexture) return cachedGlowTexture;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx2d = canvas.getContext('2d')!;
  const grad = ctx2d.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(0, 0, size, size);
  cachedGlowTexture = new THREE.CanvasTexture(canvas);
  cachedGlowTexture.colorSpace = THREE.SRGBColorSpace;
  return cachedGlowTexture;
}
