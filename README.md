# The First World

A browser-based agent survival simulator. Adam and Eve begin in a small world where they gather food and water, speak, experiment with materials, share discoveries, and may have descendants.

Play the private Site: https://the-first-world-simulator.creamdaisy32.chatgpt.site

## Run locally

Serve the `dist` folder with any static web server, for example:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000.

## Simulation rules

- The world advances one day per step. Resources regrow; people consume food and water and need rest. Explored ground is revealed, travel leaves paths, and the map expands from 8×6 toward 16×14 as people reach new areas.
- A hidden technology referee considers only observed materials, carried supplies, local conditions, and personally known inventions. Experiments may fail. Successful discoveries become nodes in a world-specific dependency graph; physical inventions leave visible structures on the map. Nearby people can pass knowledge through speech.
- A birth requires two nearby adults with mutual affinity and sufficient health, food, and water. Parents and siblings cannot reproduce together.
- Offspring receive six of twelve character traits from each parent. Each inherited trait has an independent 8% chance of mutation.
- People with strong mutual ties can form clans. Their territory, settlement marker, and membership appear on the map and in the clan record.
- The overseer can speak to a person without changing their memory. The overseer can also describe a world change in free text. Ten local referees review its interpretation, and the preview states the exact effect before it is enacted. The interpreter handles resource additions and removal, terrain, weather, and changes to a named person's health or life. Unrecognized descriptions create a persistent mystery at the selected place. Agents encounter perceptible effects and discuss them without learning the overseer's wording or intent.

This release uses local decision rules, procedural referees, and generated dialogue. It does not call a live ChatGPT model. Free text is interpreted by finite rules, so descriptions outside those rules become encounterable mysteries rather than arbitrary new physics. The technology referee uses finite material affordance rules, but there is no predefined visible technology tree or fixed unlock order. The interface and simulation state are stored in the browser's local storage. Use **Export log** to back up a particular world's history, including its technology graph and experiment record; GitHub preserves the source code, not browser save data.
