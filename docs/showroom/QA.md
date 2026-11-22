# QA — 2026-11-22

- `npm run build`: PASS (includes TypeScript checks).
- `npm test`: 48 passed. Only four catalogue tests are new showroom tests; 44 are retained legacy particle-lab tests.
- `npm run audit:assets`: PASS structural GLB checks; all resources embedded, hash recorded. Not an OEM geometry validation.
- `npm run e2e`: 11 Chromium assertions passed, no captured browser errors.
- Browser: packaged Chromium headless with SwiftShader software WebGL.
- Desktop screenshot: 1440 × 950. Mobile viewport emulation: 390 × 844. Final screenshots inspected; corrected cropped mobile vehicle by adapting field of view.
- Browser checks: canvas exists; initial G82 label; anatomy disabled; paint selection label updates; catalogue search; unavailable state; no stale identity; unavailable paint disabled; keyboard navigation; no horizontal mobile overflow; no browser errors.
- Finish and top-camera controls were clicked without browser errors. Paint shader output, exact camera orientation, touch swipes, fullscreen, all environment variants and turntable timing were not independently asserted.
- No real Android/iPhone device test, GPU benchmark, sustained FPS or memory measurement performed.
- Exterior model loaded twice during browser testing, including after switching through unavailable entries.
- Preview host HTTP 200.
- Deployment NOT complete: Pages remains `legacy`, workflow not on default branch. No merge performed.


## Lossless delivery update
- Source: 22,739,084 bytes; served variant: 15,276,684 bytes, 32.8% smaller.
- Optimization verification: 4,518,344 attribute values compared exactly; triangles equivalent, texture bytes/materials/node transforms unchanged.
- TypeScript/production build passed. Unit suite: 56 passed (includes 8 loading/cache tests).
- All 11 existing Chromium assertions passed with the Meshopt variant and bundled decoder, with no captured browser errors. Includes loading after vehicle switches.
- Caching hit, unavailable storage and corrupt-cache fallback are unit-tested; cross-session physical-device caching is not measured.
- No claim of a specific first-load time, frame rate improvement or real-phone validation.


## Showroom and no-timeout update
- Removed the model-loading timer and its timeout message. Kept explicit request cancellation for vehicle switches and actual failure handling.
- Production/TypeScript build and 60 unit tests passed, including four lighting/deadline regression tests.
- 17 Chromium browser assertions passed, including a screenshot-buffer difference between lights on and off, master switch state, preset colour, brightness output and bank/brightness reset. Existing model loading, catalogue, mobile overflow and console checks remained passing.
- Desktop Lights screenshot and mobile screenshot inspected. The desktop side panel scrolls to reveal additional banks/reset controls.
- An initial continuous-render software-WebGL screenshot timed out; on-demand rendering and cached shadow maps corrected this. Test screenshot allowance was also increased for the software renderer. This is not a hardware performance benchmark.
- No real Android/iPhone testing; no promise that external browser/network connections cannot time out.
