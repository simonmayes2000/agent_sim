const test=require('node:test'),assert=require('node:assert/strict');
const World=require('../dist/referee-world.js'),Systems=require('../dist/world.js');
function fixture(){const state={day:2,width:2,height:1,weather:'clear',seed:42,tiles:[Systems.tile('grass',0),Systems.tile('water',1)],agents:[{id:1,name:'Adam',alive:true,x:0,y:0,health:5,food:3,water:1,energy:10,age:20,gen:0,parents:[],genes:{},knowledge:[],seenTiles:[0,1],likes:{},supplies:{}}],tech:{nodes:[],trials:[]},events:[],nextId:2,explored:[0,1]};World.ensure(state);return state;}
const change=(delta={},reason='A day of deprivation worsens the existing condition.')=>({id:1,delta:{health:0,energy:0,food:0,water:0,...delta},conditionReason:reason,experience:'I decline the unfamiliar water and feel weaker.'});
const process={id:'deprivation',description:'Continuing lack of water',subjects:[1],status:'active',nextReviewDay:4,review:'No intake occurred, and the consequences worsened.'};
test('full-day outcomes must account for every living body, even when actions are indecisive',()=>{
 const state=fixture();assert.throws(()=>World.validate({summary:'He tests again.',agents:[]},state,[],true),/account for person 1/);
 assert.throws(()=>World.validate({summary:'He tests again.',agents:[{id:1,delta:{water:-1}}]},state,[],true),/all four bodily deltas/);
 assert.doesNotThrow(()=>World.validate({summary:'No intake occurs.',agents:[change({water:-1,health:-2})],processes:[process]},state,[],true));
});
test('referee-authored ongoing deprivation persists across reload and ends in actual death without a player choice',()=>{
 let state=fixture();const first=World.validate({summary:'Adam tests but declines the water. The day still takes its toll.',agents:[change({water:-1,health:-2,energy:-1})],processes:[process]},state,[],true);state=JSON.parse(JSON.stringify(World.apply(state,first)));
 assert.equal(state.day,3);assert.equal(state.agents[0].water,0);assert.equal(state.agents[0].health,3);assert.equal(state.openWorld.processes[0].nextReviewDay,4);assert.match(World.outcomePrompt(state,[]),/deprivation/);
 const final=World.validate({summary:'Without drinking, Adam succumbs to the continuing deprivation.',agents:[change({health:-3},'Continued deprivation is now fatal; no intake or recovery offset it.')],processes:[{id:'deprivation',status:'resolved',review:'Adam dies from the continuing lack of water.'}]},state,[],true);
 const next=World.apply(state,final);assert.equal(next.day,4);assert.equal(next.agents[0].health,0);assert.equal(next.agents[0].alive,false);assert.equal(next.agents[0].death,4);assert.ok(next.events.some(e=>e.type==='death'));assert.equal(next.openWorld.processes[0].status,'resolved');assert.equal(state.agents[0].alive,true);
});
test('due consequences cannot be silently forgotten or scheduled in the past',()=>{
 const state=fixture();state.day=3;state.openWorld.processes=[process];const before=JSON.stringify(state);
 assert.throws(()=>World.validate({summary:'More testing.',agents:[change()]},state,[],true),/Due process.*deprivation/);
 assert.throws(()=>World.validate({summary:'Another delay.',agents:[change()],processes:[{id:'deprivation',review:'Deferred',nextReviewDay:4}]},state,[],true),/after the day being resolved/);assert.equal(JSON.stringify(state),before);
});
test('continuity is not a fixed survival hierarchy: arbitrary ecology can progress or resolve',()=>{
 const state=fixture();const p=World.validate({summary:'The wind settles and a structure cures.',agents:[change({},'Adequate intake and rest offset this day’s needs.')],processes:[{id:'curing',description:'The resin wall is curing',subjects:[],status:'active',nextReviewDay:7,review:'Dry wind hardens the surface; the interior remains soft.'}]},state,[],true);
 const next=World.apply(state,p);assert.equal(next.openWorld.processes[0].id,'curing');for(const k of ['health','water','food','energy'])assert.equal(next.agents[0][k],state.agents[0][k]);
});
test('truncated responses trigger bounded compact repairs rather than accepting a valid partial object',async()=>{
 let calls=0;const result=await World.requestValidated(async()=>{calls++;if(calls===1)throw Object.assign(Error('Incomplete model output: max_output_tokens'),{repairable:true,responseText:'{"summary":"only the beginning"}'});return {summary:'The complete day.',agents:[change()]};},'Resolve a whole day',raw=>World.validate(raw,fixture(),[],true));
 assert.equal(calls,2);assert.equal(result.agents.length,1);
});
test('losses saturate at zero without another repair or an invented secondary effect',()=>{
 const state=fixture(),p=World.validate({summary:'Reserves are exhausted and the established condition is fatal.',agents:[change({water:-4,health:-9})]},state,[],true);
 assert.equal(p.agents[0].delta.water,-1);assert.equal(p.agents[0].delta.health,-5);assert.equal(p.meterCorrections.length,2);
 const next=World.apply(state,p);assert.equal(next.agents[0].water,0);assert.equal(next.agents[0].health,0);assert.equal(next.agents[0].alive,false);
 const noDamage=World.apply(state,{summary:'A reserve reaches zero, without invented damage.',agents:[change({water:-4})]});assert.equal(noDamage.agents[0].health,5);
});
