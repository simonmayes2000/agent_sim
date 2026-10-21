# Review authority and world time

Review policy 2 supersedes the previous unanimity gate. Established physics is engine-owned; model review concerns only concrete authored additions within each reviewer’s domain. Unapproved additions are withheld rather than converted into facts. A fully determined engine-only day can proceed, while outages, explicit observer requests and unresolved due-world processes remain held. See README’s day-resolution authority section and the captured day-seven regression fixture.

# Items five and six: continuity and experiment archive

`dist/continuity.js` stores agent-authored preferences, beliefs/predictions, commitments and explicit addressed offers/messages. Evidence citations and dated revisions preserve mistakes without upgrading beliefs to facts. Delivery is grounded in final hearing range; acceptance requires an actual received offer and grants no resource authority.

`dist/archive.js` provides versioned IndexedDB checkpoints, integrity-checked portable bundles, state validation and experiment metrics. Archive UI supports inspection, model-free deterministic replay verification, branching with parent provenance, import/export and run labels. The current save has a recovery mirror, damaged-data preservation and visible write failures. This is browser persistence, not authenticated server authority; external exports are needed for device-independent backup.

# World assessment and refactor

## Adjudication and process-clock update

Item four introduces `dist/adjudication.js` and `dist/process-clock.js`. Consequential review now receives complete physical before/after snapshots, personal evidence, due processes, explicit observer authority and the engine's audit. Deterministic validation precedes model judgment. Pending intentions survive failures and reloads, while changes to personal context invalidate the turn cache. Concrete vetoes prompt bounded revisions; unavailable reviewers do not become fictitious approvals.

The specific repeated `nextReviewDay` failure was located in newer GitHub main rather than the original attached checkout. Its model-authored absolute-date invariant has been replaced in the integrated game by an engine-owned review clock. A substantive review of day 5 schedules day 6 by default, including when a legacy update repeats date 5 or omits a date. Unreviewed due processes remain errors; the engine never treats a calendar change as a physical effect. Existing dated bodily effects and daily upkeep are applied once on commit.

The new browser scenario reproduces repeated stale dates, a missing-review correction, veto revision, an outage/reload retry without reselecting intentions, incomplete output recovery, full evidence and cancellation on reset. This update retains the physical and knowledge boundaries from items one through three; it does not restore the newer upstream branch's model-owned metabolism or unrestricted prompt/CLI fallback paths.

## Observation and provenance update

Item three adds `dist/knowledge.js`. Agent context now projects per-person dated records instead of joining remembered IDs to current world truth. Current sight, old observations, attributed reports, unverified inferences and migrated legacy knowledge are distinct. Property observations retain independent dates; remote deletion, renaming and replenishment do not refresh memory. A return visit can establish absence without revealing where an object went.

Reports reference an actual audible speech entry and copy a specific subject from the speaker's evidence. Explicit property selection prevents silent transfer of a whole learned inventory. Hypotheses cite private evidence and cannot alone establish a discovery. Old saves preserve only saved observations; missing historical values and dates remain unknown. Birth resets private evidence rather than cloning it from the parent template.

The Resources/Mind views show provenance. The new knowledge browser scenario checks remote changes, reports, inference, save/reload, return visits, absence and isolation of observer chat. These are active referee-loop semantics; retained deterministic legacy mechanics remain compatibility paths.

## Inhabitant interface update

Item two adds `dist/inhabitant.js` and a tool-free `scripts/model-runtime.cjs`. Intentions, live speech and observer replies now use an allowlisted personal-view protocol on `/api/inhabitant`. Actor identity and operation are bound to the request; attempts to attach outcome changes, roles, tools, unknown entity targets or observer authority fail validation. The runtime owns role instructions, model configuration and output limits.

Referees use `/api/referee` and `/api/council`. Both inhabitants and live referees use fresh HTTP model requests with no tools, no stored provider conversation, and no Codex fallback. Codex remains available only in the separate source-review workflow. Distinct inhabitant and referee model credentials can be configured without changing the browser.

The boundary is enforced around model capabilities and accepted outputs. It does not claim separate operating-system processes or protect browser-owned world state from the browser's owner. Subsequent sections describe perception and persistence improvements. Pretrained model knowledge cannot be erased by filtering context.

## Physical core update

The active referee loop now calls `dist/physical-core.js` before council review and again before atomic application. It validates material sources and mass-conserving transformations, local possession/transfers, consumption, provisions for newborns, bodily capacities, travel budgets and dated effects. Daily metabolism and deprivation damage no longer depend on whether a model remembers them. Source records, entity names, materials, intentions and inventions remain open-ended.

The physical core's transaction accounting supersedes the statement below that bodily upkeep is entirely referee-owned. See the README for rules, operation order and representation limits. Existing saves preserve their records and acquire physical-core version 1 on their next successful day. Existing unstructured descriptions of delayed effects remain descriptive; future automatic effects need explicit dates and deltas.

This is item one of the sandbox improvement sequence. Item two above adds the inhabitant tool boundary. Comprehensive perception repair, richer adjudication, agent continuity, and durable experiment infrastructure are subsequent work.

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
