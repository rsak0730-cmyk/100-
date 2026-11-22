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
