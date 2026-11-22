# Collection expansion gate — 2026-11-22

Status: 67 distinct catalogue records; 1 attributed third-party exterior reference; 66 entries without acquired/validated assets. No new vehicle GLB was added in this audit. The catalogue is not a claim of asset availability.

## Research results in this pass
- GitHub API repository search `bmw glb` and `bmw 3d models` reviewed.
- `HadiKachmar/bmwm3glb` contains `bmw_m3_need_for_speed_most_wanted.glb` (24,498,936 bytes), but no README/license documentation was available in the root. Game-derived naming plus absent permission is not adequate redistribution evidence; rejected for import. Not downloaded.
- `Crimson-Coral-X/handtrack-3d-showroom` recursive tree contained no GLB asset in the returned results; not an asset source.
- A web search surfaced `pedrosoandre/carros`, but GitHub API lookup returned 404. Search snippets alone do not verify repository access, model availability or license; not imported.
- Sketchfab search results alone cannot establish download access, exact vehicle trim, chain of title or anatomy support. No model was extracted from previews or ripped from a commercial game/configurator.

## Non-duplicate policy
Identity is generation plus canonical model/trim, not just a short display name. Distinct M3 generations and Competition/CS/CSL variants remain separate. M635CSi/M6 E24 and G83 Competition Convertible/M xDrive naming aliases must not become two listings. Catalogue validation rejects duplicate IDs, semantic identities and shared asset paths. Listing and side-panel names now include the generation so legitimate historical entries do not appear to be identical named cars.

## Needed to finish the requested expansion
Supply distinct GLB/GLTF models with creator attribution, original URLs and licenses explicitly permitting web redistribution and modification. Each must identify the actual generation and trim. Before enabling it: validate the file, inspect appearance/orientation, verify unique geometry, define the real body material mask, benchmark loading, and connect it to the catalogue and shared light rig. Existing hardcoded M4 body-mask handling must be replaced with verified per-asset metadata for any new model. Component anatomy still needs separately verified modular internals; exterior files alone do not enable it.

The present branch does not fulfill the request to add all remaining vehicles. Unavailable entries remain honestly marked rather than displaying a borrowed asset under a new name.
