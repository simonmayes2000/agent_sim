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

- The world advances one day per step. Resources regrow; people consume food and water and need rest.
- A hidden technology referee considers only observed materials, carried supplies, local conditions, and personally known inventions. Experiments may fail. Successful discoveries become nodes in a world-specific dependency graph, and nearby people can pass knowledge through speech.
- A birth requires two nearby adults with mutual affinity and sufficient health, food, and water. Parents and siblings cannot reproduce together.
- Offspring receive six of twelve character traits from each parent. Each inherited trait has an independent 8% chance of mutation.
- The observer can speak to a person. These exchanges appear in the record but are not added to the person's memory or decisions.

This release uses local decision rules, a procedural hidden technology referee, and generated dialogue. It does not call a live ChatGPT model. The referee uses finite material affordance rules, but there is no predefined visible technology tree or fixed unlock order. The interface and simulation state are stored in the browser's local storage. Use **Export log** to back up a particular world's history, including its technology graph and experiment record; GitHub preserves the source code, not browser save data.
