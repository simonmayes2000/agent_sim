const test = require('node:test');
const assert = require('node:assert/strict');
const GroundedSpeech = require('../dist/grounding.js');

test('agent dialogue stays within observed facts and the current situation', () => {
  const context = {
    observed: ['forest', 'water'],
    knowledge: [],
    nearby: ['Eve'],
    situation: 'We need water soon.'
  };
  assert.equal(GroundedSpeech.accepts('We need water soon.', context), true);
  assert.equal(GroundedSpeech.accepts('I found a shimmering spring after following the dawn-star map.', context), false);
  assert.equal(GroundedSpeech.accepts('Eve, I see water near the forest.', context), true);
  assert.equal(GroundedSpeech.accepts('Eve, we need water today.', context), true);
  assert.equal(GroundedSpeech.accepts('I found a map.', context), false);
  assert.equal(GroundedSpeech.accepts('I think the edible berries might be here, Eve.', {
    nearby: ['Eve'], knowledge: ['Edible berry'], situation: 'I observed a berry here.'
  }), true);
});
