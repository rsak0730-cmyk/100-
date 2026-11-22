// AETHER — control deck: effects gallery, sliders, palettes, quality, interaction
import { EFFECT_CATALOG } from '../effects/catalog';
import { PALETTES, getPalette } from '../engine/palettes';
import type { SettingsStore, SettingsState } from '../state/SettingsStore';
import type { QualityPreset } from '../engine/types';
import type { InteractionMode } from '../engine/ParticleEngine';
import { requireEl } from './StatsRail';

interface SliderSpec {
  key: keyof Pick<
    SettingsState,
    'particleCount' | 'particleSize' | 'speed' | 'gravity' | 'attraction' | 'repulsion' |
    'turbulence' | 'rotation' | 'opacity' | 'glow' | 'bloom' | 'trail'
  >;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const SLIDERS: SliderSpec[] = [
  { key: 'particleCount', label: 'Particle Count',  min: 500,  max: 16000, step: 100,  format: (v) => Math.round(v).toLocaleString('en-US') },
  { key: 'particleSize',  label: 'Particle Size',   min: 0.2,  max: 3,     step: 0.05, format: (v) => `${v.toFixed(2)}×` },
  { key: 'speed',         label: 'Simulation Speed',min: 0.1,  max: 3,     step: 0.05, format: (v) => `${v.toFixed(2)}×` },
  { key: 'gravity',       label: 'Gravity',         min: 0,    max: 2,     step: 0.05, format: (v) => v.toFixed(2) },
  { key: 'attraction',    label: 'Attraction',      min: 0,    max: 2,     step: 0.05, format: (v) => v.toFixed(2) },
  { key: 'repulsion',     label: 'Repulsion',       min: 0,    max: 2,     step: 0.05, format: (v) => v.toFixed(2) },
  { key: 'turbulence',    label: 'Turbulence',      min: 0,    max: 2,     step: 0.05, format: (v) => v.toFixed(2) },
  { key: 'rotation',      label: 'Rotation',        min: 0,    max: 3,     step: 0.05, format: (v) => v.toFixed(2) },
  { key: 'opacity',       label: 'Opacity',         min: 0.1,  max: 1,     step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
  { key: 'glow',          label: 'Glow Intensity',  min: 0,    max: 2,     step: 0.05, format: (v) => v.toFixed(2) },
  { key: 'bloom',         label: 'Bloom Strength',  min: 0,    max: 2,     step: 0.05, format: (v) => v.toFixed(2) },
  { key: 'trail',         label: 'Trail Length',    min: 0,    max: 0.95,  step: 0.01, format: (v) => `${Math.round((v / 0.95) * 100)}%` },
];

export class ControlPanel {
  private store: SettingsStore;
  private sliderInputs = new Map<string, { input: HTMLInputElement; value: HTMLSpanElement }>();
  private effectButtons = new Map<string, HTMLButtonElement>();
  private paletteButtons = new Map<string, HTMLButtonElement>();
  private onEffectSelected: (id: string) => void;
  private onInteractionMode: (mode: InteractionMode) => void;

  constructor(
    store: SettingsStore,
    callbacks: {
      onEffectSelected: (id: string) => void;
      onInteractionMode: (mode: InteractionMode) => void;
    },
  ) {
    this.store = store;
    this.onEffectSelected = callbacks.onEffectSelected;
    this.onInteractionMode = callbacks.onInteractionMode;

    this.buildEffectGrid();
    this.buildSliders();
    this.buildPaletteRow();
    this.wireQuality();
    this.wireReduceMotion();
    this.wireInteract();

    this.store.subscribe((state) => this.syncFromState(state));
    this.syncFromState(this.store.getState());
  }

  // ─────────────────────────── effects gallery
  private buildEffectGrid(): void {
    const grid = requireEl<HTMLDivElement>('effectGrid');
    grid.innerHTML = '';
    for (const meta of EFFECT_CATALOG) {
      const btn = document.createElement('button');
      btn.className = 'effect-card';
      btn.dataset.effect = meta.id;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-label', `${meta.name} — ${meta.tagline}`);
      btn.innerHTML = `
        <svg class="effect-card__icon" viewBox="0 0 24 24" width="24" height="24" fill="none"
             stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="${meta.icon}"/>
        </svg>
        <span class="effect-card__name">${meta.name}</span>
        <span class="effect-card__tag">${meta.tagline.toUpperCase()}</span>`;
      btn.addEventListener('click', () => this.selectEffect(meta.id));
      grid.appendChild(btn);
      this.effectButtons.set(meta.id, btn);
    }
  }

  selectEffect(id: string): void {
    this.onEffectSelected(id);
    this.setActiveEffect(id);
  }

  setActiveEffect(id: string): void {
    for (const [key, btn] of this.effectButtons) {
      const active = key === id;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    }
    const label = requireEl<HTMLParagraphElement>('activeEffectLabel');
    const meta = EFFECT_CATALOG.find((e) => e.id === id);
    label.textContent = meta ? meta.name : id;
  }

  // ─────────────────────────── parameter sliders
  private buildSliders(): void {
    const host = requireEl<HTMLDivElement>('sliderHost');
    host.innerHTML = '';
    for (const spec of SLIDERS) {
      const row = document.createElement('div');
      row.className = 'ctrl';
      row.innerHTML = `
        <div class="ctrl__head">
          <label class="ctrl__label" for="slider-${spec.key}">${spec.label}</label>
          <span class="ctrl__value" id="value-${spec.key}">—</span>
        </div>
        <input class="ctrl__input" id="slider-${spec.key}" type="range"
               min="${spec.min}" max="${spec.max}" step="${spec.step}"
               aria-label="${spec.label}" />`;
      host.appendChild(row);

      const input = row.querySelector<HTMLInputElement>('input')!;
      const value = row.querySelector<HTMLSpanElement>('.ctrl__value')!;
      const commit = () => {
        const v = Number(input.value);
        this.store.update({ [spec.key]: v } as Partial<SettingsState>);
      };
      input.addEventListener('input', () => {
        const v = Number(input.value);
        this.paintRange(input, spec, v);
        value.textContent = spec.format(v);
        if (spec.key !== 'particleCount') commit();
      });
      if (spec.key === 'particleCount') input.addEventListener('change', commit);
      this.sliderInputs.set(spec.key, { input, value });
    }
  }

  private paintRange(input: HTMLInputElement, spec: SliderSpec, v: number): void {
    const fill = ((v - spec.min) / (spec.max - spec.min)) * 100;
    input.style.setProperty('--fill', `${fill.toFixed(1)}%`);
  }

  // ─────────────────────────── palette swatches
  private buildPaletteRow(): void {
    const row = requireEl<HTMLDivElement>('paletteRow');
    row.innerHTML = '';
    for (const palette of PALETTES) {
      const btn = document.createElement('button');
      btn.className = 'palette-swatch';
      btn.dataset.palette = palette.id;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-label', `${palette.name} palette`);
      btn.title = palette.name;
      btn.style.background = `linear-gradient(150deg, ${palette.stops.join(', ')})`;
      btn.innerHTML = `<span>${palette.name.toUpperCase()}</span>`;
      btn.addEventListener('click', () => this.store.update({ palette: palette.id }));
      row.appendChild(btn);
      this.paletteButtons.set(palette.id, btn);
    }
  }

  // ─────────────────────────── quality segmented
  private wireQuality(): void {
    const seg = requireEl<HTMLDivElement>('qualitySeg');
    seg.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-quality]');
      if (!target) return;
      this.store.update({ quality: target.dataset.quality as QualityPreset });
    });
  }

  private wireReduceMotion(): void {
    const toggle = requireEl<HTMLInputElement>('reduceMotionToggle');
    toggle.addEventListener('change', () => this.store.update({ reduceMotion: toggle.checked }));
  }

  // ─────────────────────────── interaction segmented
  private wireInteract(): void {
    const seg = requireEl<HTMLDivElement>('interactSeg');
    seg.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-mode]');
      if (!target) return;
      const mode = target.dataset.mode as InteractionMode;
      this.onInteractionMode(mode);
      for (const btn of seg.querySelectorAll<HTMLButtonElement>('button[data-mode]')) {
        btn.classList.toggle('is-active', btn === target);
        btn.setAttribute('aria-checked', String(btn === target));
      }
    });
  }

  // ─────────────────────────── sync everything from store
  private syncFromState(state: SettingsState): void {
    for (const spec of SLIDERS) {
      const entry = this.sliderInputs.get(spec.key);
      if (!entry) continue;
      const v = state[spec.key];
      entry.input.value = String(v);
      this.paintRange(entry.input, spec, v);
      entry.value.textContent = spec.format(v);
    }

    const activePalette = getPalette(state.palette);
    for (const [id, btn] of this.paletteButtons) {
      const active = id === activePalette.id;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    }
    requireEl<HTMLSpanElement>('paletteName').textContent = activePalette.name;

    const qualitySeg = requireEl<HTMLDivElement>('qualitySeg');
    for (const btn of qualitySeg.querySelectorAll<HTMLButtonElement>('button[data-quality]')) {
      const active = btn.dataset.quality === state.quality;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    }

    requireEl<HTMLInputElement>('reduceMotionToggle').checked = state.reduceMotion;
  }
}
