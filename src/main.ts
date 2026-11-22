// AETHER — 3D Particle Laboratory · bootstrap & UI wiring
import './styles/main.css';
import { ParticleEngine, EngineError } from './engine/ParticleEngine';
import { createDefaultStore } from './state/SettingsStore';
import { AudioEngine } from './audio/AudioEngine';
import { ControlPanel } from './ui/ControlPanel';
import { StatsRail, requireEl } from './ui/StatsRail';
import { ToastStack } from './ui/Toast';
import { EFFECT_IDS, getEffectMeta } from './effects/catalog';
import type { EffectParams } from './engine/types';
import type { SettingsState } from './state/SettingsStore';

const APP_VERSION = '1.0.0';

function boot(): void {
  const toasts = new ToastStack(requireEl('toastStack'));
  const store = createDefaultStore();

  // Respect OS-level reduced motion on first visit
  const hasStoredPrefs = (() => {
    try { return window.localStorage.getItem('aether-settings-v1') !== null; } catch { return false; }
  })();
  if (!hasStoredPrefs && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    store.update({ reduceMotion: true, quality: 'performance' });
  }

  const initialReduced = store.getState().reduceMotion;
  document.documentElement.classList.toggle('reduce-motion', initialReduced);

  // Deep-link support: ?effect=blackhole
  const urlEffect = new URLSearchParams(window.location.search).get('effect');
  const initialEffect = urlEffect && EFFECT_IDS.includes(urlEffect) ? urlEffect : 'galaxy';

  // ── Engine ──────────────────────────────────────────────
  const stage = requireEl('stage');
  const enterBtn = requireEl<HTMLButtonElement>('enterLab');
  let engine: ParticleEngine;
  try {
    engine = new ParticleEngine(stage, store.getState() as EffectParams, initialEffect);
  } catch (err) {
    console.error('[aether] engine init failed:', err);
    const fallback = requireEl('webglFallback');
    fallback.hidden = false;
    enterBtn.disabled = true;
    enterBtn.querySelector('span')!.textContent = 'WEBGL2 REQUIRED';
    toasts.error(err instanceof EngineError ? err.message : 'The 3D engine failed to start.');
    return;
  }

  // ── Audio ───────────────────────────────────────────────
  const audio = new AudioEngine();
  engine.getAudioLevels = () => audio.getLevels();

  // ── Telemetry ───────────────────────────────────────────
  const statsRail = new StatsRail();
  engine.onStats = (stats) => statsRail.update(stats);
  statsRail.update(engine.getStats());

  engine.onAutoQuality = (step, direction, reason) => {
    if (direction === 'down') toasts.info(`Auto-quality engaged — ${reason}`);
    else toasts.success(`Headroom detected — ${reason}`);
    void step;
  };

  // ── Control deck ────────────────────────────────────────
  const panel = requireEl('panel');
  const panelToggle = requireEl<HTMLButtonElement>('panelToggle');
  const setPanelCollapsed = (collapsed: boolean) => {
    panel.classList.toggle('panel--collapsed', collapsed);
    panelToggle.setAttribute('aria-expanded', String(!collapsed));
  };

  const controlPanel = new ControlPanel(store, {
    onEffectSelected: (id) => {
      if (engine.setEffect(id)) {
        statsRail.update(engine.getStats());
      } else {
        toasts.error(`Unknown effect “${id}”.`);
      }
    },
    onInteractionMode: (mode) => engine.setInteractionMode(mode),
  });
  controlPanel.setActiveEffect(initialEffect);

  // Push settings into the engine whenever the store changes
  store.subscribe((state: SettingsState) => {
    engine.applySettings(state as EffectParams);
    document.documentElement.classList.toggle('reduce-motion', state.reduceMotion);
  });

  // ── Top bar actions ─────────────────────────────────────
  requireEl<HTMLButtonElement>('resetCameraBtn').addEventListener('click', () => {
    engine.resetCamera();
    toasts.success('Camera reset to home position.');
  });

  requireEl<HTMLButtonElement>('fullscreenBtn').addEventListener('click', () => {
    engine.toggleFullscreen().catch(() => {
      toasts.error('Fullscreen is blocked in this context (press F11 instead).');
    });
  });

  panelToggle.addEventListener('click', () => {
    setPanelCollapsed(!panel.classList.contains('panel--collapsed'));
  });
  requireEl<HTMLButtonElement>('panelCollapse').addEventListener('click', () => setPanelCollapsed(true));

  // ── Simulation actions ──────────────────────────────────
  const pauseBtn = requireEl<HTMLButtonElement>('pauseBtn');
  const pauseIcon = requireEl<HTMLElement>('pauseIcon');
  const pauseLabel = requireEl<HTMLSpanElement>('pauseLabel');
  const PAUSE_SVG = '<rect x="6.5" y="5" width="3.6" height="14" rx="1.1"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.1"/>';
  const PLAY_SVG = '<path d="M8.2 5.4v13.2a1.1 1.1 0 0 0 1.67.93l10.2-6.6a1.1 1.1 0 0 0 0-1.86L9.87 4.47a1.1 1.1 0 0 0-1.67.93Z"/>';
  const syncPauseUI = (paused: boolean) => {
    pauseIcon.innerHTML = paused ? PLAY_SVG : PAUSE_SVG;
    pauseIcon.setAttribute('viewBox', '0 0 24 24');
    pauseLabel.textContent = paused ? 'Resume simulation' : 'Pause simulation';
    pauseBtn.classList.toggle('is-paused', paused);
  };
  pauseBtn.addEventListener('click', () => syncPauseUI(engine.togglePause()));

  requireEl<HTMLButtonElement>('restartBtn').addEventListener('click', () => {
    engine.resetSimulation();
    toasts.success('Simulation re-seeded.');
  });

  // ── Reset settings modal ────────────────────────────────
  const modal = requireEl('confirmModal');
  const openModal = () => { modal.hidden = false; };
  const closeModal = () => { modal.hidden = true; };
  requireEl<HTMLButtonElement>('resetSettingsBtn').addEventListener('click', openModal);
  requireEl<HTMLButtonElement>('confirmCancel').addEventListener('click', closeModal);
  modal.querySelector('[data-close-modal]')!.addEventListener('click', closeModal);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
    // Space toggles pause when not typing in a control
    if (event.code === 'Space' && !(event.target as HTMLElement).closest('input, button, [role="switch"]')) {
      event.preventDefault();
      syncPauseUI(engine.togglePause());
    }
  });
  requireEl<HTMLButtonElement>('confirmReset').addEventListener('click', () => {
    store.reset();
    closeModal();
    engine.resetSimulation();
    toasts.success('All settings restored to factory defaults.');
  });

  // ── Audio wiring ────────────────────────────────────────
  const audioSourceLabel = requireEl<HTMLSpanElement>('audioSourceLabel');
  const audioStatus = requireEl<HTMLParagraphElement>('audioStatus');
  const micBtn = requireEl<HTMLButtonElement>('micBtn');
  const audioFileInput = requireEl<HTMLInputElement>('audioFile');
  const demoAudioBtn = requireEl<HTMLButtonElement>('demoAudioBtn');

  const setAudioUI = (mode: 'microphone' | 'file' | 'demo', detail?: string) => {
    micBtn.classList.toggle('is-active', mode === 'microphone');
    demoAudioBtn.classList.toggle('is-active', mode === 'demo');
    audioSourceLabel.textContent = mode === 'demo' ? 'demo signal' : mode === 'microphone' ? 'live microphone' : 'audio file';
    audioStatus.textContent =
      mode === 'demo'
        ? 'Demo beat driving the Audio Reactive effect. Load a track or enable the mic for the real thing.'
        : mode === 'microphone'
          ? 'Microphone live — bass, mids and treble are being analyzed at 60 Hz.'
          : `Playing “${detail ?? 'audio file'}”. Frequencies mapped to motion, color and scale.`;
  };

  micBtn.addEventListener('click', () => {
    audio.enableMicrophone()
      .then(() => { setAudioUI('microphone'); toasts.success('Microphone connected.'); })
      .catch((err: Error) => { setAudioUI('demo'); toasts.error(err.message); });
  });
  requireEl<HTMLButtonElement>('audioFileBtn').addEventListener('click', () => audioFileInput.click());
  audioFileInput.addEventListener('change', () => {
    const file = audioFileInput.files?.[0];
    if (!file) return;
    audio.loadFile(file)
      .then(() => { setAudioUI('file', file.name); toasts.success(`Loaded “${file.name}”.`); })
      .catch((err: Error) => toasts.error(err.message));
  });
  demoAudioBtn.addEventListener('click', () => {
    audio.useDemo();
    setAudioUI('demo');
    toasts.info('Demo signal engaged.');
  });

  // ── Landing → lab transition ────────────────────────────
  const landing = requireEl('landing');
  const app = requireEl('app');
  app.setAttribute('aria-hidden', 'false');

  const enter = () => {
    landing.classList.add('landing--leaving');
    landing.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => landing.remove(), 750);
    engine.resetSimulation(); // fresh burst on entry
    toasts.info(`${getEffectMeta(initialEffect)?.name ?? 'Galaxy'} — drag to orbit, click to detonate.`);
  };
  enterBtn.addEventListener('click', enter);

  // ── Automation bridge (used by e2e tests & power users) ──
  (window as unknown as Record<string, unknown>).__aether = {
    version: APP_VERSION,
    getStats: () => engine.getStats(),
    getEffectId: () => engine.getEffectId(),
    effectIds: EFFECT_IDS,
    setEffect: (id: string) => {
      const ok = engine.setEffect(id);
      if (ok) controlPanel.setActiveEffect(id);
      return ok;
    },
    togglePause: () => { const p = engine.togglePause(); syncPauseUI(p); return p; },
    resetSimulation: () => engine.resetSimulation(),
    resetCamera: () => engine.resetCamera(),
    burstCenter: () => engine.burstCenter(),
    getSettings: () => store.getState(),
    updateSettings: (patch: Partial<SettingsState>) => store.update(patch),
    getAudioMode: () => audio.getMode(),
  };

  window.addEventListener('beforeunload', () => {
    audio.dispose();
    engine.dispose();
  });
}

boot();
