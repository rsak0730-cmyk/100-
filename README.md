# M ATELIER — independent BMW M exterior study

A working Three.js / TypeScript / Vite application, replacing the previous particle-lab entry point. This is an **initial exterior reference implementation, not the completed automotive digital twin requested in the brief**.

## Run
```
npm ci
npm run dev -- --host 0.0.0.0
npm run typecheck
npm test
npm run audit:assets
npm run build
npm run preview -- --host 0.0.0.0
npm run e2e
```
The E2E command requires the preview server already running on 4173. It uses packaged headless Chromium / software WebGL and extracts its bundled AL2023 libraries; screenshots go to ignored `e2e/screenshots/`. No actual Android/iPhone hardware validation has been performed.

## Available
- Actual attributed M4 Competition exterior GLB; no photographic or procedural car substitute.
- Orbit drag, zoom, six axis-based camera presets, reset and optional turntable.
- Seven paint presets, custom colour, four material finishes on the body material group.
- Procedural 3D showroom with a central display plinth, walls, ceiling softboxes, side panels and architectural accents.
- Master light power, brightness, light/accent colours, separate ceiling/left/right/accent banks, ambient fill, reflections, exposure, shadows, architecture visibility and four presets. Three pixel-ratio quality settings.
- No automatic model-loading timeout; selecting another vehicle still cancels the previous request, and network failures still offer retry.
- 67 unique catalogue records; search, series/category filters, arrows and keyboard navigation.
- Swipe on the **vehicle identity strip** changes the vehicle; dragging the canvas always orbits. This avoids conflicting gestures.
- Unavailable records clear the old model and identity immediately and disable paint/rotation controls.
- Responsive layout, modal catalogue, visible creator attribution and limitations.

## Not available / not validated
- Full component anatomy, component selection, isolation, relationships, exploded animation, interior navigation: disabled, no verified component geometry.
- Other catalogue models: coming soon, no reused car geometry.
- Exact factory trim fidelity, production dates, market/model-year specifications: unverified and withheld.
- Adaptive FPS-based quality, HDRI locations, SSR, progressive LODs and performance budgets: not implemented. Source asset is 22.74 MB; the served lossless Meshopt variant is 15.28 MB (32.8% smaller), with unchanged texture bytes and verified exact geometry data. Quality selection changes resolution, not geometry complexity.
- Production readiness and mid-range phone frame rate: not established. Headless SwiftShader checks are not device benchmarks.
- Catalogue is not yet a validated historical database. Some entries represent selected generations rather than all possible trims/years. M635CSi is treated as the M6 E24 market-name alias; G83 Competition Convertible includes the M xDrive name alias, not a duplicate entry.

## Architecture
- `src/showroom/catalogue.ts`: catalogue identities and strict one-asset mapping.
- `src/showroom/viewer.ts`: GLTF loading, stale-request protection, normalization, lighting, controls, material updates and cleanup.
- `src/showroom/main.ts`: working catalogue, configuration and availability UI.
- `src/showroom/style.css`: responsive showroom layout.
- `public/models/manifest.json`: provenance and feature availability.
- `scripts/audit-model.mjs`: GLB header, resource and hash audit.
- `docs/showroom/ASSETS.md`: asset license evidence, restrictions and acquisition gate.
- Previous particle-lab sources/tests remain in the repository but are not loaded by the new entry point. Their tests must not be counted as showroom coverage.

## GitHub Pages
`.github/workflows/deploy.yml` installs dependencies, typechecks, runs tests, audits the GLB, builds, verifies output and uploads `dist` to Pages. Vite `base: './'` supports `/100-/`; public asset requests use `import.meta.env.BASE_URL`.

**Current branch deployment:** Pages now publishes `arena/d00425a0-100` at `/` using legacy branch publishing. The tracked root `index.html`, `assets/`, `models/` and `.nojekyll` are the production website. Editable Vite HTML lives in `app/index.html`; application source remains in `src/showroom/`.

After source changes, run `npm run publish:branch`, commit the generated root files along with the source, and push this branch. GitHub's branch Pages build then publishes without requiring a merge or manual workflow dispatch. Do not edit the generated root HTML directly. The model is intentionally copied into the published root because legacy Pages cannot use Vite's `public/` mapping.

The existing Actions workflow is an alternative for a future switch to Actions-based publishing; it is not required for the current branch-root deployment.

This is an unofficial study, not affiliated with or endorsed by BMW AG. BMW names, designs and trademarks belong to their owners. See ASSETS.md before commercial redistribution.


## Lossless loading optimization
`npm run optimize:model` creates the hash-versioned Meshopt variant from the untouched source GLB, updates the asset manifest/preload reference, and verifies decoded attribute values, triangle geometry, texture bytes, materials and node transforms. No simplification, quantization, texture resizing or lossy filtering is used. See `docs/showroom/optimization.json`.

The loader uses the self-contained Three.js Meshopt decoder. No user installation, external decoder CDN or paid API is needed. A preload starts the model fetch earlier; optional Cache Storage reuses the validated hash-versioned file across visits. Cache failure/private browsing falls back to ordinary fetching. Browser eviction or clearing site data causes another download. Changing model content creates a new filename to avoid stale assets. The original model remains in the repository for reproducibility but is not requested by the viewer.

A smaller transfer is measured, not a promise of a particular load time: parsing, textures and GPU preparation still depend on the device. No throttled-network or real-phone benchmark is claimed.


## Showroom lighting
Open **Showroom lights** in the viewer or the **Lights** side-panel tab. Controls update the real Three.js light rig and visible fixtures; master power also disables environment lighting. Zero brightness or power-off deliberately darkens the scene. UI remains readable so the lights can be restored. `Reset lighting` restores the Signature preset independently of vehicle/camera reset. Settings persist during vehicle switching within the session, not across reloads.

`src/showroom/lighting.ts` owns procedural architecture, area lights, ceiling spotlight and shadow map, accent lights and their settings. No extra room asset download is required. The browser now renders on demand while idle; orbit damping, controls, model loads and active rotation request frames. Shadows are refreshed when the car or rig changes rather than recalculated for every static frame. Real mobile GPU performance remains unmeasured; shadows can be switched off.

Model loading has **no application-imposed deadline**. The AbortController only cancels an obsolete request when switching/retrying models, not a slow active transfer. Actual network/decoder errors still display Retry. Browser/network timeouts outside the application are outside its control.
