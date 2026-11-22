import { describe, it, expect } from 'vitest';
import { EFFECT_CATALOG, EFFECT_IDS, getEffectMeta } from '../src/effects/catalog';
import { PALETTES, DEFAULT_PALETTE, getPalette } from '../src/engine/palettes';
import { buildGradientLUT } from '../src/engine/utils';

describe('effect catalog', () => {
  it('contains exactly 10 effects', () => {
    expect(EFFECT_CATALOG.length).toBe(10);
  });
  it('has unique ids', () => {
    expect(new Set(EFFECT_IDS).size).toBe(EFFECT_IDS.length);
  });
  it('every entry has name, tagline and a stroke icon path', () => {
    for (const meta of EFFECT_CATALOG) {
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.tagline.length).toBeGreaterThan(0);
      expect(meta.icon).toMatch(/^M/);
    }
  });
  it('getEffectMeta finds known ids and returns undefined otherwise', () => {
    expect(getEffectMeta('galaxy')?.name).toBe('Galaxy Spiral');
    expect(getEffectMeta('warp-drive')).toBeUndefined();
  });
});

describe('palettes', () => {
  it('has unique palette ids and valid hex stops', () => {
    const ids = PALETTES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PALETTES) {
      expect(p.stops.length).toBeGreaterThanOrEqual(2);
      for (const stop of p.stops) expect(stop).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
  it('DEFAULT_PALETTE exists', () => {
    expect(PALETTES.some((p) => p.id === DEFAULT_PALETTE)).toBe(true);
  });
  it('getPalette falls back to a valid palette for unknown ids', () => {
    expect(PALETTES).toContain(getPalette('nope'));
  });
  it('every palette builds a finite 256-entry LUT', () => {
    for (const p of PALETTES) {
      const lut = buildGradientLUT(p.stops);
      expect(lut.length).toBe(256 * 3);
      for (const v of lut) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
