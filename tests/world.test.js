const test = require('node:test');
const assert = require('node:assert/strict');
const world = require('../dist/world.js');

function setup(){
  const tiles=Array.from({length:48},(_,i)=>world.tile(i===16?'berry':i===17?'water':'grass',i));
  const agents=[1,2,3].map(id=>({id,name:'Person '+id,x:id-1,y:2,alive:true,likes:{},seenTiles:[16,17],noticedInterventions:[],knownItems:{},supplies:{wood:3,stone:3,fibre:3}}));
  for(const a of agents)for(const b of agents)if(a!==b)a.likes[b.id]=75;
  const state={version:3,day:5,width:8,height:6,tiles,agents,explored:[16,17],clans:[],nextClanId:1,interventions:[],nextInterventionId:1,nextItemId:1};
  return {state,agents};
}

test('new exploration expands the map while preserving old locations and territory',()=>{
  const {state,agents}=setup();state.explored=Array.from({length:12},(_,i)=>i);state.tiles[16].structures.push({kind:'shelter',name:'Leaf shelter'});
  const result=world.maybeExpand(state,()=>.4);
  assert.equal(result.width,10);assert.equal(state.tiles.length,80);
  assert.equal(agents[0].x,1);assert.equal(agents[0].y,3);
  assert.equal(state.tiles[3*10+1].structures[0].kind,'shelter');
  assert.ok(state.explored.includes(1*10+1));
});

test('mutual relationships create a visible clan and visited territory',async()=>{
  const {state,agents}=setup();const formed=await world.updateClans(state);
  assert.equal(formed.length,1);assert.equal(formed[0].members.length,3);
  world.markVisit(state,agents[0]);
  assert.equal(state.tiles[16].territory[formed[0].id],1);
});

test('overseer additions and removals alter resources and remain perceptible',()=>{
  const {state,agents}=setup();const added=world.intervene(state,{kind:'add',tileIndex:16,name:'Apple',appearance:'a round red object',category:'food',quantity:3});
  assert.equal(world.available(state.tiles[16],'food'),8);
  assert.equal(world.relevantChanges(state,agents[0]).length,1);
  const item=world.take(state,state.tiles[16],'food');assert.equal(item.name,'Apple');
  const removed=world.intervene(state,{kind:'remove',tileIndex:16,category:'food',quantity:7,scope:'tile'});
  assert.match(removed.text,/removes 7 food/);
  assert.equal(world.available(state.tiles[16],'food'),0);
  assert.equal(state.interventions.length,2);
  assert.equal(added.itemId,item.id);
});

test('a successful physical invention leaves a persistent map structure',()=>{
  const {state,agents}=setup();const node={id:'rub:wood+fibre',effect:'fire'};
  const hearth=world.build(state,agents[0],node,true);
  assert.equal(hearth.kind,'hearth');
  assert.equal(state.tiles[16].structures[0].techId,node.id);
  assert.equal(world.build(state,agents[0],node,true),null);
});
