# The First World

An observable, referee-driven living world. Inhabitants decide what they want to attempt from their own experience; model referees determine actual consequences and changes to the world.

Play: https://the-first-world-simulator.creamdaisy32.chatgpt.site

## How the world now works

Each world day has four stages:

1. Each living inhabitant proposes a free-text intention and a personal goal. Their context contains their condition, observed places, encountered objects, learned facts and recent experiences. They do not choose from a ranked action menu.
2. An outcome-authoring referee proposes actual consequences for the combined intentions and the evolving environment. It can introduce objects or organisms, resolve consumption and delayed effects, create discoveries or structures, alter terrain and weather, change relationships, and describe new world processes.
3. Ten specialist referee calls review that proposed outcome against the complete before-state, projected after-state, personal evidence and deterministic audit. Their concerns include causality, ecology, bodily effects, conservation, knowledge, society and the observer boundary. The browser receives one combined response. Blocking objections must identify a concrete authored change, evidence and an appropriate reviewer domain. Established engine physics is not voted on. Pure engine-only days do not require council calls.
4. A validated outcome applies atomically, then the clock advances. Malformed output receives bounded targeted correction; substantive vetoes can trigger revised outcomes using the same intentions. Outages, explicit observer requests and genuinely unresolved due processes can hold the day. Otherwise, rejected or unrepresentable authored additions are withheld and established time/upkeep/scheduled effects still commit; the UI and diagnostic log distinguish this engine-only result from an accepted model outcome.

There is no predetermined first food, food species catalogue, recipe prerequisite tree, discovery sequence, forced survival priority, automatic eating benefit, or automatic regrowth in the active loop. New worlds begin with seeded terrain and no stocked edible resources. Initial bodily reserve meters describe the inhabitants' starting condition. The referees establish encounters and their properties as the inhabitants inspect or interact with their surroundings. Food can benefit, harm, have mixed or delayed consequences, or prove useless.

Existing saves retain their physical history, discovered concepts and built structures. Their next day uses the open referee loop. Earlier deterministic survival and recipe helpers remain for legacy compatibility tests, and are not the default player loop.

## Facts, knowledge and consequences

World entities have arbitrary names, descriptions, properties, quantities, locations and appearances. They can be carried, changed, removed or made into physical structures. Referee-created discoveries become records of what particular people learned; an entity's hidden properties do not automatically become agent knowledge. Distant observations retain their last-known quantities. Bodily conditions and open-ended states preserve ongoing effects, while described world laws give future referees processes to respect.

The runtime checks references, coordinates, finite quantities, material accounting, possession, travel budgets and scheduled effects. It does not execute generated code. The current map renderer supports up to 24 by 24 cells; referees can extend any edge without an exploration-percentage unlock. These are representation limits, rather than a list of permissible foods, actions or technologies. A novel phenomenon can be represented through entities, properties, states, terrain and persistent laws; a wholly new execution or rendering capability would still require engine work.

Personal plans persist with their next steps and referee-assessed progress. Completed and abandoned goals remain in each person's recent project history. The Overview and person drawer display these records. What agents choose and what actually happens are separate facts.

## Enforced physical core

Every committed resolution advances exactly one day. A rejected authored proposal does not freeze the clock when the engine can fully determine the day without those additions. Network/model outages, unresolved due-world processes and rejected explicit observer requests still hold physical time. Existing saves adopt the core on their next approved day without resetting their world records.

- Each living person uses 1 nourishment, 1 hydration and 2 energy per day. Zero nourishment causes 7 health damage; zero hydration causes 9. Health reaching zero causes death, including when the referee omits that person from its changes.
- Travel covers at most 3 Manhattan tiles per day and costs another 3 energy per tile. Map expansion shifts coordinates without charging travel. These are abstract simulation units, not a terrain/pathfinding physics model.
- Health/energy have capacity 100; nourishment/hydration have capacity 20. Daily healing is at most 3 health and recovery at most 30 energy, shared with scheduled recovery. Recovery and travel cannot use the same day's budget. Excess nutrition/hydration from consumption is lost at capacity.
- Entities have arbitrary names and material properties. `massPerUnit` defaults to 1; `nourishment` and `hydration` default to 0. Established values stay fixed during ordinary play. An unknown substance has no automatic food benefit.
- Material accounting uses ordered `transactions`: `encounter`, `consume`, `transform`, `transfer`, `discard`, and an explicitly authorized `observer` exception. A new natural stock requires an encounter; an existing stock cannot be replenished by calling it another encounter. Entity IDs remain reserved after deletion, so deleting an exhausted stock cannot make it eligible for another encounter grant. Structures require input material or an observer intervention. Output mass cannot exceed input mass. Missing output mass represents discarded waste, not a retained object.
- Transactions operate at the actor's final position for the day. Carried stock is accessible to its carrier, follows travel, and can be dropped or handed to someone at the same place. Splitting stock uses a material transformation into separately tracked entities. This represents physical possession, not a legal ownership system.
- Positive nourishment/hydration deltas are rejected. Consumption debits real stock using its established yields; `reserveTransfers` move provisions between people. Newborn nourishment/hydration must come from these transfers (`to: "new:0"` addresses the first new person).
- `scheduledEffects` contain a unique `id`, `actor`, `dueDay`, bounded bodily `delta`, and a causal `reason`. They execute once when due, survive reload, and cannot create future nourishment/hydration. IDs remain reserved after execution. Free-text conditions remain descriptive; a timed consequence must be scheduled to execute automatically.

The order is movement, ordered material transactions, provisions, explicit bodily changes, due effects, then daily upkeep and death. New people arrive at the end of the day with their funded reserves. Each approved day records a physical audit and Chronicle entries.

Example: consume one unit of an existing local entity without directly setting a bodily gain:

```json
{"summary":"A portion is tasted.","transactions":[{"kind":"consume","actor":1,"entity":"folded-growth","amount":1,"reason":"One portion was eaten"}]}
```

Referees still establish plausible encounters, first-tested material properties and causal mechanisms. The engine verifies the declared accounting; it does not prove that an invented organism or material is physically realistic. Observer exceptions require the caller's explicit world-change request, never a flag supplied by an inhabitant or outcome. The world remains browser-authoritative; host isolation and server authority are separate improvements.

## Dated observations and beliefs

The active world now stores personal evidence independently of physical state, in each person's `perceptionMemory`. Records include the observer, day, place, subject, snapshot and source reference. Inhabitant context is a detached projection of these records, including current bodily awareness and local sensory observations. Looking up an old place, entity or discovery never reads its current hidden state.

- Approved day boundaries capture local ground, nearby people and unconcealed ground objects or the person's own carried objects. Other people's carried inventories are private. `concealed: true` suppresses passive sight; a reasoned local `observations` entry can record an inspection. Names/descriptions are public sensory labels; secret identities and mechanisms belong in hidden `properties`.
- Distant terrain, object appearances, quantities and learned concepts retain their recorded snapshots. Deleting or moving an object elsewhere does not erase the memory or reveal its new location. Revisiting can establish that it is no longer visible there, without inventing a cause or destination.
- Property tests retain their own dates. Looking at an object today does not make an old taste test a fresh taste test. Authoritative entity `properties` and processes never automatically become learned properties.
- `reports` require a specific speech entry, a source who actually knows the subject, and a recipient within the two-tile Manhattan hearing range. They copy the speaker's dated record, not the current remote world. Entity property keys must be explicitly selected. Different sources remain attributed separately. Generic speech records what was heard without sharing an entire knowledge inventory.
- `inferences` cite the person's own evidence IDs. They remain hypotheses and do not change physical properties or create discoveries. A formal discovery requires personal observation evidence or a reasoned local observation; a hearsay/hypothesis record alone cannot establish it. Observations support later reflection even after the physical object is gone.
- Resources and the Mind view label current observations, memories, reports and hypotheses. The map and Chronicle remain observer views. Observer questions/replies never enter inhabitant memory; existing in-world spoken messages can enter nearby listeners' attributed experience records.

Example additions to a referee outcome:

```json
{"observations":[{"actor":1,"entity":"growth","properties":{"surface":"soft"},"reason":"A careful touch establishes texture"}],"speech":[{"actor":1,"text":"I remember a soft surface on the growth."}],"reports":[{"from":1,"to":2,"subject":"entity","subjectId":"growth","speech":0,"propertyKeys":["surface"]}]}
```

Old saves import saved personal snapshots and learned concepts with legacy provenance. When an observation date, old terrain or appearance was not saved, it remains unknown; migration never fills distant gaps from today's world. New people receive their own local observations and do not inherit a parent's private evidence. Latest facts and cited evidence persist separately from the 400-entry recent audit window. The versioned browser archive described below preserves committed checkpoints and supports replay.

The code enforces evidence channels, dates and access. Referees still judge whether free-text sensory descriptions, experiences and discoveries are causally justified; this cannot erase a model's pretrained knowledge or prove a statement true from its wording.

## Adjudication and reliable day progress

Agent choices are saved as a pending turn before consequence resolution. Retrying or reloading reuses those choices while their personal context is unchanged; partial successes are preserved if another inhabitant request fails. Changes to personal context invalidate the relevant turn cache. A successful commit clears it. A new world cancels the old attempt and rejects its late results.

The author proposes an outcome, deterministic physical/knowledge checks run first, and all ten reviewers of authored consequences receive the complete represented physical before-state, projected after-state, per-person evidence, due processes, explicit observer request and deterministic audit. Reviews no longer see only twelve targeted entities. The HTTP evidence budget is 1.8 million characters; oversize evidence is rejected explicitly rather than silently truncated.

Validation corrections include the actual error, original before-state and unchanged intentions. A concrete causal veto triggers up to two outcome revisions; unavailable reviewers and transport failures fail closed instead of being treated as substantive objections. There are at most five author requests in one attempt, with at most two data corrections per proposal. Incomplete provider output is preserved as an incomplete result and can be corrected into a smaller complete outcome. Optional visual direction is not required to resolve a day. Every review round remains in Event Rulings, and the current phase shows elapsed time.

### Fix for stale process-review dates

The reported error was traced to a newer GitHub version that required an active process's model-authored `nextReviewDay` to be after the day being resolved. Copying an old date, or retaining it through a partial update, could consume all three repairs without advancing.

The engine now owns `lastReviewed` and `nextReviewDay`. The model supplies a substantive `review`, status (`active`/`resolved`), and optionally `reviewInDays` (1–365, default 1). After reviewing day 5, an active process's next review is computed as day 6 by default. A stale legacy `nextReviewDay: 5` is accepted as scheduling metadata and normalized after the review; it is not a reason to regenerate the world outcome. Missing or unsupported timing also schedules the next day.

This does not skip due consequences. Every due active process still needs an explicit consequence/stability review. Actual effects must be represented in the physical outcome, and reviewers compare the resulting changes. Calendar records never apply extra bodily deltas; deterministic upkeep and dated effects execute exactly once on commit. A date-only update without a review is rejected with the specific missing process IDs.

```json
{"summary":"The ongoing condition is reviewed.","processes":[{"id":"existing-process-id","review":"Describe actual consequences or evidence of stability this day.","status":"active","reviewInDays":1}]}
```

The regression scenarios reproduce the exact old day-5 date, repeated stale dates across subsequent days, omitted dates, missing reviews, provider truncation, veto revisions, retry/reload persistence and world-reset cancellation. The bounded-turn policy below supersedes the former day-wide hold on individual model failures and due process reviews. Rejected authored additions are never treated as approved facts; engine-only commits are explicitly recorded.

## Explore and observe

The game opens into a full-window aerial map. Drag to pan, scroll or double-click to zoom, and use Fit to return to the whole world. Search for people, observed coordinates or named features. Satellite and Terrain views share the same geography. The information panel has Overview, People, Resources and Chronicle tabs; on phones it becomes a bottom sheet.

New entities and structures appear as interactive map features. Terrain may have arbitrary names and referee-specified colour; an entity's appearance can include a colour, scale and polygon footprint. The Visual Referee directs additional scene treatment from authoritative evidence. This is a synthetic aerial rendering, not photographic Google Maps imagery.

Resources shows encountered things and what the selected person has actually learned, rather than assuming everything is berries, water, wood, stone or fibre. Character details show carried entities and established conditions. The observer can submit any world-change request; the referees resolve it instead of a finite keyword interpreter.

Space toggles playback, F fits the map, and Escape closes selection. Consequential world resolution waits for models. Optional visual and development reviews run in cancellable background lanes; each lane keeps its current request and the newest waiting snapshot. Every day records a compact evidence summary, so the single cumulative **Development** brief can consider intervening days even when requests lag. New World cancels pending requests and invalidates old results.

Worlds are saved in browser local storage. Export backs up the world's records; GitHub stores source, not browser saves.

## Run locally

```sh
node scripts/source-council.mjs --port 8000
```

Open http://127.0.0.1:8000. The same-origin server forwards inhabitant requests to `/api/inhabitant`, referee requests to `/api/referee`, and votes to `/api/council` at the configured remote service. If that service is unavailable, a locally configured model API can provide tool-free inference. The live game never falls back to the Codex CLI, including when launched with `--agents codex`. Without a reachable tool-free model, the world holds its physical state and reports the failure.

A static preview can also use `python3 -m http.server 8000 --directory dist`; its separate public endpoint URLs are in `dist/config.js`. The model service is `server.js`. Existing `OPENAI_API_KEY`, `AGENT_MODEL` and optional `OPENAI_API_URL` configure the default inference backend. For independent inhabitant/referee backends, set `INHABITANT_API_KEY`, `INHABITANT_MODEL`, `INHABITANT_API_URL` and/or `REFEREE_API_KEY`, `REFEREE_MODEL`, `REFEREE_API_URL`. Each role falls back to the existing default settings for omitted configuration. These variables also configure the local HTTP fallback. Existing `WORLD_MODEL` remains a fallback for outcome authoring when `REFEREE_MODEL` is unset; specialist votes still use `AGENT_MODEL`. `MODEL_TIMEOUT_MS` bounds each upstream call (default 65 seconds). Structured response guidance is separate from the engine’s authoritative validation. The Cancel control aborts an active day while preserving completed intentions for retry. Credentials stay in the server process; the model receives no environment variables or repository path.

## Inhabitant boundary

The live inhabitant API accepts only `{actor, operation, view}` plus bounded dialogue/observer-question fields. Operations are `intention`, `dialogue`, and `observer-reply`. The browser selects the living actor and derives the personal view from that person's records; it sends no raw inhabitant prompt, world snapshot, hidden entity properties, referee laws, credentials or source files. The service validates the allowlisted data and supplies its own role instructions separately from the untrusted world text.

Inhabitants return an intention or a short sentence. Intention fields are limited to `action`, `reason`, `goal`, known `targetEntityIds`, and an optional `destination`. Output cannot choose an actor, change roles, approve outcomes, submit physical deltas, or attach tools or observer privileges. Response identity and operation are checked in the service and again in the game before accepting the result. Intention text is an attempted action, never executable host code.

Every live inference request sets `tools: []`, `tool_choice: "none"`, and `store: false`. There is no subprocess, CLI fallback, command executor, file-reading tool, browser tool, shared provider conversation, or tool-call dispatcher in the live runtime. Unexpected model tool calls are rejected. Each request includes only its explicit context; saved personal experiences remain in the game's existing records. Individual continuity and addressed communication are described below.

Referee authoring and advisory requests have a separate endpoint and allowlisted purposes. `/api/agent` remains a restricted alias for referee requests; it no longer accepts dialogue or `world-intention` prompts. World-change requests still originate in the observer UI, and inhabitants cannot grant themselves that path through output fields. The optional source-review CLI is a separate privileged workflow; live inference does not import or call it.

This is a capability boundary around model execution, not authentication against a person controlling the browser. The world and supplied personal views are still browser-authoritative, the endpoints are hosted by the same HTTP application, and independent model credentials are optional. Dated observation records are now implemented; the archive remains browser-authoritative rather than a server trust boundary. A pretrained model also retains its training knowledge; filtering its context cannot erase it.

The optional source-code council produces patches for manual review through its source-review workflow (for example, `node scripts/source-council.mjs --once work/exported-world.json --agents codex`). Its Codex sessions can inspect source in read-only mode; they are never inhabitant sessions. It does not edit, commit, push or publish source itself. Game-development guidance has one visible source: Development.

## Verification

```sh
node --test tests/*.test.js tests/*.test.mjs
node tests/referee-world.browser.cjs
node tests/knowledge.browser.cjs
node tests/adjudication.browser.cjs
node tests/map-workspace.browser.cjs
node tests/agent-projects.browser.cjs
```

The open-world browser scenario exercises unclassified encounters, mixed consumption effects, arbitrary discovery and construction, dynamic weather, a ten-vote veto, model failure, and reload persistence. Legacy scenarios continue to check prior saves and the map interface. Model-service and local-fallback tests use controlled responses; the development environment cannot reach the live Render endpoint, so live model quality and remote deployment must be assessed in play.

See [World assessment and refactor](docs/world-refactor.md) for the earlier assessment and subsequent changes.

### Individual continuity (item 5)

`dist/continuity.js` adds agent-authored preferences, confidence-rated beliefs, predictions, commitments, and addressed messages/offers. Stable IDs revise a person's own records. Belief assessments cite that person's supplied evidence; prior predictions remain in the revision history and cited records remain available after the recent sensory window rolls over. Due predictions and promises are highlighted in the next private context. Learning remains a model decision: the engine preserves and presents contradictory evidence; it does not claim to train the underlying model.

Messages reach only their named living recipient within hearing range after the day's movement. Acceptance/decline must reference an offer actually received from that person. Offers, acceptances and self-reported fulfillment never transfer possessions or impose a promise on someone else. Material transfers still require the physical ledger and adjudication. Birth starts a new private continuity record. The Mind drawer shows preferences, beliefs, commitments and attributed inbox messages; observer chat remains outside these records.

Private retrieval is bounded: 24 current records per category, 80 recent continuity episodes, 40 inbox entries; inference receives the latest 12 episodes/messages plus current beliefs and preferences and their retained citations. Checkpoint exports preserve earlier states rather than letting summaries invent a life history.

### World archive and experiments (item 6)

The **Archive** control opens an IndexedDB archive of immutable checkpoints. Each committed day stores its full state, the recorded outcome and intentions, the prior state required for deterministic replay, engine format versions, experiment identity and available model names. Writes use transactions, and storage errors appear visibly. The immediate browser save also keeps a previous valid recovery copy; damaged primary data is retained separately instead of silently discarded.

- **Inspect** plays back saved records without inference. **Verify replay** re-applies the recorded outcome with the installed engines and compares physical state and personal evidence. A mismatch is reported; the original checkpoint is retained. This verifies deterministic consequence application, not the original models' narrative reasoning.
- **Branch here** creates an independent run at a checkpoint with parent run/day provenance, clears pending intentions and cancels background work. It leaves the source history intact.
- Label runs with experimental configuration. Compare matching-day survival, health, discoveries, exploration and completed goals in the archive; exported metrics also include verified transfers and self-reported mistaken beliefs/broken promises. These descriptive measures do not prove cooperation or absence of knowledge leaks. Model names are recorded when providers return them; labels can document settings not exposed by a provider.
- **Export complete archive** and **Import world or archive** support portable versioned bundles with corruption checks, plus the existing plain world export. Invalid input is rejected before replacing the current world. Imported worlds become branches. Save an external export for a backup independent of browser storage.

This is durable browser persistence, not server authority or multi-device synchronization. Browser-data deletion, browser eviction and device loss can remove local archives. Checksums detect accidental corruption; they are not cryptographic signatures or protection against the browser owner. Changing engine versions can invalidate a historical replay; saved checkpoints remain inspectable. No deployment is performed automatically.

### Reporting a stalled day

Click **Download bug report** in the header (also shown beside a stalled-day status), then attach the downloaded `first-world-bug-day-….json` file when reporting the problem. Download it before clearing browser data or repeatedly retrying. The button also works while a request is still waiting. You do not need the browser console.

The observer-only log records attempt IDs and timestamps, phases, the initial world snapshot, chosen intentions, author prompts/responses, validation errors and stacks/codes, repair/revision numbers, all referee votes/reasons, HTTP statuses and elapsed times, provider completion/truncation metadata, cancellation, and whether a day committed. The export includes the current world and available backend revision from `/health`. Existing errors/current state can be exported immediately, but detailed tracing begins with attempts made on the logging-enabled version.

Diagnostics are stored separately from agent context and world saves, survive reloads, and retain up to four recent attempts within a 2 MB browser-storage budget. Oversized entries are marked as truncated; the exported current world is complete. Storage failure keeps the in-memory report downloadable. Reports contain simulation history and model text; credentials and authorization headers are not recorded, and recognized secret fields/key patterns are redacted. Nothing is uploaded automatically.


Day-one intention validation constrains `targetEntityIds` to the private view’s actual object IDs; when no objects are known, the schema permits only an empty array. Terrain, people and exploratory searches are expressed in action text rather than fabricated object IDs. Unknown-target, incomplete and malformed-JSON responses receive at most two corrections against the identical private context, within a 50-second inference budget. Tool calls, privilege injection and transport failures remain terminal. Rejected model outputs and validation codes are returned as diagnostic metadata, never as observations or world changes.


### Outcome contract and repeated process validation failures

The model provider receives a strict envelope with `summary`, `processes`, and `changesJson`. The process item schema comes directly from `ProcessClock.schema`: all records require identity, description, status, subject IDs, a causal review and a review interval. The server decodes the flexible JSON change payload into the existing outcome format before engine validation; arbitrary properties, materials and mechanisms remain supported. Malformed payloads are explicit repairable failures, never silently converted into a quiet day. Backend health reports the contract version. The nano outcome author uses low reasoning effort; inhabitants and specialist votes retain minimal effort.

Legacy process records that omit only `subjects` are recorded as unscoped (`[]`) with a bookkeeping correction; no person or physical effect is inferred. Wrong subject types/IDs, missing causal reviews and forgotten due processes still fail validation. The author is asked for minimal actual changes and no routine observation/day-clock processes. Regression fixtures retain the three real rejected outcomes from the day-one report, including the fabricated stock and missing-review errors that must still be rejected. Cached literal example actions are regenerated rather than re-used as meaningful intentions.


### Day resolution authority (review policy 2)

`dist/review-policy.js` separates established physics from novel authored consequences. The engine owns daily food/water use, energy costs, deprivation damage and previously scheduled effects. Its audit now records before/after meters and the exact costs/causes, including starvation and dehydration. Social inactivity does not suspend these rules.

Reviewers receive `engineAuthority`, a versioned review contract and exact `reviewTargets`. A blocking objection must use scope `proposal`, identify one of those paths, cite evidence and fall within that target’s reviewer domain. Engine-rule disagreements and narrative wording are advisory. Unsubstantiated rejections cannot authorize additions: those additions are withheld if correction fails. No majority can overrule a valid domain-specific objection, and no rejected material, healing or knowledge is silently applied.

When no new authored change needs review, the day commits under the physical core without ten speculative votes. When bounded author/review attempts fail, a fully determined engine-only day may commit with no authored additions. Under contract 4, due-process uncertainty stays explicitly overdue and new effects remain unadmitted. Explicit observer requests and user cancellation remain atomic; a complete inhabitant infrastructure outage pauses visibly. This changes the old all-or-nothing unanimity gate intentionally; it does not claim every world event is decidable without a model. Resolution receipts, Event Rulings and bug reports show which path was used and which additions were withheld. Reviewer criticism is not converted into a new world process.

Inhabitants now receive grounded private bodily sensations (hunger, thirst, weakness, exhaustion) as well as numeric meters. These do not expose other people’s bodies or impose an action priority. Empty change strings and exact duplicate envelope fields normalize as bookkeeping; conflicting payloads still fail. The day-seven regression replays the uploaded stalemate: food/water 1→0, health 90→74, no new audit process and no reviewer veto over established deprivation.

### Direct actions, speech and specialist review (contract 3)

New inhabitant intentions include `execution` and `speech` alongside their own free-text action and goal. The model service corrects missing execution/speech fields against the same private view rather than treating prose as a completed action. Existing saved intentions remain readable; the intention cache version forces fresh choices when upgrading.

`RoutineActions` deterministically executes bounded movement, rest, local inspection, waiting and consumption of personally established, accessible material. Travel advances toward a coordinate within the existing travel/energy limits. Rest restores energy within capacity and combined scheduled-recovery limits. Consumption debits shared finite stock in stable actor order; unknown properties, inaccessible stock, depletion and invalid destinations produce honest private result feedback. Inspection refreshes visible sensory evidence without inventing encounters or exposing hidden properties. Searching for new ecology, testing unfamiliar material, building and other novel attempts remain free-form, model-resolved actions. Ordinary actions still incur daily upkeep exactly once.

Agents choose their actual spoken words in the same intention call, or `null` for silence. The engine delivers speech to living listeners within two tiles at final positions, records attributed hearsay, and displays it in the chronicle and Agent Chat filter. The next turn includes what the listener heard, allowing replies without a separate dialogue-author or council call. Reflection messages also enter hearing memory. Speech can contain subjective beliefs and proposals, but establishes no physical facts, discoveries, inventory transfers or consent. The manual Hear Agents exchange remains available. No audio synthesis is added.

Days consisting entirely of routine actions and speech bypass both outcome author and council, unless a genuine due process or explicit observer request requires judgment. On mixed days, the author proposes only additional novel consequences; engine-owned routine changes are merged once and excluded from review targets. Rejected or malformed novel additions cannot erase routine movement, rest, resource use or speech. Contract 4 preserves atomic holds for explicit observer requests and cancellation, and explicitly pauses complete inhabitant infrastructure outages. Individual failures and overdue process reviews do not freeze established physics.

Review contract 3 selects only specialists named by actual authored review targets. Both hosted and local API routes derive the roster from those targets rather than trusting a caller-supplied reviewer list. Rules/laws, births and explicit observer interventions retain the full council. Older ten-vote responses remain readable, but only the relevant specialist decisions participate. Engine results, specialist targets and request timing remain available in bug reports; per-agent ordinary-action results are also stored as private dated experiences and continuity episodes. Replay regenerates the same results without models.

Validation adds controlled browser coverage for automatic speech, chat filtering, hearing boundaries, real movement/rest, zero outcome/council requests on routine days, reload and exact archive replay, plus unit/API checks for finite consumption, mixed novel/routine days, rejected additions, death during speech, bounded intention correction and specialist call counts.

### Bounded turn preparation and deterministic commits (contract 4)

The uploaded day-one report exposed a mismatch between model schema and validation: Nano repeatedly returned `inspect`/`wait`/`move` with `entity` and `amount`, plus empty speech. The old gateway rejected unused fields and the old `Promise.all` propagated one failure to the entire day. `tests/fixtures/day-one-command-failure.json` retains every captured reply as simulation data.

The command gateway now produces canonical commands. Parameters unused by non-consumption actions are discarded; blank speech becomes silence (`null`). Unknown action kinds, extra privileged fields, invalid consumption quantities and unknown object targets still fail. The provider receives a strict tagged command schema separating ordinary actions from `consume`, with a stable nullable envelope and optional personal reflection encoded as `reflectionJson`. Older plain responses remain readable. Runtime diagnostics identify semantic failures separately from infrastructure failures.

`TurnKernel` separates bounded model preparation from synchronous commit:

- Each actor gets at most 12 seconds to supply a command; one actor's invalid response or deadline never cancels another actor's accepted command. Late responses cannot enter the closed turn. Successful choices remain cached across a cancelled/held attempt against the same personal context. Missing actions are recorded honestly; the engine does not invent an intentional wait, speech or goal.
- If every living actor is unavailable because of infrastructure/deadline failures, the world pauses explicitly without consuming a day. All-invalid semantic replies may still produce a logged no-action turn with real physical upkeep.
- Novel authoring and specialist review share an 18-second preparation budget. Failed, invalid, disputed or late additions are withheld and recorded as expired proposals; they are never silently admitted or retroactively applied. Accepted ordinary actions, upkeep and established scheduled effects still commit. Observer edicts remain explicit atomic requests and may be held when unresolved.
- A due process with no accepted review remains overdue, retaining its prior `lastReviewed` and `nextReviewDay`. `pendingProcessReviews` and visible resolution events record that uncertainty. No new consequence is invented, no review date is fabricated, and already established dated effects execute exactly once. This is explicit unresolved state, not a claim that all effects of an unknown mechanism were resolved.
- Commit checks a deterministic before-state version and turn identity, enforces one command per living actor, then calls the physical/knowledge engine without network IO. Repeating a committed turn ID cannot advance time twice; a different stale command is rejected. Sixteen recent turn receipts identify accepted command IDs and missing actions. The eight most recent withheld proposals retain their reason and expiry.
- Optional appearance parsing cannot veto a valid world transaction. Its failure is logged independently and the map keeps a grounded fallback. HTTP cancellation propagates to upstream model calls; responses to closed connections are discarded.

Archive checkpoints store the complete prepared turn envelope. Replay uses the same deterministic commit path and makes no model calls; older checkpoints continue to use their recorded outcome path. The state version is a local conflict check, not authentication or server authority. Diagnostics capture `command.rejected`, proposal failures and `turn.committed`, alongside raw API responses. No world reset is required. Work on the separately requested review scheduling, richer personal feedback and observer UI (items 4–6) remains paused and is not included in this release.

Regression coverage includes all captured production reply shapes, HTTP gateway canonicalization, independent invalid/timed-out agents, global outage pause, stale and duplicate command rejection, cancellation, malformed optional appearance, overdue process uncertainty, exact replay, and a 100-turn run with intermittent malformed replies and a finite shared supply. The live Render endpoint is not reachable from this environment; live provider behaviour and deployment revision still need confirmation in the game's bug report.

## Common Ground: version 2 experimental world

Open `/v2/` alongside the preserved original prototype. Six individuals receive local observations, personal body state and bounded private memories. Two sites replenish finite water/food stocks every three turns; two portable jars support water transport. Code implements movement, drinking/eating, gathering, carrying, filling, giving, pouring, rest and local speech. No teams, trades, leadership or cooperation are scripted. Initial reserves provide thirty turns before deprivation. Forgiving/scarce conditions and reproducible seeds support comparisons; rules remain fixed within a run.

The experiment reuses `TurnKernel` deadlines/failure isolation, the existing server-side tool-free model credentials, the diagnostic export pattern and deterministic journal replay. `/api/sandbox` is a separate inhabitant endpoint; it never invokes a world-author or referee council. Existing `/api/inhabitant` and the prototype remain compatible. All model calls prohibit tools and provider storage. Model/server outages pause explicitly when all requests fail; one malformed action does not prevent other actions or upkeep.

The observer can inspect individuals, read actual events and private records, label runs, take notes, compare summary metrics, import/export complete runs and verify replay. Saves use a separate browser key. Speech and transfers are descriptive measures, not claims that emergence or cooperation has occurred. Autonomous experimentation beyond the implemented object operations is not yet supported. The new backend route requires the matching Render deployment; frontend publication alone cannot confirm provider availability.
