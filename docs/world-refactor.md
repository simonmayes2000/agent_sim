# World assessment and refactor

## Open-world update

The current player loop supersedes the fixed priorities described in the earlier assessment below. Agents now submit free-text intentions. A referee authors the actual outcome, and ten independent model roles review it before an atomic commit. New food, effects, discoveries, objects, structures, terrain, weather and persistent world processes no longer require a predefined recipe or resource name. Starting terrain has no stocked berries or automatic edible resource. Bodily upkeep and regrowth are referee-resolved rather than automatically applied by the old survival loop.

The world stores arbitrary entity properties, individual learned properties, dated observations, conditions and described laws. Knowledge remains separate from hidden physical facts. Unknown resources can have benefits, harms or delayed consequences. The map renders novel entities and allows referee-directed extensions without an exploration threshold. The runtime enforces valid data and the renderer's supported extent; it does not execute generated code or claim unlimited rendering capabilities.

The authoritative loop requires model calls. Visual and development advice remain background work. On failure or veto the proposed day is not applied. `tests/referee-world.browser.cjs` validates this path; older project scenarios explicitly select the retained legacy mode as compatibility regressions.

The strongest part of the prototype is its premise: observe inhabitants discovering a shared world, see their decisions leave physical traces, and influence conditions without giving them outside knowledge. The weakest part was how difficult it was to see those relationships in the interface.

## Priority 1 — Make geography the primary interface (implemented)

The previous page spent substantial space on introductory copy, controls and parallel cards. The map now occupies the window. A collapsible panel gives one place for Overview, People, Resources and Chronicle. Search finds people, named structures and explored coordinates; selecting a result moves the camera to that location. Playback remains available while observing.

Satellite and Terrain views share a continuous terrain renderer. Blended biome colours, multiscale ground texture, relief shading, individual canopies and shadows replace the flat polygon patches. Travel corridors and clearings reflect actual visits and construction. Ground rendering is cached independently of interactive overlays, so selecting a place does not reconstruct the landscape. Rendering uses deterministic visual randomness, never the simulation random stream.

The aerial terrain is a synthetic representation of this world, not geographic satellite photography. Coarse simulation cells still govern terrain and movement. Increasing physical fidelity further would require a continuous elevation/hydrology model and richer building footprints rather than asking a model to choose more colours.

## Priority 2 — Make consequences readable (implemented)

Resources and activity are optional overlays. Place details float over the map rather than requiring a separate screen. People, construction and resource forecasts keep their existing links to geography. Storage sites, hearths, drying racks and shelters use different silhouettes. The observer can see muted aerial terrain outside explored places; local resource quantities remain undisclosed and agent knowledge still depends on observation and sharing.

Map navigation supports wheel zoom, drag, double click, Fit, search and a collapsing panel. Space toggles playback, F fits the world, and Escape dismisses selection. On phones the information panel becomes a bottom sheet and map controls remain above it.

## Priority 3 — Correct causal inconsistencies (implemented)

Birth now gives the child the four food and two water deducted from the parents. Saving no longer mutates newborn water, which previously hid a discrepancy between the action and its persisted outcome. After awaiting a conversation opening, the reply checks that both people are alive and still within hearing distance. A regression test covers movement during the request.

## Other areas assessed and next priorities

1. **Agent agency (updated):** goals now persist across days, gather materials, follow known routes and resume after survival interruptions. Choices remain grounded in observed materials and personally known inventions. Model speech does not choose gameplay actions. The next step is richer cooperation and individual preferences within these plans.
2. **Progression and enjoyment (updated):** personal project cards show materials, preparation, next actions, attempts and recent outcomes. Successful experiments and construction use existing physical world rules. Nearby agents retain regular opportunities to converse rather than spending every safe action on project work.
3. **Simulation integrity:** ecology, movement, knowledge and conservation have useful test coverage. Remaining concerns include preservation sometimes skipping metabolic food consumption and generic speech sharing a whole knowledge inventory. These need isolated balance and knowledge-rule changes with regression scenarios.
4. **Pacing (updated):** dialogue, visual direction and development advice now run in independent background lanes. Each lane coalesces waiting work to the newest snapshot; compact evidence summaries preserve every intervening day for the cumulative development brief. New World aborts requests and invalidates their callbacks. Review progress is visible, and closing Development leaves it closed. Consequential council decisions still block their proposed actions.
5. **Development governance:** retain the single cumulative development brief. Individual event rulings belong in their audit record. Avoid adding another recommendations panel.
6. **Persistence:** current browser saves preserve worlds, but save failures are swallowed and there is no import flow. Prioritise explicit save status, schema migrations, import validation and recovery before growing the save model.
7. **Code structure:** the new renderer and workspace are isolated modules. The main app still combines simulation orchestration, API lifecycle and DOM rendering; separate these incrementally with behavioural tests rather than replacing the entire engine during a visual redesign.
8. **Accessibility and performance:** preserve keyboard-accessible map cells, labelled controls, focus visibility and reduced motion. Future improvements should add keyboard camera panning, touch pinch zoom and bounded terrain caches for larger worlds.

## Verification

Run `node --test tests/*.test.js tests/*.test.mjs` for simulation, council, exploration, dialogue and API behaviour. Run `node tests/map-workspace.browser.cjs` for desktop/mobile map navigation, panels, search, selection, basemap switching and runtime errors.

Run `node tests/agent-projects.browser.cjs` for intentionally delayed advisory requests, advancing days while reviews remain pending, reset isolation, cumulative daily evidence, and multi-day project completion producing discoveries and structures.
