# The First World

A browser-based agent survival simulator. Adam and Eve begin in a small world where they gather food and water, speak, experiment with materials, share discoveries, and may have descendants.

The ten in-world rule referees use the same configured model API as the inhabitants. A consequential proposal first passes physical safeguards, then the browser sends one request to the Render council endpoint, which gathers ten distinct model-role votes. Unanimous approval is required; an API failure blocks the proposal and is shown in the council record. This can make world steps slower and can use up to ten model calls per proposal. The separate source-code council below still requires a local service and only outputs patches for manual review.

Play the private Site: https://the-first-world-simulator.creamdaisy32.chatgpt.site

## Run locally

For autonomous source governance, start the local council server from the repository:

```sh
node scripts/source-council.mjs --port 8000
```

Open http://127.0.0.1:8000. Every world day, the ten referees inspect the current world for a concrete realism problem. A proposed amendment needs all ten votes, then appears as a source proposal for you to review and implement separately. The council does not edit, commit, push, or publish source. Its audit trail is written to `work/source-council.jsonl`, and the council panel shows the proposal and patch. The service does not publish the hosted Site.

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

The **Development** button opens a separate saved record of ten model referees reviewing the game as a whole. After each world day, each role considers its own domain: resource accounting, movement, causality, ecology, survival, knowledge, social behavior, inheritance, construction, and observer usability. A recommendation includes observed evidence, a concrete proposed change, and an acceptance check. No-evidence findings and API failures remain visible. You can also request a review of the current day; completed days are not repeated, while partial reviews can be retried. The latest 20 review rounds are kept in browser saves and exported world logs.

Development reviews use the existing Agent API, with ten additional model calls per world day and at most three in flight. The next day waits for the review to finish. Calls time out after 30 seconds each; failures are recorded instead of silently omitted. These reviews require no local source service. They provide advice and do not edit deployed code or grant knowledge to inhabitants. The local Codex source council receives recent recommendations in its world evidence and must corroborate them against the repository before proposing a manually applied patch. Browser changes still require a deployment to reach hosted visitors.
