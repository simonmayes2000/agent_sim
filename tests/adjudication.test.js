const test=require('node:test'),assert=require('node:assert/strict');
const World=require('../dist/referee-world.js'),Clock=require('../dist/process-clock.js'),Adjudication=require('../dist/adjudication.js'),Systems=require('../dist/world.js');
function fixture(){const s={day:4,width:2,height:1,seed:1,weather:'clear',tiles:[Systems.tile('grass',0),Systems.tile('rock',1)],agents:[{id:1,name:'Adam',alive:true,x:0,y:0,age:20,gen:0,parents:[],health:80,energy:90,food:20,water:20,genes:{},likes:{},knowledge:[],seenTiles:[0]}],nextId:2,events:[],explored:[0],tech:{nodes:[],trials:[]},openWorld:{enabled:true,entities:[],laws:[],history:[],processes:[]}};World.capturePerceptions(s);return s;}
const allow=()=>World.roles.map(name=>({name,approve:true,reason:'Consistent with the complete evidence.'}));
const attempt={action:'Inspect the ground',reason:'I want to understand it',goal:{title:'Understand this place',reason:'Curiosity',next:'Look closely'},targetEntityIds:[]};
const intentions=[{...attempt,actor:1,destination:null}];
const active={id:'deprivation',description:'Continued bodily demand',subjects:[1],status:'active',nextReviewDay:5,review:'Previously reviewed'};

test('the reported day-5 failure is normalized by the engine without another model repair',async()=>{
 const s=fixture();s.openWorld.processes=[active];let authorCalls=0;const before=JSON.stringify(s);
 const result=await Adjudication.resolve(s,intentions,null,{askAuthor:async()=>{authorCalls++;return JSON.stringify({summary:'A day passes with bodily demand.',processes:[{id:'deprivation',review:'Daily demand continues; the physical core accounts for the bodily costs.',nextReviewDay:5}]});},askCouncil:async facts=>{assert.equal(facts.before.day,4);assert.equal(facts.after.day,5);assert.equal(facts.proposal.processes[0].nextReviewDay,6);assert.equal(facts.after.agents[0].food,19);return allow();}});
 assert.equal(authorCalls,1);assert.equal(result.outcome.processes[0].lastReviewed,5);assert.equal(JSON.stringify(s),before);
 const n=World.apply(s,result.outcome,intentions);assert.equal(n.day,5);assert.equal(n.openWorld.processes[0].nextReviewDay,6);assert.equal(n.agents[0].food,19);
});
test('copying old absolute dates or omitting a date cannot trap subsequent days',()=>{
 let s=fixture();s.openWorld.processes=[active];
 for(let i=0;i<6;i++){s=World.apply(s,{summary:'Daily demand is resolved.',processes:[{id:active.id,review:'The core applies this day\'s demand.',...(i%2?{}:{nextReviewDay:5})}]});assert.equal(s.openWorld.processes[0].nextReviewDay,s.day+1);assert.equal(s.openWorld.processes[0].lastReviewed,s.day);}
 assert.equal(s.day,10);assert.equal(s.agents[0].food,14);
});
test('date normalization cannot silently defer missing consequences or reviews',()=>{
 const s=fixture();s.openWorld.processes=[active];assert.throws(()=>World.validate({summary:'No review.'},s),/Due processes need explicit/);assert.throws(()=>World.validate({summary:'Move the date.',processes:[{id:active.id,nextReviewDay:99}]},s),/changing its date alone/);
 const p=World.validate({summary:'A causal stability review.',processes:[{id:active.id,review:'The condition remains stable under these circumstances.',reviewInDays:3}]},s);assert.equal(p.processes[0].nextReviewDay,8);
});
test('resolved processes stop being due, while legacy missing dates are treated as due now',()=>{
 const s=fixture();s.openWorld.processes=[{...active,nextReviewDay:undefined}];assert.equal(Clock.due(s).length,1);const n=World.apply(s,{summary:'The process ends.',processes:[{id:active.id,status:'resolved',review:'The underlying condition is no longer present.'}]});assert.equal(n.openWorld.processes[0].nextReviewDay,null);assert.equal(Clock.due(n).length,0);
});
test('scheduled effects and metabolic costs execute exactly once despite process reviews',()=>{
 const s=fixture();s.openWorld.processes=[active];s.openWorld.scheduledEffects=[{id:'due-effect',actor:1,dueDay:5,delta:{health:-3},reason:'A previously scheduled effect'}];const n=World.apply(s,{summary:'The due effect occurs.',processes:[{id:active.id,review:'Daily demand and the scheduled effect occur.'}]});assert.equal(n.agents[0].health,77);assert.equal(n.agents[0].food,19);assert.equal(n.openWorld.scheduledEffects.length,0);
});
test('the council sees all physical entities, terrain, private knowledge evidence and projected automatic effects',()=>{
 const s=fixture();s.tiles[1].properties={hiddenMechanism:'relevant to the outcome'};s.openWorld.entities=Array.from({length:20},(_,i)=>({id:'object-'+i,name:'Object '+i,description:'Visible matter',tile:1,quantity:i+1,properties:{massPerUnit:2}}));
 const e=Adjudication.evidence(s,{summary:'A quiet day.'},intentions,null);assert.equal(e.before.entities.length,20);assert.equal(e.before.tiles[1].properties.hiddenMechanism,'relevant to the outcome');assert.ok(e.before.agents[0].evidenceRecords);assert.equal(e.after.agents[0].food,19);assert.equal(e.proposal.summary,'A quiet day.');assert.ok(e.deterministicAudit.some(e=>e.kind==='upkeep'));assert.equal(s.day,4);
});
test('a concrete veto triggers a corrected outcome against the same intentions and same before-state',async()=>{
 const s=fixture(),prompts=[],reviews=[];let councils=0;const r=await Adjudication.resolve(s,intentions,null,{askAuthor:async prompt=>{prompts.push(prompt);return {summary:prompts.length===1?'A questionable event.':'A corrected grounded event.'};},askCouncil:async facts=>{reviews.push(facts);const votes=allow();if(councils++===0)votes[0]={name:World.roles[0],approve:false,reason:'The stated cause is unsupported.'};return votes;}});
 assert.equal(r.revision,1);assert.equal(prompts.length,2);assert.match(prompts[1],/stated cause is unsupported/);assert.deepEqual(reviews[0].intentions,reviews[1].intentions);assert.deepEqual(reviews[0].before,reviews[1].before);assert.equal(s.day,4);
});
test('an unavailable reviewer is not treated as a semantic veto or an excuse to fabricate approval',async()=>{
 let calls=0;await assert.rejects(()=>Adjudication.resolve(fixture(),intentions,null,{askAuthor:async()=>{calls++;return {summary:'An ordinary day.'};},askCouncil:async()=>allow().map((v,i)=>i===0?{...v,approve:false,reason:'Model unavailable: offline'}:v)}),/reviewer is unavailable/);assert.equal(calls,1);
});
test('invalid data is repaired with a specific error and cannot reach the council before validation',async()=>{
 const s=fixture();let calls=0,reviews=0;const prompts=[];await Adjudication.resolve(s,intentions,null,{askAuthor:async prompt=>{prompts.push(prompt);return ++calls===1?'{malformed':{summary:'A corrected day.'};},askCouncil:async()=>{reviews++;return allow();}});assert.equal(calls,2);assert.equal(reviews,1);assert.match(prompts[1],/CORRECTION REQUIRED/);assert.equal(s.day,4);
});
test('transport failure does not burn through model repairs, and incomplete councils cannot approve',async()=>{
 let calls=0;await assert.rejects(()=>Adjudication.resolve(fixture(),intentions,null,{askAuthor:async()=>{calls++;throw Error('offline');},askCouncil:async()=>allow()}),/offline/);assert.equal(calls,1);
 await assert.rejects(()=>Adjudication.resolve(fixture(),intentions,null,{askAuthor:async()=>({summary:'A day.'}),askCouncil:async()=>allow().map(()=>allow()[0])}),/duplicate reviewer/);
});
test('intention choices persist across retries and reload, with cache invalidation for changed personal context',async()=>{
 let s=fixture(),calls=0;const choose=async()=>{calls++;return attempt;};const first=await Adjudication.intentions(s,choose);assert.equal(calls,1);s=JSON.parse(JSON.stringify(s));World.capturePerceptions(s);const second=await Adjudication.intentions(s,choose);assert.equal(calls,1);assert.deepEqual(first,second);
 s.agents[0].food--;World.capturePerceptions(s);await Adjudication.intentions(s,choose);assert.equal(calls,2);
});
test('a failed simultaneous request preserves completed intentions without accepting late stale replies',async()=>{
 const s=fixture();s.agents.push({...JSON.parse(JSON.stringify(s.agents[0])),id:2,name:'Eve',perceptionMemory:null});World.capturePerceptions(s);let current=true;
 await assert.rejects(()=>Adjudication.intentions(s,async a=>{if(a.id===1)return attempt;throw Error('Eve unavailable');},{current:()=>current}),/unavailable/);current=false;assert.equal(s.openWorld.pendingIntentions.intentions.length,1);let ids=[];await Adjudication.intentions(s,async a=>{ids.push(a.id);return attempt;});assert.deepEqual(ids,[2]);
});
test('the complete-evidence packet includes explicit observer authority, not an inference from intent text',()=>{
 const s=fixture(),observer={description:'Heal Adam.',tile:0},p={summary:'An external healing.',agents:[{id:1,delta:{health:10}}]};const e=Adjudication.evidence(s,p,[],observer);assert.deepEqual(e.observerRequest,observer);assert.equal(e.after.agents[0].health,90);assert.throws(()=>Adjudication.evidence(s,p,intentions,null),/healing exceeds/);
});

test('unique current names and case differences resolve without creating stock or accepting ambiguous aliases',()=>{
 const s=fixture();s.openWorld.entities=[{id:'raw-1',name:'Pale folds',description:'Soft matter',tile:0,quantity:3,properties:{nourishment:2}}];
 const p=World.validate({summary:'One portion is consumed.',entities:[{op:'update',id:'PALE FOLDS',quantity:2}],transactions:[{kind:'consume',actor:1,entity:'RAW-1',amount:1,reason:'One portion was eaten'}]},s);assert.equal(p.entities[0].id,'raw-1');const n=World.apply(s,p);assert.equal(n.openWorld.entities.length,1);assert.equal(n.openWorld.entities[0].quantity,2);
 s.openWorld.entities.push({...s.openWorld.entities[0],id:'raw-2'});assert.throws(()=>World.validate({summary:'An ambiguous change.',entities:[{op:'update',id:'Pale folds',quantity:2}]},s),/does not exist/);
});
test('partial provider output is treated as repairable data, not as a committed complete outcome',async()=>{
 let calls=0;await Adjudication.resolve(fixture(),intentions,null,{askAuthor:async()=>{if(++calls===1)throw Object.assign(Error('Model output was incomplete'),{repairable:true,responseText:'{"summary":'});return {summary:'A concise complete day.'};},askCouncil:async()=>allow()});assert.equal(calls,2);
});

test('mixed formatting failures and vetoes have an overall author-call budget',async()=>{
 let calls=0;await assert.rejects(()=>Adjudication.resolve(fixture(),intentions,null,{maxAuthorCalls:2,askAuthor:async()=>++calls===1?'{bad':{summary:'A questionable event.'},askCouncil:async()=>allow().map((v,i)=>i===0?{...v,approve:false,reason:'A concrete unresolved contradiction.'}:v)}),/revision budget exhausted/);assert.equal(calls,2);
});
