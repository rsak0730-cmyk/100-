// AETHER — live telemetry rail (FPS, frame time, draw info)
import type { EngineStats } from '../engine/ParticleEngine';

export class StatsRail {
  private fpsEl = requireEl<HTMLSpanElement>('statFps');
  private msEl = requireEl<HTMLSpanElement>('statMs');
  private particlesEl = requireEl<HTMLSpanElement>('statParticles');
  private apiEl = requireEl<HTMLSpanElement>('statApi');
  private simEl = requireEl<HTMLSpanElement>('statSim');
  private effectEl = requireEl<HTMLSpanElement>('statEffect');
  private qualityEl = requireEl<HTMLSpanElement>('statQuality');

  update(stats: EngineStats): void {
    this.fpsEl.textContent = String(stats.fps);
    this.fpsEl.style.color = stats.fps >= 50 ? '#a7f3d0' : stats.fps >= 30 ? '#fde68a' : '#fda4b3';
    this.msEl.textContent = `${stats.frameMs.toFixed(1)} ms`;
    this.particlesEl.textContent = stats.particles.toLocaleString('en-US');
    this.apiEl.textContent = stats.renderer;
    this.apiEl.title = stats.gpu;
    this.simEl.textContent = 'CPU·GPU';
    this.simEl.title = stats.simMode;
    this.effectEl.textContent = stats.effectName.toUpperCase();
    this.qualityEl.textContent = stats.autoQuality === 'full' ? 'FULL' : stats.autoQuality.replace('-', '·').toUpperCase();
    this.qualityEl.style.color = stats.autoQuality === 'full' ? '#a5f3fc' : '#fde68a';
  }
}

export function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`AETHER: missing required element #${id}`);
  return el as T;
}
