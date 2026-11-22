import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS, SettingsStore, sanitizeSettings,
  type SettingsStorage,
} from '../src/state/SettingsStore';
import { PALETTES } from '../src/engine/palettes';

function memoryStorage(): SettingsStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
}

describe('sanitizeSettings', () => {
  it('clamps numeric fields into their valid ranges', () => {
    const s = sanitizeSettings({ particleCount: 999999, speed: -5, bloom: 99 });
    expect(s.particleCount).toBe(16000);
    expect(s.speed).toBe(0.1);
    expect(s.bloom).toBe(2);
  });
  it('drops NaN and non-finite numbers', () => {
    const s = sanitizeSettings({ gravity: NaN, rotation: Infinity, turbulence: undefined });
    expect(s.gravity).toBe(DEFAULT_SETTINGS.gravity);
    expect(s.rotation).toBe(DEFAULT_SETTINGS.rotation);
    expect(s.turbulence).toBe(DEFAULT_SETTINGS.turbulence);
  });
  it('rejects unknown palette ids', () => {
    expect(sanitizeSettings({ palette: 'does-not-exist' }).palette).toBe(DEFAULT_SETTINGS.palette);
    expect(sanitizeSettings({ palette: PALETTES[0].id }).palette).toBe(PALETTES[0].id);
  });
  it('rejects invalid quality presets', () => {
    expect(sanitizeSettings({ quality: 'potato' as never }).quality).toBe(DEFAULT_SETTINGS.quality);
    expect(sanitizeSettings({ quality: 'ultra' }).quality).toBe('ultra');
  });
  it('accepts boolean reduceMotion', () => {
    expect(sanitizeSettings({ reduceMotion: true }).reduceMotion).toBe(true);
    expect(sanitizeSettings({ reduceMotion: 'yes' as never }).reduceMotion).toBe(false);
  });
});

describe('SettingsStore', () => {
  it('starts from defaults when storage is empty', () => {
    const store = new SettingsStore(memoryStorage());
    expect(store.getState()).toEqual(DEFAULT_SETTINGS);
  });
  it('persists updates and reloads them', () => {
    const storage = memoryStorage();
    const store = new SettingsStore(storage);
    store.update({ particleCount: 9000, glow: 1.5 });
    const reloaded = new SettingsStore(storage);
    expect(reloaded.getState().particleCount).toBe(9000);
    expect(reloaded.getState().glow).toBe(1.5);
  });
  it('survives corrupted storage gracefully', () => {
    const storage = memoryStorage();
    storage.data.set('aether-settings-v1', '{not json!!');
    const store = new SettingsStore(storage);
    expect(store.getState()).toEqual(DEFAULT_SETTINGS);
  });
  it('notifies subscribers and stops after unsubscribe', () => {
    const store = new SettingsStore(memoryStorage());
    const seen: number[] = [];
    const off = store.subscribe((s) => seen.push(s.particleCount));
    store.update({ particleCount: 1200 });
    off();
    store.update({ particleCount: 3400 });
    expect(seen).toEqual([1200]);
  });
  it('reset() restores defaults and persists', () => {
    const storage = memoryStorage();
    const store = new SettingsStore(storage);
    store.update({ particleCount: 8000, bloom: 0.1 });
    store.reset();
    expect(store.getState()).toEqual(DEFAULT_SETTINGS);
    expect(new SettingsStore(storage).getState()).toEqual(DEFAULT_SETTINGS);
  });
});
