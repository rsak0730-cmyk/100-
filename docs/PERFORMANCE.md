# AETHER — Performance Notes & Measurement Methodology

## Honest framing first

Every frame in AETHER is simulated on the CPU and rendered as one draw call of
WebGL2 point sprites. The numbers below come from **headless Chromium running
SwiftShader (software GL)** — a deliberately *pessimistic* environment with no
GPU acceleration, no parallel shader cores and limited fill-rate. They are a
correctness/sanity floor, not a target. On any discrete or even integrated GPU
(Mali/Adreno/Apple Silicon iGPUs included), frame rates are far higher because
the fragment work is trivial (one textured point per particle, additive blend).

## What was measured (SwiftShader, headless, 1920×1080 CSS px)

| Scenario | Result |
|---|---|
| Default scene (Galaxy Spiral, 6 500 particles), Balanced preset | ≈ 24–30 FPS |
| Lightest load (e.g. Wave Field idle), Balanced preset | ≈ 27–56 FPS observed |
| AUTO quality governor under sustained load | steps down (pixel-cap 1.5 → 1.25 → 1.0, countScale 0.85 → 0.7 → 0.5), restores after ~6 s above 55 FPS |
| Adaptive gate unit tests | 44/44 pass |
| e2e sanity floor (CI gate) | ≥ 8 FPS — measured ≈ 20 FPS under SwiftShader |

Frame time is displayed live on the telemetry rail (bottom-left: FPS, frame ms,
particle count, API, sim model, effect, quality).

## Cost model

Per frame the app pays:

1. **CPU simulation** — O(n) over the active particle count using flat
   `Float32Array` structure-of-arrays buffers (positions, velocities, colors,
   alphas, sizes). No allocations, no object churn, no GC pressure in the hot
   loop. Typical effects are simple vector math; Nebula/Smoke add curl noise.
2. **One attribute re-upload** — colors/alphas/sizes are rewritten per frame
   (positions too when physics moves them, i.e. always). At 16 000 particles
   that is ~ (3+3+1+1+1) × 4 B × 16 000 ≈ 550 KB/frame of buffer traffic —
   comfortably inside PCIe/IPC budgets.
3. **One draw call** — additive point sprites; overdraw is the only real GPU
   risk, mitigated by the size clamp and per-particle alpha.
4. **Post** — UnrealBloomPass (0.55 strength) + ACES filmic tone map. Bloom is
   the most expensive pass on large viewports; the `trail` and `bloom` sliders
   are the two levers exposed to the user.

## Adaptive quality

`AdaptiveQuality` keeps a rolling window (2.5 s) of frame times. Below 40 FPS
it steps down one level (step 1: pixel cap 1.5 / 85 % particles · step 2:
pixel cap 1.25 / 70 % · step 3: pixel cap 1.0 / 50 % — "survival"); above
55 FPS for a cumulative ~6 s it steps back up. Hysteresis prevents thrash.
The manual radio group pins device-pixel-ratio caps instead: Performance
1.0 · Balanced 1.5 (default) · Ultra 2.0. Transitions surface as toast
notifications and in the telemetry rail (`FULL` / `AUTO-1…3`).

## Practical guidance

- **16 000 particles**: needs a real GPU for 60 FPS; fine for showcase
  machines. Start here for demos.
- **6 500 (default)**: smooth everywhere with hardware GL; ~20–30 FPS under
  pure software rendering.
- **≤ 2 000**: comfortable even on very old hardware.
- If FPS sags, drop `Particle Count` first, then `Bloom`, then pin Quality
  to `Performance` (pixel ratio cap 1.0) and let AUTO take over.

## How to reproduce

```bash
npm ci
npm run build
npm run preview -- --port 4173 &     # serves dist/
npm run e2e                          # writes e2e/report.json + screenshots/
```

`e2e/report.json` records per-check results including the FPS floor probe;
`e2e/screenshots/` holds a full sweep (landing, 10 effects, mobile viewport)
suitable for visual regression eyeballing.
