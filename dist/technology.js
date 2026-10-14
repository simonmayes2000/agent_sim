/* The hidden referee sees only observations, carried materials, and learned inventions.
   These affordance rules describe what can be tested; they are not a visible unlock tree. */
(function (root) {
  'use strict';
  const legacy = {
    berries: { id: 'taste:berry', name: 'Edible berries', effect: 'food', method: 'taste', materials: ['berry'], detail: 'Testing the red fruit shows that it eases hunger.' },
    shelter: { id: 'arrange:wood+fibre', name: 'Leaf shelter', effect: 'shelter', method: 'arrange', materials: ['wood', 'fibre'], detail: 'Branches and leaves interrupt the rain.' },
    edge: { id: 'chip:stone', name: 'Stone edge', effect: 'edge', method: 'chip', materials: ['stone'], detail: 'A struck stone leaves a sharp edge.' },
    fire: { id: 'rub:wood+fibre', name: 'Kept ember', effect: 'fire', method: 'rub', materials: ['wood', 'fibre'], detail: 'Dry fibres catch a spark from worked wood.' }
  };
  function ensure(state) {
    if (!state.tech) {
      state.tech = { nodes: [], trials: [] };
      const old = state.discoveries || [];
      for (const key of old) if (legacy[key] && !state.tech.nodes.some(n => n.id === legacy[key].id)) {
        state.tech.nodes.push({ ...legacy[key], parents: [], day: state.day, discoverer: 'Earlier world', inherited: true });
      }
      for (const a of state.agents || []) a.knowledge = (a.knowledge || []).map(k => legacy[k]?.id || k);
    }
    for (const a of state.agents || []) {
      if (!a.supplies) a.supplies = { wood: 0, stone: 0, fibre: 0 };
      if (!a.knowledge) a.knowledge = [];
      if (!a.seenTiles) a.seenTiles = [];
    }
    for (const t of state.tiles || []) if (t.fibre == null) t.fibre = t.type === 'forest' ? 6 : t.type === 'grass' ? 4 : 0;
    state.version = 2;
  }
  function get(state, id) { return state.tech.nodes.find(n => n.id === id); }
  function knows(a, state, effect) { return a.knowledge.some(id => get(state, id)?.effect === effect); }
  function knownNode(a, state, effect) { return a.knowledge.map(id => get(state, id)).find(n => n?.effect === effect); }
  function offer(method, materials, effect, name, detail, site, costs, parents = [], weight = 1) {
    const id = `${method}:${materials.join('+')}${parents.length ? ':' + parents.map(p => p.id).join('|') : ''}`;
    return { id, method, materials, effect, name, detail, site, costs, parents: parents.map(p => p.id), weight };
  }
  function possibilities(a, state) {
    const seen = new Set(a.observed || []), list = [];
    const has = type => seen.has(type);
    const add = c => { if (!a.knowledge.includes(c.id)) list.push(c); };
    const edge = knownNode(a, state, 'edge'), cord = knownNode(a, state, 'cord');
    const fire = knownNode(a, state, 'fire'), shelter = knownNode(a, state, 'shelter');
    const tool = knownNode(a, state, 'tool'), vessel = knownNode(a, state, 'vessel');
    const heated = knownNode(a, state, 'heated-stone');
    const prepared = knownNode(a, state, 'prepared-food');
    if (has('berry')) add(offer('taste', ['berry'], 'food', 'Edible berries', 'Testing the red fruit shows that it eases hunger.', 'berry', { food: 1 }, [], 3));
    if (has('rock')) add(offer('chip', ['stone'], 'edge', 'Stone edge', 'A struck stone leaves a sharp edge.', 'rock', { stone: 1 }, [], 2));
    if (has('grass')) add(offer('twist', ['grass'], 'cord', 'Twisted grass cord', 'Twisting strands together makes them resist a pull.', 'grass', { fibre: 2 }, [], 2));
    if (has('forest')) add(offer('twist', ['bark'], 'cord', 'Bark cord', 'Long bark strands hold when twisted together.', 'forest', { fibre: 2 }, [], 2));
    if (has('forest') && (has('grass') || has('forest'))) add(offer('arrange', ['wood', 'fibre'], 'shelter', 'Leaf shelter', 'A leaning frame and a covering keep off some rain.', 'forest', { wood: 2, fibre: 1 }, [], state.weather === 'rain' ? 4 : 1));
    if (has('forest') && has('grass')) add(offer('rub', ['wood', 'fibre'], 'fire', 'Kept ember', 'Friction and dry tinder leave an ember that can be tended.', 'forest', { wood: 1, fibre: 2 }, [], 1));
    if (edge && has('forest')) add(offer('carve', ['wood'], 'tool', 'Carved digging stick', 'The sharp edge shapes a branch into a useful point.', 'forest', { wood: 1 }, [edge], 2));
    if (edge && has('forest')) add(offer('hollow', ['wood'], 'vessel', 'Hollowed wooden bowl', 'An edge removes the soft centre of a fallen branch.', 'forest', { wood: 2 }, [edge], 1));
    if (cord && has('forest')) add(offer('bind', ['wood', 'fibre'], 'frame', `Bound frame with ${cord.name.toLowerCase()}`, 'Cord holds separate branches in a stable shape.', 'forest', { wood: 2, fibre: 1 }, [cord], 2));
    if (cord && has('grass')) add(offer('weave', ['fibre'], 'vessel', `Woven grass basket with ${cord.name.toLowerCase()}`, 'Crossed fibres can hold gathered food.', 'grass', { fibre: 3 }, [cord], 1));
    if (fire && has('berry')) add(offer('warm', ['berry', 'wood'], 'prepared-food', 'Warmed berries', 'Gentle heat changes the fruit and makes it easier to keep.', 'berry', { food: 1, wood: 1 }, [fire], 2));
    if (fire && has('rock')) add(offer('heat', ['stone', 'wood'], 'heated-stone', 'Heated stones', 'Stones held near an ember keep heat for a time.', 'rock', { stone: 1, wood: 1 }, [fire], 1));
    if (heated && has('water')) add(offer('immerse', ['stone', 'water'], 'safe-water', 'Warmed water', 'A hot stone can warm water held in a hollow.', 'water', { stone: 1, water: 1 }, [heated], 2));
    if (shelter && cord) add(offer('reinforce', ['wood', 'fibre'], 'strong-shelter', `Reinforced ${shelter.name.toLowerCase()}`, 'Cord helps a shelter withstand wind and rain.', 'forest', { wood: 1, fibre: 2 }, [shelter, cord], 2));
    if (tool && has('rock')) add(offer('weight', ['wood', 'stone'], 'strong-tool', `Weighted ${tool.name.toLowerCase()}`, 'A stone adds force to a shaped wooden tool.', 'rock', { wood: 1, stone: 1 }, [tool], 1));
    if (vessel && has('water')) add(offer('carry', ['water'], 'water-store', `Carried water in ${vessel.name.toLowerCase()}`, 'A container lets water travel farther from its source.', 'water', { water: 1 }, [vessel], 2));
    if (prepared && fire) add(offer('dry', ['berry', 'wood'], 'stored-food', 'Dried fruit', 'Keeping fruit close to gentle heat makes it last longer.', 'berry', { food: 1, wood: 1 }, [prepared, fire], 1));
    return list;
  }
  function choose(a, state, rng) {
    const options = possibilities(a, state);
    if (!options.length) return null;
    let total = options.reduce((sum, c) => sum + c.weight, 0), draw = rng() * total;
    for (const c of options) { draw -= c.weight; if (draw <= 0) return c; }
    return options[options.length - 1];
  }
  function missing(a, candidate) {
    for (const [material, amount] of Object.entries(candidate.costs)) {
      if (material === 'food' || material === 'water') { if (a[material] <= amount + 2) return material; }
      else if ((a.supplies[material] || 0) < amount) return material;
    }
    return null;
  }
  function tryExperiment(a, state, candidate, rng) {
    const absent = missing(a, candidate);
    if (absent) return { status: 'missing', material: absent };
    if (state.tiles[a.y * 8 + a.x].type !== candidate.site) return { status: 'site' };
    const chance = Math.min(.82, .27 + a.genes.curiosity / 400 + a.genes.creativity / 500 + (candidate.parents.length ? .06 : 0));
    const success = rng() < chance;
    for (const [material, amount] of Object.entries(candidate.costs)) {
      if (material === 'food' || material === 'water') a[material] -= amount;
      else a.supplies[material] -= success ? amount : Math.min(amount, 1);
    }
    state.tech.trials.push({ day: state.day, person: a.name, method: candidate.method, materials: candidate.materials, result: success ? 'worked' : 'failed', technology: success ? candidate.id : null });
    if (state.tech.trials.length > 120) state.tech.trials.shift();
    if (!success) return { status: 'failed' };
    let node = get(state, candidate.id);
    const newToWorld = !node;
    if (!node) {
      node = { id: candidate.id, name: candidate.name, effect: candidate.effect, method: candidate.method, materials: candidate.materials, detail: candidate.detail, parents: candidate.parents, day: state.day, discoverer: a.name };
      state.tech.nodes.push(node);
    }
    a.knowledge.push(node.id);
    return { status: 'learned', node, newToWorld };
  }
  root.TechReferee = { ensure, get, knows, knownNode, possibilities, choose, missing, tryExperiment };
  if (typeof module !== 'undefined') module.exports = root.TechReferee;
})(typeof window !== 'undefined' ? window : globalThis);
