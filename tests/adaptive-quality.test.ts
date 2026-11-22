import { describe, it, expect } from 'vitest';
import { AdaptiveQuality, AUTO_STEPS } from '../src/engine/AdaptiveQuality';

/** Feed n seconds of frames at a fixed fps in one window. */
function feedWindow(aq: AdaptiveQuality, fps: number, seconds: number, startMs: number): number {
  const frames = Math.round(fps * seconds);
  let now = startMs;
  const dt = 1 / fps;
  let decision = null as ReturnType<AdaptiveQuality['update']>;
  for (let i = 0; i < frames; i++) {
    now += dt * 1000;
    decision = aq.update(dt, now) ?? decision;
  }
  return now;
}

describe('AdaptiveQuality', () => {
  it('starts at step 0 (full quality)', () => {
    const aq = new AdaptiveQuality(2500);
    expect(aq.currentStep).toBe(0);
  });

  it('steps down after a sustained low-FPS window', () => {
    const aq = new AdaptiveQuality(2500);
    let now = feedWindow(aq, 30, 3, 1000); // below the 40fps floor
    expect(aq.currentStep).toBe(1);
    now = feedWindow(aq, 30, 3, now);
    expect(aq.currentStep).toBe(2);
  });

  it('never exceeds the lowest step', () => {
    const aq = new AdaptiveQuality(2500);
    let now = 1000;
    for (let i = 0; i < 10; i++) now = feedWindow(aq, 20, 3, now);
    expect(aq.currentStep).toBe(AUTO_STEPS.length - 1);
  });

  it('requires sustained good windows before stepping back up (hysteresis)', () => {
    const aq = new AdaptiveQuality(2500);
    let now = feedWindow(aq, 25, 3, 1000);  // drop to step 1
    expect(aq.currentStep).toBe(1);
    now = feedWindow(aq, 60, 2.6, now);     // mixed 25→60 window: not yet
    expect(aq.currentStep).toBe(1);
    now = feedWindow(aq, 60, 2.6, now);     // ~2.6s of 60fps credit
    expect(aq.currentStep).toBe(1);
    now = feedWindow(aq, 60, 2.6, now);     // ~5.2s of credit — still not enough
    expect(aq.currentStep).toBe(1);
    now = feedWindow(aq, 60, 2.6, now);     // >6s of cumulative 60fps credit
    expect(aq.currentStep).toBe(0);
  });

  it('holds steady quality inside the 40–55 fps band', () => {
    const aq = new AdaptiveQuality(2500);
    let now = 1000;
    for (let i = 0; i < 4; i++) now = feedWindow(aq, 48, 3, now);
    expect(aq.currentStep).toBe(0);
  });

  it('reports a reason on step change and fires onStepChange', () => {
    const aq = new AdaptiveQuality(2500);
    const events: Array<[number, 'down' | 'up']> = [];
    aq.onStepChange = (step, direction) => events.push([step, direction]);
    feedWindow(aq, 25, 3, 1000);
    expect(events).toEqual([[1, 'down']]);
  });

  it('reset() returns to full quality', () => {
    const aq = new AdaptiveQuality(2500);
    feedWindow(aq, 25, 3, 1000);
    aq.reset();
    expect(aq.currentStep).toBe(0);
  });

  it('AUTO_STEPS are strictly ordered from full to survival', () => {
    for (let i = 1; i < AUTO_STEPS.length; i++) {
      expect(AUTO_STEPS[i].countScale).toBeLessThan(AUTO_STEPS[i - 1].countScale);
    }
    expect(AUTO_STEPS[AUTO_STEPS.length - 1].pixelCap).toBe(1.0);
  });
});
