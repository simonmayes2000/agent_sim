const test=require('node:test'),assert=require('node:assert/strict'),capture=require('./fixtures/day-one-command-failure.json');
const World=require('../dist/referee-world.js'),A=require('../dist/adjudication.js'),Kernel=require('../dist/turn-kernel.js'),Inhabitant=require('../dist/inhabitant.js'),{createModelRuntime}=require('../scripts/model-runtime.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),state=()=>copy(capture.state);
const ordinary=(kind='inspect',extra={})=>({action:'My chosen '+kind,execution:{kind},speech:null,targetEntityIds:[],...extra});
const forbidden=async()=>{throw Error('An ordinary turn must not call models for consequences');};
async function tick(s,ask,{id='turn-'+s.day,deadlineMs=50,author=forbidden,council=forbidden,proposalDeadlineMs=100}={}){
 const beforeVersion=Kernel.version(s),intentions=await A.intentions(s,ask,{deadlineMs});const faults=copy(s.openWorld.pendingIntentions.faults);const r=await A.resolve(s,intentions,null,{askAuthor:author,askCouncil:council,proposalDeadlineMs});const turn={id,beforeVersion,outcome:r.outcome,intentions,options:r.applyOptions,faults,resolution:r.resolution};return {next:Kernel.commit(s,turn),turn,result:r};
}
test('every captured production reply is accepted in one inference call after canonicalizing unused parameters',async()=>{
 for(const {actor,value} of capture.responses){let calls=0;const s=state(),req={actor,operation:'intention',view:World.perception(s,s.agents.find(a=>a.id===actor))},runtime=createModelRuntime({env:{AGENT_MODEL:'fixture-model',OPENAI_API_KEY:'fake'},fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({output_text:JSON.stringify(value)})};}}),r=await runtime.inhabitant(req);
  assert.equal(calls,1);assert.deepEqual(r.intention.execution,{kind:value.execution.kind});assert.equal(r.intention.speech,value.speech.trim()||null);assert.equal(r.inferenceDiagnostics,undefined);
 }
 const byActor=new Map(capture.responses.map(r=>[r.actor,r.value]));const {next}=await tick(state(),a=>Inhabitant.intention(byActor.get(a.id),World.perception(capture.state,a)));assert.equal(next.day,2);assert.equal(next.openWorld.turnReceipts[0].missingActions.length,0);
});
test('one invalid reply cannot cancel another actor or turn the missing action into a chosen wait',async()=>{
 const s=state(),{next,turn}=await tick(s,a=>a.id===1?ordinary('move',{destination:{x:1,y:2},speech:'Hello Eve.'}):ordinary('launch-shell'));
 assert.equal(next.day,2);assert.equal(next.agents[0].x,1);assert.equal(next.agents[0].energy,70);assert.equal(next.agents[1].energy,73);assert.equal(turn.intentions.length,1);assert.equal(turn.faults[0].actor,2);assert.equal(turn.faults[0].status,'rejected');assert.equal(next.agents[1].lastAction,s.agents[1].lastAction);assert.ok(next.events.some(e=>e.type==='speech'&&e.text==='Hello Eve.'));assert.ok(next.events.some(e=>e.type==='action-result'&&e.actor===2));
});
test('per-agent deadlines abort only that request and reject its eventual late result',async()=>{
 const s=state();let release,signal;const {next,turn}=await tick(s,(a,requestSignal)=>a.id===1?ordinary():(signal=requestSignal,new Promise(r=>release=r)),{deadlineMs:10});assert.equal(next.day,2);assert.equal(signal.aborted,true);assert.equal(turn.faults[0].status,'timed-out');release(ordinary('move',{destination:{x:3,y:2}}));await new Promise(r=>setImmediate(r));assert.equal(s.openWorld.pendingIntentions.intentions.length,1);assert.equal(next.agents[1].x,1);
});
test('all invalid replies still permit an honest no-action turn; a complete infrastructure outage explicitly pauses',async()=>{
 const {next}=await tick(state(),()=>ordinary('invalid'));assert.equal(next.day,2);assert.equal(next.openWorld.turnReceipts[0].commands.length,0);assert.equal(next.openWorld.turnReceipts[0].missingActions.length,2);
 const s=state();await assert.rejects(()=>tick(s,()=>{throw Error('Network unavailable');}),/explicitly paused/);assert.equal(s.day,1);
});
test('novel author and specialist timeouts withhold only additions, preserving accepted actions and clock effects',async()=>{
 const s=state(),ask=a=>a.id===1?ordinary('move',{destination:{x:1,y:2}}):ordinary('attempt');let authorSignal;
 const {next}=await tick(s,ask,{proposalDeadlineMs:10,author:(p,signal)=>{authorSignal=signal;return new Promise(()=>{});}});assert.equal(authorSignal.aborted,true);assert.equal(next.day,2);assert.equal(next.agents[0].x,1);assert.equal(next.openWorld.proposalQueue[0].status,'withheld');
 const r=await tick(state(),ask,{proposalDeadlineMs:10,author:async()=>({summary:'An unsupported experience.',agents:[{id:2,experience:'I perceive a new detail.'}]}),council:async()=>new Promise(()=>{})});assert.equal(r.next.day,2);assert.equal(r.next.openWorld.entities.length,0);assert.equal(r.next.openWorld.lastResolution.proposalWithheld,true);
});
test('a missing process verdict remains overdue without fabricated review dates or skipped established effects',async()=>{
 const s=state();s.openWorld.processes=[{id:'condition',description:'A continuing condition',status:'active',subjects:[1],nextReviewDay:2,lastReviewed:1,review:'Previously established'}];s.openWorld.scheduledEffects=[{id:'existing-effect',actor:1,dueDay:2,delta:{health:-3},reason:'An already established effect'}];const {next,turn}=await tick(s,()=>ordinary(),{author:async()=>{throw Error('Referee offline');}});
 assert.equal(next.day,2);assert.equal(next.agents[0].health,87);assert.equal(next.openWorld.scheduledEffects.length,0);assert.equal(next.openWorld.processes[0].nextReviewDay,2);assert.equal(next.openWorld.processes[0].lastReviewed,1);assert.equal(next.openWorld.pendingProcessReviews[0].id,'condition');assert.deepEqual(Kernel.commit(s,turn),next);
});
test('commits are idempotent and stale prepared commands never affect a newer world',async()=>{
 const s=state(),{next,turn}=await tick(s,()=>ordinary('rest'));const repeated=Kernel.commit(next,turn);assert.equal(repeated.day,2);assert.deepEqual(repeated,next);assert.throws(()=>Kernel.commit(next,{...turn,id:'different-command'}),/Stale commands/);assert.deepEqual(Kernel.commit(s,turn),next);
});
test('user cancellation invalidates every request without consuming a turn',async()=>{
 const s=state(),controller=new AbortController();let release;const pending=A.intentions(s,()=>new Promise(r=>release=r),{signal:controller.signal});controller.abort();await assert.rejects(pending,error=>error.name==='AbortError');release?.(ordinary());await new Promise(r=>setImmediate(r));assert.equal(s.day,1);assert.equal(s.openWorld.pendingIntentions.intentions.length,0);
});
test('a hundred turns with malformed replies, failures and finite shared stock keep exact progression and replay',async()=>{
 let s=state();s.openWorld.entities=[{id:'established',name:'Established supply',description:'A finite previously tested supply',tile:16,quantity:1000,properties:{nourishment:4,hydration:4}}];s.agents[1].x=0;World.capturePerceptions(s);s=World.apply(s,{summary:'A prior local test.',observations:s.agents.map(a=>({actor:a.id,entity:'established',properties:{nourishment:4,hydration:4},reason:'Previously established consumption properties'}))});
 let consumed=0;
 for(let turn=0;turn<100;turn++){const before=copy(s),r=await tick(s,a=>{if((turn+a.id)%7===0)throw Object.assign(Error('Malformed model output'),{failureKind:'invalid-response'});consumed++;return ordinary('consume',{execution:{kind:'consume',entity:'established',amount:1}});});s=r.next;assert.equal(s.day,before.day+1);assert.ok(s.agents.every(a=>a.alive));assert.equal(s.openWorld.entities[0].quantity,1000-consumed);assert.deepEqual(Kernel.commit(before,r.turn),s);assert.equal(Kernel.commit(s,r.turn).day,s.day);}
 assert.equal(s.day,102);
});
