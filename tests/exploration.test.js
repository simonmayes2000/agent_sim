const test=require('node:test');
const assert=require('node:assert/strict');
const exploration=require('../dist/exploration.js');
const world=require('../dist/world.js');
function setup(width=5,height=3){
 const tiles=Array.from({length:width*height},(_,i)=>world.tile('grass',i));
 const person=(id,x,y)=>({id,name:'Person '+id,x,y,alive:true,energy:30,seenTiles:[],knownItems:{}});
 return {day:1,width,height,weather:'clear',tiles,agents:[person(1,0,1),person(2,1,1),person(3,4,2)],explored:[],clans:[],interventions:[],expansions:0};
}
test('resource discovery updates public sightings and nearby agents without global knowledge transfer',()=>{
 const s=setup(),[a,b,c]=s.agents;s.tiles[5].food=5;
 const entries=exploration.observe(s,a);
 assert.equal(s.exploration.waypoints['5:food'].amount,5);
 assert.equal(b.exploration.waypoints['5:food'].amount,5);
 assert.equal(c.exploration.waypoints['5:food'],undefined);
 assert.deepEqual(b.seenTiles,[],'hearing about ground does not count as visiting it');
 assert.ok(entries.some(e=>e.kind==='discovered'&&e.day===1));
 assert.ok(entries.some(e=>e.kind==='shared'&&e.recipient===2));
 assert.equal(exploration.observe(s,a).length,0,'unchanged sightings do not spam the log');
 b.exploration.waypoints['5:food'].amount=1;
 assert.equal(a.exploration.waypoints['5:food'].amount,5,'shared memories are independent');
});
test('same-day depletion and later regrowth refresh sightings only when observed',()=>{
 const s=setup(),[a,b]=s.agents;s.tiles[5].food=5;exploration.observe(s,a);
 b.x=4;b.y=2;s.tiles[5].food=0;
 assert.equal(s.exploration.waypoints['5:food'].amount,5);
 const update=exploration.observe(s,a);assert.ok(update.some(e=>e.kind==='updated'&&e.amount===0));
 assert.equal(b.exploration.waypoints['5:food'].amount,5);
 s.day=2;s.tiles[5].food=3;exploration.observe(s,a);
 assert.equal(s.exploration.waypoints['5:food'].amount,3);
 assert.equal(s.exploration.waypoints['5:food'].day,2);
 b.x=1;b.y=1;exploration.share(s,a,b);assert.equal(b.exploration.waypoints['5:food'].amount,3);
});
test('sharing a connected explored corridor makes its resource destination routable',()=>{
 const s=setup(),[a,b]=s.agents;b.x=0;b.y=0;
 for(const x of [0,1,2,3]){a.x=x;s.tiles[8].water=8;exploration.observe(s,a)}
 assert.equal(exploration.estimate(s,b,s.exploration.waypoints['8:water']).status,'unknown');
 a.x=0;exploration.observe(s,a);
 const estimate=exploration.estimate(s,b,s.exploration.waypoints['8:water']);
 assert.equal(estimate.status,'reachable');assert.deepEqual(estimate.path,[5,6,7,8]);
 assert.equal(estimate.cost,4);
 delete b.exploration.ground[6];
 assert.equal(exploration.estimate(s,b,s.exploration.waypoints['8:water']).status,'unreachable');
});
test('weighted routes prefer forest cover in wind and charge the same step energy',()=>{
 const s=setup(),a=s.agents[0];a.seenTiles=s.tiles.map((_,i)=>i);
 for(let i=0;i<5;i++)s.tiles[i].type='forest';
 exploration.ensure(s);
 const direct=exploration.route(s,a,(_,i)=>i===9);assert.equal(direct.cost,4);
 s.weather='wind';const covered=exploration.route(s,a,(_,i)=>i===9);
 assert.equal(covered.cost,7);assert.equal(covered.steps,6);
 const before=a.energy;
 for(const i of covered.path)assert.ok(exploration.advance(s,a,i));
 assert.equal(before-a.energy,covered.cost);
 assert.equal(a.x,4);assert.equal(a.y,1);
 a.energy=1;assert.equal(exploration.advance(s,a,8),null,'insufficient energy blocks a step');
 assert.equal(exploration.advance(s,a,0),null,'non-adjacent destinations cannot teleport');
});
test('unknown objects are not labelled edible by a sighting before being tested',()=>{
 const s=setup(),a=s.agents[0];s.tiles[5].items=[{id:1,category:'food',quantity:3}];
 exploration.observe(s,a);assert.equal(s.exploration.waypoints['5:food'],undefined);
 a.knownItems[1]='tested';exploration.observe(s,a);assert.equal(s.exploration.waypoints['5:food'].amount,3);
});
test('expansion remaps public and personal sightings, routes and log coordinates',()=>{
 const s=setup(8,6),a=s.agents[0];s.tiles[8].food=5;exploration.observe(s,a);
 s.explored=Array.from({length:12},(_,i)=>i);world.maybeExpand(s,()=>.4);
 assert.equal(s.width,10);assert.equal(s.exploration.waypoints['21:food'].amount,5);
 assert.equal(a.exploration.waypoints['21:food'].tile,21);
 assert.ok(a.exploration.ground[21]);assert.equal(s.exploration.log[0].tile,21);
 assert.equal(exploration.estimate(s,a,s.exploration.waypoints['21:food']).cost,0);
});
test('saved memories survive reload and old saves gain no invented resource locations',()=>{
 const s=setup(),a=s.agents[0];a.seenTiles=[5,6];s.tiles[6].food=5;
 exploration.ensure(s);assert.deepEqual(s.exploration.waypoints,{});assert.equal(a.exploration.ground[6].food,undefined);
 s.tiles[5].water=8;exploration.observe(s,a);
 const restored=JSON.parse(JSON.stringify(s));exploration.ensure(restored);
 assert.equal(restored.agents[0].exploration.waypoints['5:water'].amount,8);
 assert.equal(restored.exploration.log[0].day,1);
});
