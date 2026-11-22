# Free model additions — 2026-11-22

Two distinct downloadable assets were acquired through the public GitHub Contents API. Distributor attribution explicitly states CC BY 4.0 for each. These are free third-party models, not independently OEM-verified geometry or a chain-of-title guarantee. No purchase, subscription, API key or user installation is required.

| Display | Asset | Creator | Distributed GLB |
| --- | --- | --- | --- |
| West island | 2013 BMW M5 F10 | Galaxy Car Showroom | `models/m5-f10-2013.glb`, 1,062,736 bytes |
| East island | BMW M4 CSL 2023 / G82 | Black Snow | `models/m4-csl-2023.glb`, 3,502,516 bytes |

Original source and distributor links are in the live Credits dialog, `src/showroom/additional-vehicles.ts`, and `public/models/manifest.json`. The source distributors' attribution documents are preserved alongside this file. They mention other assets; **only the vehicle GLBs** were downloaded, not those projects' code, audio, textures or HDRIs.

## Adaptations and quality boundaries
Both cars are normalized for display, grounded and oriented along the presentation islands. Display length is normalized to 4.8 m for consistent framing, not claimed as a measured factory dimension. M5 source GLB is unchanged. The M4 CSL distributor variant was already pruned/welded/Meshopt-compressed with textures reduced to 2K; this is not a new lossless-quality claim. Runtime removes the unused node and only the documented above-roof splitter artifact, preserving the actual front splitter below. No anatomy or driving behavior is imported or claimed.

Models load sequentially after the central vehicle to avoid blocking its download with additional transfers. They are separately selectable via real mesh raycasting and an accessible object list, share actual showroom illumination, and have individual camera destinations. The visible Available cars list reports waiting/loading/ready/failure instead of pretending every catalogue entry is supported. Exact factory trim details, dimensions, interior completeness and physical mobile performance are unverified.

## Verification
- Header length/version, embedded buffer/image resources, byte sizes and distinct SHA-256 hashes audited by `node scripts/audit-additional.mjs`; see `audit.json`.
- TypeScript/production build passed. Unit suite: 73 passed, including 3 free-model registration/license metadata checks. Legacy tests are included in that total.
- `node e2e/additional-cars.mjs`: 4 assertions passed—both GLBs finished, each independently selectable with its correct name, no captured browser errors.
- Screenshots of each car were captured and visually inspected after correcting camera framing. Software WebGL, 1000 × 760, Low pixel-ratio preset; not a physical mobile test.
- The first extended screenshot run exceeded its 360-second tool budget while capturing an additional wide view. It had loaded/selected both cars with no errors; the reduced supplemental suite subsequently passed. No broad FPS or memory guarantee is made.
- The previous 43-check flagship suite was run before these additions and is not represented as a new full regression run.

Other unavailable vehicles are not added, duplicated or relabelled. This brings the current visible showroom to three distinct licensed exterior models, not the whole historical BMW collection.
