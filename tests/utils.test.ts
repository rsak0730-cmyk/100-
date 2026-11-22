import { describe, it, expect } from 'vitest';
import {
  TAU, clamp, lerp, dampFactor, approach, mulberry32,
  randRange, randomUnitVector, hexToRgb, buildGradientLUT, sampleLUT,
} from '../src/engine/utils';

describe('clamp', () => {
  it('clamps below, above and inside ranges', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('lerp', () => {
  it('interpolates linearly and extrapolates', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(0, 10, 2)).toBe(20);
  });
});

describe('dampFactor', () => {
  it('is 0 at dt=0 and approaches 1 for large dt', () => {
    expect(dampFactor(2, 0)).toBe(0);
    expect(dampFactor(2, 100)).toBeGreaterThan(0.99);
  });
  it('is monotonic in dt', () => {
    expect(dampFactor(1.5, 0.01)).toBeLessThan(dampFactor(1.5, 0.05));
  });
});

describe('approach', () => {
  it('converges toward target without overshoot for small dt', () => {
    let v = 0;
    for (let i = 0; i < 240; i++) v = approach(v, 1, 4, 1 / 60);
    expect(v).toBeGreaterThan(0.99);
    expect(v).toBeLessThanOrEqual(1.0001);
  });
});

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
  it('produces values in [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('different seeds diverge', () => {
    const a = mulberry32(1), b = mulberry32(2);
    const seqA = [a(), a(), a()].join();
    const seqB = [b(), b(), b()].join();
    expect(seqA).not.toBe(seqB);
  });
});

describe('randRange', () => {
  it('stays within [min, max)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = randRange(rng, 3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(9);
    }
  });
});

describe('randomUnitVector', () => {
  it('returns (near-)unit vectors', () => {
    const rng = mulberry32(99);
    const v = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 500; i++) {
      randomUnitVector(rng, v);
      const len = Math.hypot(v.x, v.y, v.z);
      expect(len).toBeGreaterThan(0.99);
      expect(len).toBeLessThan(1.01);
    }
  });
});

describe('hexToRgb', () => {
  it('parses #rrggbb', () => {
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToRgb('#00ff00')).toEqual([0, 1, 0]);
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 1]);
  });
  it('parses #rgb shorthand', () => {
    expect(hexToRgb('#f00')).toEqual([1, 0, 0]);
  });
  it('falls back to white for garbage', () => {
    expect(hexToRgb('not-a-color')).toEqual([1, 1, 1]);
  });
});

describe('buildGradientLUT + sampleLUT', () => {
  it('builds a 256-entry LUT endpoints match stops', () => {
    const lut = buildGradientLUT(['#000000', '#ffffff']);
    expect(lut.length).toBe(256 * 3);
    expect(lut[0]).toBeCloseTo(0, 6);
    expect(lut[255 * 3]).toBeCloseTo(1, 6);
  });
  it('interpolates mid-ramp for multi-stop gradients', () => {
    const lut = buildGradientLUT(['#000000', '#ff0000', '#ffffff']);
    const mid = { r: 0, g: 0, b: 0 };
    sampleLUT(lut, 0.5, mid);
    expect(mid.r).toBeCloseTo(1, 1);
    expect(mid.g).toBeCloseTo(0, 1);
  });
  it('sampleLUT clamps out-of-range t', () => {
    const lut = buildGradientLUT(['#123456']);
    const a = { r: 0, g: 0, b: 0 };
    const b = { r: 0, g: 0, b: 0 };
    sampleLUT(lut, -5, a);
    sampleLUT(lut, 99, b);
    expect(a).toEqual(b);
  });
  it('handles empty stops gracefully (all white)', () => {
    const lut = buildGradientLUT([]);
    expect(lut[3]).toBe(1);
  });
});

describe('TAU', () => {
  it('equals 2π', () => expect(TAU).toBeCloseTo(Math.PI * 2, 12));
});
