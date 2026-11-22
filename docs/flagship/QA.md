# Flagship QA — 2026-11-22

## Executed
- TypeScript and Vite production build passed.
- Unit tests: 70 passed, including 5 new flagship configuration checks. 44 tests belong to retained legacy particle-lab code and are not showroom coverage.
- Final Chromium suite: **43 assertions passed**, no captured page/console errors. Chromium ran headless with software WebGL (SwiftShader).
- The real optimized GLB loaded before the suite continued.
- Tested actual canvas raycasting by clicking the central car and asserting its context panel.
- Master power on/off produced different rendered canvas screenshots.
- Exercised all seven named lighting presets; temperature, master/group brightness, all six light-bank toggles, fine adjustments, shadows and lighting reset. Preset assertions check UI state; they are not pixel-perfect physical-light measurements for each preset.
- Exercised all four environment time values; outdoor brightness and window reflection sliders.
- Used registered reception geometry via accessible object selector; focused reception; selected lounge and wide camera destinations.
- Tested panel collapse/expand, credits dialog, performance readout, Low quality selection and mobile overflow.
- Emulated mobile touch drag and two-finger pinch using Chrome DevTools touch events; each changed the rendered canvas screenshot. These are emulation checks, not real-phone validation.
- Tested keyboard arrow navigation between tool tabs.
- Desktop screenshots: 1440 × 1000. Mobile viewport: 390 × 844. Desktop, architectural, lounge, reception and mobile screenshots captured and visually inspected.

## Issues fixed during QA
- Replaced unsupported fullscreen/target glyphs with inline SVG icons.
- Removed a legacy floor disk that obscured the new tiled stone floor.
- Corrected specification-stand support stems and long 3D sign layout.
- Clipped the collapsed mobile drawer within the showroom shell to prevent horizontal overflow.
- Contextual camera labels no longer identify the lounge as the centre-stage vehicle.
- Spotlight and vehicle presentation use independently controllable actual light objects.
- Reduced software-WebGL test resolution after the initial desktop screenshot; no physical device frame rate is claimed.

## Not verified / limitations
- No real Android, iPhone, tablet or desktop GPU benchmark.
- Render-time/FPS/draw-call/geometry/texture telemetry is implemented, but no sustained FPS target, GPU memory limit or leak-free guarantee is established. Renderer object counts are not byte-accurate GPU memory.
- WebGL fallback is implemented but was not independently exercised with WebGL forcibly disabled.
- Fullscreen support varies by browser/embedding; button handles rejection, but successful fullscreen was not automated.
- Physical photometric correctness, advanced reflection quality, external HDRI and architectural collision physics are not claimed.
- Auto quality reduction is implemented; sustained-load switching is not an assertion in the browser suite.
