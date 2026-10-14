const test = require('node:test');
const assert = require('node:assert/strict');
const referee = require('../dist/technology.js');

function world() {
  const tiles = Array.from({ length: 48 }, (_, i) => ({ type: i === 0 ? 'rock' : i === 1 ? 'forest' : 'grass', fibre: 4, wood: 3, stone: 3 }));
  const person = { name: 'Eve', x: 0, y: 0, observed: [], knowledge: [], supplies: { wood: 2, stone: 2, fibre: 3 }, food: 8, water: 8, genes: { curiosity: 60, creativity: 60 } };
  const state = { version: 2, width: 8, height: 6, day: 3, weather: 'clear', tiles, agents: [person], tech: { nodes: [], trials: [] } };
  return { state, person };
}

test('opportunities depend on observations and known inventions', () => {
  const { state, person } = world();
  assert.deepEqual(referee.possibilities(person, state), []);
  person.observed = ['rock'];
  const edge = referee.possibilities(person, state).find(c => c.effect === 'edge');
  assert.ok(edge);
  assert.equal(referee.possibilities(person, state).some(c => c.effect === 'tool'), false);
  const result = referee.tryExperiment(person, state, edge, () => 0);
  assert.equal(result.status, 'learned');
  assert.equal(person.supplies.stone, 1);
  person.observed.push('forest');
  const tool = referee.possibilities(person, state).find(c => c.effect === 'tool');
  assert.deepEqual(tool.parents, [edge.id]);
  person.x = 1;
  const next = referee.tryExperiment(person, state, tool, () => 0);
  assert.equal(next.status, 'learned');
  assert.deepEqual(next.node.parents, [edge.id]);
});

test('failed trials do not leak knowledge or invent a technology', () => {
  const { state, person } = world();
  person.observed = ['rock'];
  const edge = referee.possibilities(person, state)[0];
  const result = referee.tryExperiment(person, state, edge, () => 1);
  assert.equal(result.status, 'failed');
  assert.equal(person.knowledge.length, 0);
  assert.equal(state.tech.nodes.length, 0);
  assert.equal(state.tech.trials[0].result, 'failed');
});

test('old saved worlds retain discoveries and gain material inventories', () => {
  const { state, person } = world();
  delete state.tech;
  delete person.supplies;
  state.version = 1;
  state.discoveries = ['berries', 'edge'];
  person.knowledge = ['berries', 'edge'];
  referee.ensure(state);
  assert.equal(state.version, 2);
  assert.equal(state.tech.nodes.length, 2);
  assert.ok(referee.knows(person, state, 'food'));
  assert.ok(referee.knows(person, state, 'edge'));
  assert.deepEqual(person.supplies, { wood: 0, stone: 0, fibre: 0 });
});
