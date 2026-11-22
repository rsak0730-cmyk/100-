// AETHER Particle Lab — persistent settings store (localStorage-backed)
import type { QualityPreset } from '../engine/types';
import { clamp } from '../engine/utils';
import { DEFAULT_PALETTE, PALETTES } from '../engine/palettes';

export interface SettingsState {
  particleCount: number;   // 500 – 16000
  particleSize: number;    // 0.2 – 3.0 (multiplier)
  speed: number;           // 0.1 – 3.0 (simulation speed)
  gravity: number;         // 0 – 2
  attraction: number;      // 0 – 2
  repulsion: number;       // 0 – 2
  turbulence: number;      // 0 – 2
  rotation: number;        // 0 – 3
  opacity: number;         // 0.1 – 1
  glow: number;            // 0 – 2
  bloom: number;           // 0 – 2
  trail: number;           // 0 – 0.95
  palette: string;
  quality: QualityPreset;
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: SettingsState = {
  particleCount: 6500,
  particleSize: 1.0,
  speed: 1.0,
  gravity: 1.0,
  attraction: 1.0,
  repulsion: 1.0,
  turbulence: 0.8,
  rotation: 1.0,
  opacity: 0.95,
  glow: 1.0,
  bloom: 0.55,
  trail: 0.18,
  palette: DEFAULT_PALETTE,
  quality: 'balanced',
  reduceMotion: false,
};

const STORAGE_KEY = 'aether-settings-v1';

const RANGES: Record<Exclude<keyof SettingsState, 'palette' | 'quality' | 'reduceMotion'>, [number, number]> = {
  particleCount: [500, 16000],
  particleSize: [0.2, 3.0],
  speed: [0.1, 3.0],
  gravity: [0, 2],
  attraction: [0, 2],
  repulsion: [0, 2],
  turbulence: [0, 2],
  rotation: [0, 3],
  opacity: [0.1, 1],
  glow: [0, 2],
  bloom: [0, 2],
  trail: [0, 0.95],
};

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function sanitizeSettings(input: Partial<SettingsState>): SettingsState {
  const base = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(RANGES) as Array<keyof typeof RANGES>) {
    const v = input[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      base[key] = clamp(v, RANGES[key][0], RANGES[key][1]);
    }
  }
  if (typeof input.palette === 'string' && PALETTES.some((p) => p.id === input.palette)) {
    base.palette = input.palette;
  }
  if (input.quality === 'performance' || input.quality === 'balanced' || input.quality === 'ultra') {
    base.quality = input.quality;
  }
  if (typeof input.reduceMotion === 'boolean') base.reduceMotion = input.reduceMotion;
  return base;
}

export type SettingsListener = (state: SettingsState) => void;

export class SettingsStore {
  private listeners = new Set<SettingsListener>();
  private state: SettingsState;

  constructor(private storage?: SettingsStorage) {
    this.state = this.load();
  }

  private load(): SettingsState {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (raw) return sanitizeSettings(JSON.parse(raw) as Partial<SettingsState>);
    } catch {
      /* corrupted storage → fall back to defaults */
    }
    return { ...DEFAULT_SETTINGS };
  }

  getState(): SettingsState {
    return { ...this.state };
  }

  update(patch: Partial<SettingsState>): SettingsState {
    this.state = sanitizeSettings({ ...this.state, ...patch });
    this.persist();
    this.emit();
    return this.getState();
  }

  reset(): SettingsState {
    this.state = { ...DEFAULT_SETTINGS };
    this.persist();
    this.emit();
    return this.getState();
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private persist(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* storage full/blocked — non-fatal */
    }
  }

  private emit(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) listener(snapshot);
  }
}

/** Singleton bound to localStorage (falls back to in-memory when unavailable). */
export function createDefaultStore(): SettingsStore {
  try {
    const testKey = '__aether_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return new SettingsStore(window.localStorage);
  } catch {
    const memory = new Map<string, string>();
    return new SettingsStore({
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => { memory.set(k, v); },
      removeItem: (k) => { memory.delete(k); },
    });
  }
}
