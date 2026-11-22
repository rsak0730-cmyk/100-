# Asset provenance and limitations

## Included M4 exterior reference
- Title: **BMW M4 Competition M Package**
- Creator: **𝙎𝙍𝙏 𝙋𝙚𝙧𝙛𝙤𝙢𝙖𝙣𝙘𝙚™**
- Original: https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b
- Distributor: https://github.com/coopercodes/bmwGLB
- License stated in distributor README: **Creative Commons Attribution 4.0**
- License terms: https://creativecommons.org/licenses/by/4.0/
- File: `public/models/m4.glb`. See model-audit.json for SHA-256 and structural validation.
- Modifications: runtime normalization and optional material edits; embedded geometry unchanged.

Attribution is visible in the application's About dialog and included with the distributed asset manifest. CC BY permits redistribution and adaptation with attribution, indication of changes and license notice. The repository's license declaration is evidence of stated permission, not an independent chain-of-title guarantee. BMW trademarks, design rights and any third-party texture rights are not independently cleared. Do not represent this as OEM-supplied geometry or a commercially cleared BMW product.

## Research gate
Search identified other Sketchfab G82 models, but no authenticated download or complete mechanical asset was acquired. CGTrader, TurboSquid, BlenderKit and Poly Haven have not been fully audited. The available network environment restricts direct asset retrieval to approved hosts; this file was retrieved using GitHub's authenticated contents API. No license bypass, scraping of protected files or extraction from an OEM configurator was used.

## Anatomy decision
35 nodes and 28 material slots are mostly generically named object/material groups. An engine-named material is not proof of a detailed S58 engine. No verified engine internals, transmission, connections or component pivots are documented. Anatomy, exploded assembly, interior camera and component raycasting remain unavailable rather than simulated with invented parts.

## Requirements for additional assets
Record author, original source, exact license, redistribution rights, intended model/trim/year/market and file hash. Validate GLB resources and mesh hierarchy. Inspect front/rear/roof/interior views against primary references; establish units/orientation and material masks. Verify component geometry and relationships individually before enabling selection, isolation or assembly. Benchmark mobile memory/frame time, then optimize geometry/textures with license-compliant transformations. Never assign one asset to multiple model identities.

Procedural RoomEnvironment lighting is from the installed Three.js package (MIT). There is no HDRI, Draco or KTX2 claim in this implementation.


## Lossless delivery variant
The viewer now requests a content-hashed `m4-lossless-*.glb`, produced by `scripts/optimize-model.mjs`. EXT_meshopt_compression is applied without any quantize, simplify or texture transform. The verification report records exact attribute comparisons, identical texture bytes, material definitions and node transforms, and triangle equivalence (allowing cyclic vertex-order rotation without winding change). Source attribution and license remain unchanged. Meshoptimizer and the Three.js decoder are MIT-licensed. The source GLB remains preserved; runtime does not download it. Browser cache storage is optional.
