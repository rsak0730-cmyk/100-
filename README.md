# Atelier Motor House

An interactive Three.js architectural automotive gallery, built with TypeScript and Vite. This pass focuses on the environment, atmosphere, interaction and UI—not anatomy or catalogue expansion.

## Run and validate
```bash
npm ci
npm run dev -- --host 0.0.0.0
npm run typecheck
npm test
npm run audit:assets
npm run build
npm run verify:build
npm run preview -- --host 0.0.0.0 --port 4173
# With preview running in another terminal:
npm run e2e
```
The browser suite uses packaged Chromium with SwiftShader software WebGL. It extracts bundled Chromium shared libraries under `/tmp`. Screenshots/reports in `e2e/` are generated and ignored. Visitors need only a compatible browser; no installation, paid API or subscription.

## Current experience
- Central M4 exterior reference on a premium platform; two reserved presentation islands.
- 36 × 28 m procedural gallery: stone floor/joints, coffered ceiling/beams/columns, glass entrance and handles, walnut/fluted reception, customer lounge, furniture, shelves, stands, material artwork, planters and exterior arrival court.
- Locally generated stone, wood and fabric maps; PBR metal/glass/leather approximations. No flat photo replaces the environment.
- Master lighting, six light groups with independent brightness, colour temperature, custom light/accent colours, ambient/directional contributions, reflections/environment brightness, exposure, shadows and shadow strength.
- Seven presets: Luxury Warm, Pure White, Cinematic Night, Sunset, Cool Modern, Studio Photography, Ambient Evening. Restore Signature independently of the camera.
- Daytime, Evening, Night and Sunset alter sky background and actual directional light colour/intensity/elevation. Outdoor brightness and glazing reflection controls.
- Ten smooth, reduced-motion-aware camera presets; orbit/pan/zoom, camera position limits, reset and fullscreen request.
- Actual mesh raycasting for the car, platforms, ceiling fixtures, glazing, desk, lounge and displays. Context metadata, focus and light-adjustment shortcut. Accessible object selector provides the same selection without precise pointer use.
- Responsive collapsible control panel, keyboard tabs, labelled controls, credits dialog, WebGL error fallback.
- Lossless Meshopt vehicle compression (22.74 → 15.28 MB), optional hash-versioned browser cache, preloading, no application-imposed model loading deadline.
- On-demand rendering, batched static architecture, cached shadow maps, DPR quality controls, automatic reduction after sustained slow renders, render/FPS/object-count telemetry.

## Architecture
- `app/index.html`: editable Vite entry.
- `src/showroom/flagship.ts`, `flagship.css`: current focused showroom UI.
- `architecture.ts`: reusable architecture, materials, furniture, courtyard, interactive object registry and static batching.
- `lighting.ts`: actual light objects, group settings, atmosphere and presets.
- `cameras.ts`: position/target presets.
- `viewer.ts`: model lifecycle, mesh picking, selection highlight, camera interpolation, controls, quality and render telemetry.
- `download.ts`, `model-asset.json`: versioned asset loading, streaming progress and optional cache.
- `public/models/manifest.json`: vehicle license/provenance. `showroom-architecture.json`: environment manifest/limitations.
- `docs/flagship/DESIGN.md`, `QA.md`: references, decisions and measured test scope.
- Previous catalogue/particle-lab code remains in the repository but is not loaded by the current entry point. Do not count legacy tests as current UI coverage.

## GitHub Pages
The current repository uses legacy Pages publishing from `arena/d00425a0-100`, root `/`.
```bash
npm run publish:branch
# Commit the source plus generated root index.html, assets/ and models/; push the current branch.
```
`publish:branch` builds then copies `dist` assets into the tracked root required by legacy Pages. `.nojekyll` prevents Jekyll interpretation. Vite `base: './'` and relative URLs support `https://rsak0730-cmyk.github.io/100-/`. Do not edit generated root HTML directly.

`.github/workflows/deploy.yml` also supports an eventual switch to GitHub Actions Pages publishing: install, typecheck, test, audit, build, verify and deploy. It runs on main pushes/manual dispatch; the current branch-root Pages deployment is GitHub's built-in pipeline and does not need that switch. Do not merge merely to deploy this branch.

## Reproduce lossless optimization
`npm run optimize:model` compresses the untouched source GLB without quantization, simplification or texture changes. It checks exact attributes, material definitions, node transforms, texture bytes and equivalent triangle winding, updates the versioned asset and preload. Then rebuild/publish. See `docs/showroom/optimization.json`.

## Assets and honest limitations
The M4 is “BMW M4 Competition M Package” by 𝙎𝙍𝙏 𝙋𝙚𝙧𝙛𝙤𝙢𝙖𝙣𝙘𝙚™, distributed via [coopercodes/bmwGLB](https://github.com/coopercodes/bmwGLB), license stated as [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution and changes are visible in the app. See `docs/showroom/ASSETS.md`. BMW design/trademark rights and exact factory fidelity are not independently cleared. This is unofficial and not affiliated with BMW AG.

There is **one acquired car**, not a multi-car collection. Secondary islands are intentionally unoccupied, with honest information stands. No vehicle anatomy or new catalogue acquisition is claimed.

The room is original procedural architecture/furniture, not scanned photorealism. Floor/glass reflections are environment-based, **not** car-reflecting SSR, planar mirrors or ray tracing. Only the presentation spotlight casts dynamic shadows. No architectural walking collision system, opening doors, baked GI, HDRI location, KTX2 texture delivery or physical photometric calibration is implemented. These boundaries mean the full ultra-photoreal flagship quality target is not claimed as complete.

No physical mobile-device validation, stable FPS guarantee or GPU-memory budget has been established. Current QA uses browser emulation/software WebGL; exact scope is in `docs/flagship/QA.md`.
