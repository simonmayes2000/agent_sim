# The First World

An observable, referee-driven living world. Inhabitants decide what they want to attempt from their own experience; model referees determine actual consequences and changes to the world.

Play: https://the-first-world-simulator.creamdaisy32.chatgpt.site

## How the world now works

Each world day has four stages:

1. Each living inhabitant proposes a free-text intention and a personal goal. Their context contains their condition, observed places, encountered objects, learned facts and recent experiences. They do not choose from a ranked action menu.
2. An outcome-authoring referee proposes actual consequences for the combined intentions and the evolving environment. It can introduce objects or organisms, resolve consumption and delayed effects, create discoveries or structures, alter terrain and weather, change relationships, and describe new world processes.
3. Ten independent specialist referees review that proposed outcome. Their concerns include causality, ecology, bodily effects, conservation, knowledge, society and the observer boundary. The browser receives one combined vote response. Unanimous approval is required.
4. A validated outcome applies atomically, then the clock advances. Malformed or invalid model responses get up to two automatic repair attempts before the day is held. Failed requests and vetoes leave the proposed physical changes unapplied; the reason and a Retry Day button are visible.

There is no predetermined first food, food species catalogue, recipe prerequisite tree, discovery sequence, forced survival priority, automatic eating benefit, or automatic regrowth in the active loop. New worlds begin with seeded terrain and no stocked edible resources. Initial bodily reserve meters describe the inhabitants' starting condition. The referees establish encounters and their properties as the inhabitants inspect or interact with their surroundings. Food can benefit, harm, have mixed or delayed consequences, or prove useless.

Existing saves retain their physical history, discovered concepts and built structures. Their next day uses the open referee loop. Earlier deterministic survival and recipe helpers remain for legacy compatibility tests, and are not the default player loop.

## Facts, knowledge and consequences

World entities have arbitrary names, descriptions, properties, quantities, locations and appearances. They can be carried, changed, removed or made into physical structures. Intentions can name a known object or refer to an uncertain target; uncertain references are passed to the referees without creating an object or granting knowledge. Referee-created discoveries become records of what particular people learned, and consumed or removed objects remain valid historical evidence. An entity's hidden properties do not automatically become agent knowledge. Distant observations retain their last-known quantities. Bodily conditions and open-ended states preserve ongoing effects, while described world laws give future referees processes to respect.

The runtime checks references, coordinates, finite quantities and structured changes. It does not execute generated code. The current map renderer supports up to 24 by 24 cells; referees can extend any edge without an exploration-percentage unlock. These are representation limits, rather than a list of permissible foods, actions or technologies. A novel phenomenon can be represented through entities, properties, states, terrain and persistent laws; a wholly new execution or rendering capability would still require engine work.

Personal plans persist with their next steps and referee-assessed progress. Completed and abandoned goals remain in each person's recent project history. The Overview and person drawer display these records. What agents choose and what actually happens are separate facts.

## Explore and observe

The game opens into a full-window aerial map. Drag to pan, scroll or double-click to zoom, and use Fit to return to the whole world. Search for people, observed coordinates or named features. Satellite and Terrain views share the same geography. The information panel has Overview, People, Resources and Chronicle tabs; on phones it becomes a bottom sheet.

New entities and structures appear as interactive map features. Terrain may have arbitrary names and referee-specified colour; an entity's appearance can include a colour, scale and polygon footprint. The Visual Referee directs additional scene treatment from authoritative evidence. This is a synthetic aerial rendering, not photographic Google Maps imagery.

Resources shows encountered things and what the selected person has actually learned, rather than assuming everything is berries, water, wood, stone or fibre. Character details show carried entities and established conditions. The observer can submit any world-change request; the referees resolve it instead of a finite keyword interpreter.

Space toggles playback, F fits the map, and Escape closes selection. Consequential world resolution waits for models. Optional visual and development reviews run in cancellable background lanes; each lane keeps its current request and the newest waiting snapshot. Every day records a compact evidence summary, so the single cumulative **Development** brief can consider intervening days even when requests lag. New World cancels pending requests and invalidates old results.

Worlds are saved in browser local storage. Export backs up the world's records; GitHub stores source, not browser saves.

## Run locally

```sh
node scripts/source-council.mjs --port 8000 --agents codex
```

Open http://127.0.0.1:8000. The same-origin server forwards model requests to the configured remote service and uses an authenticated local Codex CLI as fallback. Structured intentions and outcomes are preserved. Without a reachable model service, the open world holds its state and reports the failure; it does not substitute scripted berries or pretend a referee approved an outcome.

A static preview can also use `python3 -m http.server 8000 --directory dist`; it uses the public API URL in `dist/config.js`. The configured model service is `server.js`, with server-side `OPENAI_API_KEY`, `AGENT_MODEL` and optional `OPENAI_API_URL`. Keys stay on the server. Its proxy accepts larger structured outcome responses and distinguishes actual-outcome review from the legacy attempt-permission prompts.

The optional source-code council produces patches for manual review through the local service. It does not edit, commit, push or publish source itself. Game-development guidance has one visible source: Development.

## Verification

```sh
node --test tests/*.test.js tests/*.test.mjs
node tests/referee-world.browser.cjs
node tests/map-workspace.browser.cjs
node tests/agent-projects.browser.cjs
```

The open-world browser scenario exercises unclassified encounters, mixed consumption effects, arbitrary discovery and construction, dynamic weather, a ten-vote veto, model failure, and reload persistence. Legacy scenarios continue to check prior saves and the map interface. Model-service and local-fallback tests use controlled responses; the development environment cannot reach the live Render endpoint, so live model quality and remote deployment must be assessed in play.

See [World assessment and refactor](docs/world-refactor.md) for the earlier assessment and subsequent changes.
