const test=require('node:test');
const assert=require('node:assert/strict');
const World=require('../dist/referee-world.js');
const Systems=require('../dist/world.js');
function fixture(){const person=(id,x=0)=>({id,name:'Person '+id,alive:true,x,y:0,age:20,gen:0,parents:[],health:80,energy:60,food:6,water:6,genes:{},knowledge:[],seenTiles:[x],likes:{}});const s={day:1,width:6,height:1,seed:4,weather:'clear',tiles:Array.from({length:6},(_,i)=>Systems.tile('grass',i)),agents:[person(1),person(2)],nextId:3,events:[],explored:[0],tech:{nodes:[],trials:[]}};World.ensure(s);s.openWorld.entities=[{id:'raw',name:'Unknown material',description:'Soft folds',tile:0,quantity:4,properties:{massPerUnit:2,nourishment:2,hydration:1},knownBy:[1]}];return s;}
const step=(s,changes={},options={})=>World.apply(s,{summary:'A day of physical consequences.',...changes},[],options);
const consume=(amount=1,actor=1)=>({kind:'consume',actor,entity:'raw',amount,reason:'A portion is consumed'});

test('unfunded reserve gains and direct stock inflation are rejected atomically',()=>{
 const s=fixture(),before=JSON.stringify(s);
 assert.throws(()=>step(s,{agents:[{id:1,delta:{food:1000000}}]}),/reserve gains/);
 assert.throws(()=>step(s,{entities:[{op:'update',id:'raw',quantity:100}]}),/ledger/);
 assert.throws(()=>step(s,{entities:[{op:'remove',id:'raw'}]}),/before deleting/);
 assert.equal(JSON.stringify(s),before);
});
test('consumption spends stock exactly once, then daily upkeep runs',()=>{
 const s=fixture();const n=step(s,{transactions:[consume()]});assert.equal(n.openWorld.entities[0].quantity,3);assert.equal(n.agents[0].food,7);assert.equal(n.agents[0].water,6);
 assert.throws(()=>step(s,{transactions:[consume(3),consume(2)]}),/insufficient/);
 assert.equal(s.openWorld.entities[0].quantity,4);
});
test('unknown material has no automatic edible benefit and established yields cannot be rewritten',()=>{
 const s=fixture();s.openWorld.entities[0].properties={};const n=step(s,{transactions:[consume()]});assert.equal(n.agents[0].food,5);
 assert.throws(()=>step(fixture(),{entities:[{op:'update',id:'raw',properties:{nourishment:20}}]}),/cannot be rewritten/);
 const t=fixture();t.openWorld.entities[0].properties={};assert.throws(()=>step(t,{entities:[{op:'update',id:'raw',properties:{massPerUnit:50}}]}),/cannot be rewritten/);
});
test('an encounter is a new natural source, not a repeat grant or free building',()=>{
 const s=fixture(),newEntity={op:'create',id:'new',name:'Novel organism',description:'A knotted unfamiliar form',tile:0,quantity:3};
 const encounter={kind:'encounter',actor:1,entity:'new',amount:3,reason:'Found while inspecting the ground'};
 const n=step(s,{entities:[newEntity],transactions:[encounter]});assert.equal(n.openWorld.entities[1].quantity,3);
 assert.throws(()=>step(n,{transactions:[encounter]}),/not replenish/);
 assert.throws(()=>step(s,{entities:[{...newEntity,structure:true}],transactions:[encounter]}),/structure/);
 assert.throws(()=>step(s,{entities:[newEntity]}),/ledger/);
});
test('novel construction consumes material mass and rejects duplicate-input overspending',()=>{
 const s=fixture(),entities=[{op:'create',id:'screen',name:'Novel screen',description:'A folded assembly',tile:0,structure:true,quantity:1,properties:{massPerUnit:4}}];
 const transform={kind:'transform',actor:1,inputs:[{entity:'raw',amount:2}],outputs:[{entity:'screen',amount:1}],reason:'Assemble the folded material'};
 const n=step(s,{entities,transactions:[transform]});assert.equal(n.openWorld.entities.find(e=>e.id==='raw').quantity,2);
 assert.equal(n.openWorld.entities.find(e=>e.id==='screen').quantity,1);
 assert.throws(()=>step(s,{entities,transactions:[{...transform,inputs:[{entity:'raw',amount:1}]}]}),/creates material mass/);
 assert.throws(()=>step(s,{entities,transactions:[{...transform,inputs:[{entity:'raw',amount:3},{entity:'raw',amount:3}]}]}),/insufficient/);
});
test('possession blocks theft at a distance; carried entities follow travel and can be handed over',()=>{
 let s=step(fixture(),{transactions:[{kind:'transfer',actor:1,entity:'raw',to:1,reason:'Pick up the material'}]});
 assert.throws(()=>step(s,{transactions:[consume(1,2)]}),/not accessible/);
 assert.throws(()=>step(s,{entities:[{op:'update',id:'raw',carriedBy:2}]}),/transfer/);
 s=step(s,{agents:[{id:1,position:{x:2,y:0}}]});assert.equal(s.openWorld.entities[0].tile,2);assert.equal(s.agents[0].energy,50);
 assert.throws(()=>step(s,{transactions:[{kind:'transfer',actor:1,entity:'raw',to:2,reason:'Hand it over'}]}),/same place/);
 s=step(s,{agents:[{id:2,position:{x:2,y:0}}],transactions:[{kind:'transfer',actor:1,entity:'raw',to:2,reason:'Hand it to the companion'}]});assert.equal(s.openWorld.entities[0].carriedBy,2);
});
test('travel is bounded by distance and energy and expansion does not charge for shifting the origin',()=>{
 const s=fixture();assert.throws(()=>step(s,{agents:[{id:1,position:{x:4,y:0}}]}),/travel exceeds/);
 s.agents[0].energy=2;assert.throws(()=>step(s,{agents:[{id:1,position:{x:1,y:0}}]}),/not enough energy/);
 const n=step(fixture(),{expand:{west:4},agents:[{id:1,position:{x:4,y:0}}]});assert.equal(n.agents[0].energy,58);
});
test('deprivation damages bodies and causes death even if no agent change is proposed',()=>{
 const s=fixture();Object.assign(s.agents[0],{food:1,water:1,health:10});const n=step(s);assert.equal(n.agents[0].health,0);assert.equal(n.agents[0].alive,false);assert.equal(n.day,2);assert.equal(s.agents[0].health,10);
});
test('dated effects survive save/reload, run once, cannot be replayed, and leave failed days untouched',()=>{
 const effect={id:'delayed-poison',actor:1,dueDay:3,delta:{health:-8},reason:'An established delayed toxic effect'};
 let s=step(fixture(),{scheduledEffects:[effect]});assert.equal(s.agents[0].health,80);
 const saved=JSON.stringify(s);assert.throws(()=>step(s,{transactions:[consume(100)]}),/insufficient/);assert.equal(JSON.stringify(s),saved);
 s=step(JSON.parse(saved));assert.equal(s.agents[0].health,72);assert.equal(s.openWorld.scheduledEffects.length,0);
 s=step(s);assert.equal(s.agents[0].health,72);assert.throws(()=>step(s,{scheduledEffects:[{...effect,dueDay:6}]}),/unique ID/);
 assert.throws(()=>step(fixture(),{scheduledEffects:[{...effect,delta:{food:5}}]}),/bypass consumption/);
});
test('scheduled and immediate recovery share a daily limit and cannot be multiplied',()=>{
 let s=step(fixture(),{scheduledEffects:[{id:'healing-a',actor:1,dueDay:3,delta:{health:2},reason:'A wound heals'},{id:'healing-b',actor:1,dueDay:3,delta:{health:1},reason:'Another wound heals'}]});
 assert.throws(()=>step(s,{agents:[{id:1,delta:{health:1}}]}),/combined scheduled/);
 assert.throws(()=>step(s,{agents:[{id:1,position:{x:1,y:0}}]}),/combined scheduled/);
 s=step(s);assert.equal(s.agents[0].health,83);
});
test('provisions conserve reserves and newborn supplies must be funded',()=>{
 const s=fixture();const newborn={name:'Child',tile:0,parents:[1,2],reason:'A birth',condition:{health:70,energy:60,food:2,water:1}};
 assert.throws(()=>step(s,{newPeople:[newborn]}),/funded/);
 const n=step(s,{newPeople:[newborn],reserveTransfers:[{from:1,to:'new:0',meter:'food',amount:2,reason:'Provision the child'},{from:2,to:'new:0',meter:'water',amount:1,reason:'Provision the child'}]});
 assert.equal(n.agents[0].food,3);assert.equal(n.agents[1].water,4);assert.equal(n.agents[2].food,2);assert.equal(n.agents[2].water,1);
 const shared=step(s,{reserveTransfers:[{from:1,to:2,meter:'food',amount:2,reason:'Share provisions'}]});assert.equal(shared.agents[0].food+shared.agents[1].food,10);
});
test('observer exceptions require a trusted call option, not a field inside model output',()=>{
 const proposal={entities:[{op:'update',id:'raw',quantity:8}],transactions:[{kind:'observer',entity:'raw',amount:4,reason:'The observer introduces material'}],observer:true};
 assert.throws(()=>step(fixture(),proposal),/explicit observer/);
 const n=step(fixture(),proposal,{observer:true});assert.equal(n.openWorld.entities[0].quantity,8);
});
test('old worlds gain the core without erasing stock, hidden properties or history',()=>{
 const s=fixture();delete s.openWorld.physicsVersion;s.openWorld.history=[{day:1,summary:'An earlier event'}];const n=step(s);assert.equal(n.openWorld.physicsVersion,1);assert.equal(n.openWorld.entities[0].quantity,4);assert.equal(n.openWorld.entities[0].properties.nourishment,2);assert.equal(n.openWorld.history[0].summary,'An earlier event');
});

test('map expansion remaps stock and its observation coordinates without changing mass',()=>{
 const s=fixture();s.openWorld.entities[0].observations={1:{tile:0,quantity:4,observedDay:1}};const n=step(s,{expand:{west:2}});assert.equal(n.openWorld.entities[0].tile,2);assert.equal(n.openWorld.entities[0].observations[1].tile,2);assert.equal(n.openWorld.entities[0].quantity,4);
});
test('a dead carrier does not stall future days or release its stock to a distant person',()=>{
 const s=fixture();s.openWorld.entities[0].carriedBy=1;s.agents[0].health=1;s.agents[0].food=0;const n=step(s);assert.equal(n.agents[0].alive,false);const later=step(n);assert.equal(later.day,3);assert.equal(later.openWorld.entities[0].quantity,4);
});
test('oversized outcomes fail rather than silently dropping part of a physical ledger',()=>{
 assert.throws(()=>step(fixture(),{transactions:Array.from({length:101},()=>consume(.01))}),/exceeds 100/);
});

test('deleting an exhausted stock cannot make its stable ID eligible for another encounter grant',()=>{
 const s=step(fixture(),{entities:[{op:'remove',id:'raw'}],transactions:[consume(4)]});assert.equal(s.openWorld.entities.length,0);
 assert.throws(()=>step(s,{entities:[{op:'create',id:'raw',name:'Same material',description:'Reintroduced stock',tile:0,quantity:4}],transactions:[{kind:'encounter',actor:1,entity:'raw',amount:4,reason:'Try to replenish a deleted stock'}]}),/cannot be reused/);
});
