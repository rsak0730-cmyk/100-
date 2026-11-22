// AETHER Particle Lab — shared math / random helpers

export const TAU = Math.PI * 2;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Frame-rate independent exponential damping factor. */
export function dampFactor(lambda: number, dt: number): number {
  return 1 - Math.exp(-lambda * dt);
}

/** Smooth critically-damped-ish approach used for spring motion. */
export function approach(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, dampFactor(lambda, dt));
}

/** Deterministic RNG (mulberry32) so simulations are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Random point on unit sphere (uniform). */
export function randomUnitVector(rng: () => number, out: { x: number; y: number; z: number }): void {
  const u = rng() * 2 - 1;
  const theta = rng() * TAU;
  const r = Math.sqrt(Math.max(0, 1 - u * u));
  out.x = r * Math.cos(theta);
  out.y = u;
  out.z = r * Math.sin(theta);
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || (h.length !== 6 && h.length !== 3)) {
    return [1, 1, 1];
  }
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Build a 256-entry gradient LUT from hex color stops. */
export function buildGradientLUT(stops: string[]): Float32Array {
  const lut = new Float32Array(256 * 3);
  const colors = stops.map(hexToRgb);
  if (colors.length === 0) {
    for (let i = 0; i < 256; i++) { lut[i * 3] = 1; lut[i * 3 + 1] = 1; lut[i * 3 + 2] = 1; }
    return lut;
  }
  if (colors.length === 1) {
    for (let i = 0; i < 256; i++) {
      lut[i * 3] = colors[0][0]; lut[i * 3 + 1] = colors[0][1]; lut[i * 3 + 2] = colors[0][2];
    }
    return lut;
  }
  const segments = colors.length - 1;
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * segments;
    const seg = Math.min(segments - 1, Math.floor(t));
    const local = t - seg;
    const a = colors[seg];
    const b = colors[seg + 1];
    lut[i * 3] = lerp(a[0], b[0], local);
    lut[i * 3 + 1] = lerp(a[1], b[1], local);
    lut[i * 3 + 2] = lerp(a[2], b[2], local);
  }
  return lut;
}

export function sampleLUT(lut: Float32Array, t: number, out: { r: number; g: number; b: number }): void {
  const i = clamp(Math.round(t * 255), 0, 255) * 3;
  out.r = lut[i]; out.g = lut[i + 1]; out.b = lut[i + 2];
}
