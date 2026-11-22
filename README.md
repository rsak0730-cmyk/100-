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
- Four procedural lighting/colour studies, three pixel-ratio quality settings.
- 67 unique catalogue records; search, series/category filters, arrows and keyboard navigation.
- Swipe on the **vehicle identity strip** changes the vehicle; dragging the canvas always orbits. This avoids conflicting gestures.
- Unavailable records clear the old model and identity immediately and disable paint/rotation controls.
- Responsive layout, modal catalogue, visible creator attribution and limitations.

## Not available / not validated
- Full component anatomy, component selection, isolation, relationships, exploded animation, interior navigation: disabled, no verified component geometry.
- Other catalogue models: coming soon, no reused car geometry.
- Exact factory trim fidelity, production dates, market/model-year specifications: unverified and withheld.
- Compression, adaptive FPS-based quality, HDRI locations, SSR, progressive LODs, performance budgets: not implemented. Current asset is 22.7 MB uncompressed. Quality selection changes resolution, not geometry complexity.
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

**Deployment blocker:** Pages is currently configured for legacy main-root publishing. The connected GitHub integration returned HTTP 403 when changing Pages source. A repository administrator must select **Settings → Pages → Source → GitHub Actions**. The workflow must be on the default branch before workflow_dispatch is available; the earlier promise of dispatching an unpublished workflow from this branch was incorrect. No successful deployment is claimed. Once the changes are approved and merged and the setting is enabled, push-to-main deploys automatically. No paid service is required.

This is an unofficial study, not affiliated with or endorsed by BMW AG. BMW names, designs and trademarks belong to their owners. See ASSETS.md before commercial redistribution.
