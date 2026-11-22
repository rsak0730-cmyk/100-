// AETHER Particle Lab — adaptive quality manager
// Watches rolling average FPS and steps pixel-ratio / particle budget down
// under sustained load, and back up when headroom returns. Hysteresis
// prevents oscillation.

export interface AutoQualityDecision {
  /** 0 = full quality … 3 = survival mode */
  step: number;
  /** Max device-pixel-ratio multiplier allowed. */
  pixelCap: number;
  /** Fraction of the requested particle budget to simulate/draw. */
  countScale: number;
  reason: string;
}

export const AUTO_STEPS: ReadonlyArray<Omit<AutoQualityDecision, 'step' | 'reason'>> = [
  { pixelCap: Infinity, countScale: 1.0 },   // defer to preset
  { pixelCap: 1.5,      countScale: 0.85 },
  { pixelCap: 1.25,     countScale: 0.7 },
  { pixelCap: 1.0,      countScale: 0.5 },
];

export class AdaptiveQuality {
  private frameTimes: number[] = [];
  private windowStart = 0;
  private step = 0;
  private goodSeconds = 0;
  private readonly windowMs: number;

  /** Event hook — engine wires this to toasts / stats. */
  onStepChange: ((step: number, direction: 'down' | 'up', reason: string) => void) | null = null;

  constructor(windowMs = 2500) {
    this.windowMs = windowMs;
  }

  get currentStep(): number {
    return this.step;
  }

  reset(): void {
    this.frameTimes.length = 0;
    this.windowStart = 0;
    this.step = 0;
    this.goodSeconds = 0;
  }

  /** Feed one frame; returns a decision only when the step changes. */
  update(frameDtSeconds: number, nowMs: number): AutoQualityDecision | null {
    this.frameTimes.push(frameDtSeconds);
    if (this.windowStart === 0) {
      this.windowStart = nowMs;
      return null;
    }
    if (nowMs - this.windowStart < this.windowMs) return null;

    const samples = this.frameTimes;
    this.frameTimes = [];
    this.windowStart = nowMs;
    if (samples.length < 10) return null;

    const avgDt = samples.reduce((a, b) => a + b, 0) / samples.length;
    const fps = 1 / Math.max(1e-6, avgDt);

    let newStep = this.step;
    let reason = '';
    if (fps < 40 && this.step < AUTO_STEPS.length - 1) {
      newStep = this.step + 1;
      reason = `average ${fps.toFixed(0)} FPS over the last ${(this.windowMs / 1000).toFixed(1)}s — reducing load`;
      this.goodSeconds = 0;
    } else if (fps > 55 && this.step > 0) {
      this.goodSeconds += this.windowMs / 1000;
      if (this.goodSeconds >= 6) {
        newStep = this.step - 1;
        reason = `average ${fps.toFixed(0)} FPS — restoring quality`;
        this.goodSeconds = 0;
      }
    } else {
      this.goodSeconds = 0;
    }

    if (newStep === this.step) return null;

    const direction = newStep > this.step ? 'down' : 'up';
    this.step = newStep;
    this.onStepChange?.(newStep, direction, reason);
    const preset = AUTO_STEPS[newStep];
    return { step: newStep, pixelCap: preset.pixelCap, countScale: preset.countScale, reason };
  }
}
