# Architectural and interface direction

## References actually reviewed
All four requested GitHub repositories were accessible through the GitHub API. No implementation code or skill instructions were copied into the application. Guidance was evaluated as design reference, not as runtime dependencies.
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill — README and `.claude/skills/ui-ux-pro-max/SKILL.md`: visible focus, semantic controls, touch targets, feedback, progressive disclosure and performance priority.
- https://github.com/anthropics/skills — README and `skills/frontend-design/SKILL.md`: subject-specific design, one dominant visual experience, restrained structure, considered typography and screenshot critique.
- https://github.com/vercel-labs/agent-skills — README, `skills/web-design-guidelines/SKILL.md` and `skills/web-design-guidelines/references/command.md`: keyboard interaction, real buttons, form labels, focus and async feedback.
- https://github.com/MengTo/Skills — README, `agent-skills/3d/README.md` and `agent-skills/3d/3d-modular-buildings/SKILL.md`: footprint/circulation first, architectural bay repetition, human scale, material separation and geometry budgets.

## System
- Deep green-black shell #111b1d, ivory controls #efeee8, dark readable ink #182727, muted brass #b8a17a. Accent belongs to the architecture rather than random UI glows.
- Restrained system sans for navigation and data. Georgia for side-panel editorial headings and the custom typographic monogram. No external font download.
- Viewport first; side panel collapses on desktop and overlays on mobile. Four tool tabs: Explore, Lighting, Atmosphere, Settings.
- No decorative dashboard statistics, stock background photos, anatomy controls or expanded catalogue in the primary interface.
- 36 × 28 m gallery with 7.5 m ceiling, three display islands, circulation between them, hospitality along the rear wall, arrival glazing at the front.
- Shared material maps, static opaque geometry batched by material; interactive geometry stays addressable for raycasting. Texture maps and geometry are original procedural work. This is not a scanned real interior.

## Deliberate limits
There is one acquired vehicle asset. The secondary platforms are explicitly reserved spaces, not duplicated vehicles with different names. This does not satisfy a multi-car licensed collection. Reflectivity uses the procedural environment map and PBR roughness, not SSR or ray-traced floor reflections of the cars. Doors have handles/frames but are decorative, not openable. Architectural camera travel is interpolated and position-bounded, not a collision/navigation physics system. The furniture is modeled and textured procedurally, not a premium scanned furniture collection. No claim is made that the requested ultra-photoreal quality target is fully achieved.
