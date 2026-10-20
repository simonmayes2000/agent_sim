# The First World

A browser-based agent survival simulator. Adam and Eve begin in a small world where they gather food and water, speak, experiment with materials, share discoveries, and may have descendants.

The ten in-world rule referees use the same configured model API as the inhabitants. A consequential proposal first passes physical safeguards, then the browser sends one request to the Render council endpoint, which gathers ten distinct model-role votes. Unanimous approval is required; an API failure blocks the proposal and is shown in the council record. This can make world steps slower and can use up to ten model calls per proposal. The separate source-code council below still requires a local service and only outputs patches for manual review.

Play the private Site: https://the-first-world-simulator.creamdaisy32.chatgpt.site

The game opens directly into a full-window aerial map. Search for an inhabitant, a named building or explored coordinates (for example `2, 3`), then use the Overview, People, Resources and Chronicle tabs to inspect the world. Drag to pan, scroll or double-click to zoom, and use Fit to return to the whole world. Satellite and Terrain views share the same simulated geography; the layer control exposes resource and activity overlays. Space toggles playback and F fits the map. The side panel collapses, and becomes a bottom sheet on phones.

The prioritised assessment, completed refactor and recommended next work are recorded in [World assessment and refactor](docs/world-refactor.md).

## Run locally

For autonomous source governance, start the local council server from the repository:

```sh
node scripts/source-council.mjs --port 8000
```

Open http://127.0.0.1:8000. The local game sends agent dialogue and in-world referee votes to this same-origin server. It forwards to the configured Render agent API; in `--agents codex` mode it uses the authenticated local Codex CLI when the remote API cannot be reached. Codex fallback can be slower, especially for ten-vote decisions. Every world day, the source-code referees inspect the current world for a concrete realism problem. A proposed amendment needs all ten votes, then appears as a source proposal for you to review and implement separately. The council does not edit, commit, push, or publish source. Its audit trail is written to `work/source-council.jsonl`, and the council panel shows the proposal and patch. The service does not publish the hosted Site.

For open-ended source proposals by ten model referees, run `node scripts/source-council.mjs --port 8000 --agents codex` with a working, authenticated Codex CLI. One referee proposes a Git patch to the game's executable JavaScript; the other nine independently vote. Unanimous patches are returned for you to review and apply manually. Model calls run read-only and cannot edit the repository themselves. The model endpoint was unreachable from the development environment during this release, so this mode was verified with mock agent responses; it reports `model-unavailable` rather than changing source if live calls fail.

To run the static game without source evolution, serve `dist` with any static web server, for example:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000.

You can also review an exported world once with `node scripts/source-council.mjs --once path/to/export.json`. The source council changes rules only when it finds supporting evidence; it can leave the source untouched.

## Simulation rules

- The world advances one day per step. Resources regrow; people consume food and water and need rest. Explored ground is revealed, travel leaves paths, and the map expands from 8×6 toward 16×14 as people reach new areas.
- A hidden technology referee considers only observed materials, carried supplies, local conditions, and personally known inventions. Experiments may fail. Successful discoveries become nodes in a world-specific dependency graph; physical inventions leave visible structures on the map. Nearby people can pass knowledge through speech.
- A birth requires two nearby adults with mutual affinity and sufficient health, food, and water. Parents and siblings cannot reproduce together.
- Offspring receive six of twelve character traits from each parent. Each inherited trait has an independent 8% chance of mutation.
- People with strong mutual ties can form clans. Their territory, settlement marker, and membership appear on the map and in the clan record.
- The overseer can speak to a person without changing their memory. The overseer can also describe a world change in free text. Ten local referees review its interpretation, and the preview states the exact effect before it is enacted. The interpreter handles resource additions and removal, terrain, weather, and changes to a named person's health or life. Unrecognized descriptions create a persistent mystery at the selected place. Agents encounter perceptible effects and discuss them without learning the overseer's wording or intent.

The hosted game uses model referees for in-world decisions when the Render agent API is available. Source-code referees still need the optional local Codex mode and a reachable model endpoint; a ChatGPT login by itself did not make that endpoint reachable in the development environment. The hosted Site is static, so its source cannot rewrite itself while deployed; source governance runs through the local server and requires a later deployment for hosted visitors to receive changes. Free text is interpreted by finite rules, so descriptions outside those rules become encounterable mysteries rather than arbitrary new physics. The technology referee uses finite material affordance rules, but there is no predefined visible technology tree or fixed unlock order. The interface and simulation state are stored in the browser's local storage. Use **Export log** to back up a particular world's history, including its technology graph and experiment record; GitHub preserves the source code, not browser save data.

Agent speech is shown by default, including scripted dialogue. Each completed day requests a two-turn model exchange between nearby inhabitants, or a single reflection when everyone is apart. These exchanges use up to two model requests per day and require the configured Agent API; failed or ungrounded replies remain omitted. Source reviews run daily when the local council is connected. The council panel includes no-evidence results, rejection reasons, and referee votes. Procedural mode supports five bounded rule changes; use Codex mode for broader source proposals.

## Daily game development reviews

The **Development** button is the single source for game changes. After each world day, the ten specialist viewpoints combine every previous daily review with the current world into one cumulative, prioritized implementation brief: the problem, evidence, player experience, exact update, implementation guidance, priority, and acceptance check. The full history remains in the saved world, while only the latest cumulative brief is shown; individual referee suggestions and the separate source-council proposal archive are not shown as competing advice. The council evaluates recurring unresolved problems, discovery, meaningful choices, anticipation, relationship stakes, variety, pacing, readable feedback, and observer agency. No-evidence results and API failures remain visible. You can also request a review of the current day; completed days are not repeated, while partial reviews can be retried. Closing the Development window leaves it closed while a review finishes.

Development reviews use one additional aggregated model call per world day. The ten roles deliberate inside that call and return only one compact council consensus, avoiding oversized or competing referee output. The call times out after 30 seconds; failures are recorded instead of silently omitted and a same-day retry replaces the failed result. These reviews provide advice and do not edit deployed code or grant knowledge to inhabitants. Browser changes still require a deployment to reach hosted visitors.

## Shared exploration and resource waypoints

Natural food sites now have a readable harvest rhythm. Harvesting starts a local cooldown (two days for dense berry sites and one day for forest food), after which food regrows by one unit per day to the terrain cap. Explored tile captions and known food hotspots show the cooldown or expected time to full yield; observing a site reports its ecology without changing it.

The interface is map-first. A procedural satellite-style canvas draws the world as continuous terrain, with irregular shorelines, vegetation density, rock fields, weather and water movement. Scroll or use the map controls to zoom, drag to pan, and select any place. Zoomed-out views emphasize biomes, settlements and travel corridors; close views reveal resource quantities, place labels, caches, inhabitants and named buildings. Forest cover reflects remaining wood, berry cover reflects local food, frequently travelled links become paths, and each completed structure appears as a roofed compound with its build day. Newly built structures animate briefly so development is visible as it happens.

Terrain directly shows known resources, recovery, structures, routes, weather and recent events. Each person carries a visible current intention, can be followed across the map, and appears in a live "Stories to follow" rail when their needs or activity create an unfolding situation. Selecting a place reveals its resources, recovery, visitors and built history without opening another screen.

A dedicated **Visual Referee** directs the map's appearance after every completed world day. It receives a grounded snapshot of terrain, resources, visits, structures, season and weather, then returns a structured scene plan for colour, atmosphere, vegetation, moisture, exposed soil and local marks. This is a dynamic rendering plan rather than a generated background image, so it remains sharp and interactive while zooming and changes as the world develops. The referee may interpret the visual consequences of recorded events, but it cannot create resources, move people or invent buildings. When the model service is unavailable, the same renderer uses a deterministic plan derived from the current world. The map header identifies whether the current plan came from the model or the local fallback.

Agents record food and water quantities when they observe a place. Sightings include the day, discoverer, and location, and appear in the **Known resource hotspots** panel and on the map. Three or more observed food units or six or more water units receive a high-yield marker. Depletion and regrowth update the record when someone revisits; distant quantities do not update magically. Unfamiliar introduced objects are only counted as resources after testing identifies their use.

Every known sighting now carries a decay-aware forecast. The hotspot card shows the projected quantity on arrival, confidence, days until verification is due, measured depletion trend, travel energy, weather penalty, and one recommended action. Forecasts use only the selected inhabitant's shared or personally observed knowledge. Old sightings become visibly stale rather than reading the live resource value. When a hungry or thirsty inhabitant travels, they rank reachable sightings by predicted yield, confidence, and travel cost; the chronicle records the forecast behind that choice.

Companions within two tiles share sightings and their known routes. Shared geography permits travel planning but does not count as personally visited ground or advance the global exploration count. Agents use the cheapest connected route through their own observed or shared ground. If there is no known resource route, they explore adjacent ground. Movement costs one energy per tile; entering exposed ground in wind costs one extra. Forest and built shelter provide cover. These costs apply to wandering as well as directed travel, in addition to existing daily upkeep.

Choose an agent in the hotspot panel and select a sighting to highlight their route. Hints compare estimated travel energy with the next gathering action's potential reserve gain. They use the agent's own last-known information, current weather and reserves; daily upkeep, future weather and resource changes can alter the outcome. The feed defaults to all events so discoveries, local sharing, depletion and directed travel are visible on the day they happen. Sightings and the latest 200 exploration records are included in saves and exports and remain attached to the correct places as the map grows. Old saves retain geography and start recording resource quantities on new observations.
