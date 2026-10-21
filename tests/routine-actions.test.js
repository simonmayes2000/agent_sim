const test=require('node:test'),assert=require('node:assert/strict');
const World=require('../dist/referee-world.js'),Systems=require('../dist/world.js'),A=require('../dist/adjudication.js'),R=require('../dist/routine-actions.js'),P=require('../dist/review-policy.js');
function fixture(){const s={day:1,width:6,height:1,seed:1,weather:'clear',tiles:Array.from({length:6},(_,i)=>Systems.tile('grass',i)),agents:[1,2,3].map((id)=>({id,name:'Person '+id,alive:true,x:id===3?5:0,y:0,age:20,gen:0,parents:[],health:80,energy:60,food:6,water:6,genes:{},knowledge:[],seenTiles:[0],likes:{}})),nextId:4,events:[],explored:[0],tech:{nodes:[],trials:[]}};World.ensure(s);World.capturePerceptions(s);return s;}
const choose=(s,id,kind,extra={})=>World.parseIntention({action:'My chosen '+kind,execution:{kind},...extra},s,s.agents.find(a=>a.id===id));
const noModels={askAuthor:async()=>{throw Error('Routine day must not ask an author');},askCouncil:async()=>{throw Error('Routine day must not ask a council');}};
async function step(s,choices,callbacks=noModels){const r=await A.resolve(s,choices,null,callbacks);return {r,n:World.apply(s,r.outcome,choices)};}
test('ordinary movement and rest execute, charge travel/upkeep once, and survive deterministic replay',async()=>{
 const s=fixture(),choices=[choose(s,1,'move',{destination:{x:5,y:0}}),choose(s,2,'rest')],before=JSON.stringify(s),{r,n}=await step(s,choices);
 assert.equal(n.day,2);assert.equal(n.agents[0].x,3);assert.equal(n.agents[0].energy,49);assert.equal(n.agents[1].energy,88);assert.equal(n.agents[0].food,5);assert.equal(JSON.stringify(s),before);assert.equal(r.mode,'engine-only');assert.deepEqual(World.apply(JSON.parse(before),r.outcome,choices),n);
 assert.ok(World.perception(n,n.agents[0]).experiences.some(e=>e.text.includes('Moved to (3, 0)')));
 assert.ok(!World.perception(n,n.agents[1]).experiences.some(e=>e.text.includes('Moved to')));
});
test('actual agent words reach nearby listeners as attributed hearsay, never remote agents or physical truth',async()=>{
 const s=fixture(),{n}=await step(s,[choose(s,1,'inspect',{speech:'I think there may be water farther away. Shall we look together?'})]);
 assert.equal(n.events.filter(e=>e.type==='speech').length,1);const listener=World.perception(n,n.agents[1]),remote=World.perception(n,n.agents[2]);
 assert.ok(listener.experiences.some(e=>e.evidence.kind==='hearsay'&&e.evidence.sourceActor===1&&e.text.includes('Shall we look')));assert.ok(!remote.experiences.some(e=>e.text.includes('Shall we look')));assert.equal(n.openWorld.entities.length,0);assert.equal(n.agents[1].water,5);
 const reply=choose(n,2,'wait',{speech:'Yes, let us look together.'}),next=(await step(n,[reply])).n;assert.ok(World.perception(next,next.agents[0]).experiences.some(e=>e.text.includes('let us look together')));
});
test('hearing uses final positions and a dying speaker cannot freeze the clock',async()=>{
 const s=fixture(),{n}=await step(s,[choose(s,1,'move',{destination:{x:3,y:0},speech:'I am looking around.'})]);assert.ok(!World.perception(n,n.agents[1]).experiences.some(e=>e.text.includes('I am looking around')));assert.ok(World.perception(n,n.agents[2]).experiences.some(e=>e.text.includes('I am looking around')));
 Object.assign(s.agents[0],{health:5,food:0,water:0});const dead=(await step(s,[choose(s,1,'wait',{speech:'I feel weak.'})])).n;assert.equal(dead.day,2);assert.equal(dead.agents[0].alive,false);
});
test('known local resource consumption conserves finite stock with competing consumers',async()=>{
 const s=fixture();s.openWorld.entities=[{id:'stock',name:'Established material',description:'Visible stock',tile:0,quantity:1,properties:{nourishment:2,hydration:1}}];
 const learned=World.apply(s,{summary:'A prior material test establishes yields.',observations:[{actor:1,entity:'stock',properties:{nourishment:2,hydration:1},reason:'A local test'},{actor:2,entity:'stock',properties:{nourishment:2,hydration:1},reason:'A local test'}]});
 const choices=[1,2].map(id=>choose(learned,id,'consume',{execution:{kind:'consume',entity:'stock',amount:1}})),{n}=await step(learned,choices);
 assert.equal(n.openWorld.entities[0].quantity,0);assert.equal(n.agents[0].food,6);assert.equal(n.agents[1].food,4);assert.ok(n.events.some(e=>e.type==='action'&&e.actor===2&&e.text.includes('insufficient')));
});
test('unknown or inaccessible material and out-of-map movement produce honest failure receipts',async()=>{
 const s=fixture();s.openWorld.entities=[{id:'unknown',name:'Unfamiliar matter',description:'Visible',tile:0,quantity:1,properties:{nourishment:20}}];World.capturePerceptions(s);
 const {n}=await step(s,[choose(s,1,'consume',{execution:{kind:'consume',entity:'unknown',amount:1}}),choose(s,2,'move',{destination:{x:50,y:0}})]);
 assert.equal(n.openWorld.entities[0].quantity,1);assert.equal(n.agents[0].food,5);assert.equal(n.agents[1].x,0);assert.ok(n.events.some(e=>e.type==='action'&&e.text.includes('not personally established')));
});
test('mixed novel and routine turns preserve routine actions while reviewing only additional consequences',async()=>{
 const s=fixture(),choices=[choose(s,1,'move',{destination:{x:1,y:0},speech:'Come with me.'}),choose(s,2,'attempt')];let authors=0,councils=0;
 const {n}=await step(s,choices,{askAuthor:async prompt=>{authors++;assert.match(prompt,/ENGINE-OWNED ORDINARY ACTIONS/);return {summary:'A new experience.',agents:[{id:2,experience:'I notice the texture of the ground.'}]};},askCouncil:async facts=>{councils++;assert.deepEqual(facts.reviewers,['Causality','Knowledge']);assert.deepEqual(facts.reviewTargets.map(t=>t.path),['/proposal/agents/1/experience']);return facts.reviewers.map(name=>({name,approve:true,reason:'Grounded.'}));}});
 assert.equal(authors,1);assert.equal(councils,1);assert.equal(n.agents[0].x,1);assert.equal(n.agents[0].energy,55);assert.equal(n.events.filter(e=>e.type==='speech').length,1);
});
test('rejected novel additions cannot discard ordinary actions or agent speech',async()=>{
 const s=fixture(),choices=[choose(s,1,'move',{destination:{x:1,y:0},speech:'I will look over here.'}),choose(s,2,'attempt')];
 const {r,n}=await step(s,choices,{askAuthor:async()=>({summary:'Invalid free food.',agents:[{id:2,delta:{food:8}}]}),askCouncil:async()=>{throw Error('Invalid data reached review');}});
 assert.equal(r.resolution.proposalWithheld,true);assert.equal(n.agents[0].x,1);assert.equal(n.agents[1].food,5);assert.equal(n.events.filter(e=>e.type==='speech').length,1);
});
test('the full council is reserved for rule changes, births and observer interventions',()=>{
 assert.deepEqual(P.reviewers(P.targets(fixture(),{speech:[{actor:1,text:'Hello'}]})),['Causality','Knowledge','Social']);assert.equal(P.reviewers([{path:'/proposal/laws/0',roles:['Causality']}]).length,10);assert.equal(P.reviewers([],true).length,10);
 assert.throws(()=>R.validate({kind:'consume',entity:'stock',amount:-1}),/valid execution/);assert.throws(()=>R.validate({kind:'move',command:'shell'}),/valid execution/);
});

test('novel map expansion remaps ordinary movement without charging for shifting the origin',async()=>{
 const s=fixture(),choices=[choose(s,1,'move',{destination:{x:1,y:0}}),choose(s,2,'attempt')];
 const {r,n}=await step(s,choices,{askAuthor:async()=>({summary:'Ground is represented beyond the western horizon.',expand:{west:2}}),askCouncil:async facts=>{assert.ok(facts.reviewTargets.every(t=>!t.path.includes('/agents/')));return facts.reviewers.map(name=>({name,approve:true,reason:'A coherent expansion.'}));}});
 assert.equal(n.width,8);assert.equal(n.agents[0].x,3);assert.equal(n.agents[0].energy,55);assert.ok(World.perception(n,n.agents[0]).experiences.some(e=>e.text.includes('Moved to (3, 0)')));assert.deepEqual(World.apply(s,r.outcome,choices),n);
});
