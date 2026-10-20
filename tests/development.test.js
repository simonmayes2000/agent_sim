const test=require('node:test');
const assert=require('node:assert/strict');
const council=require('../dist/development.js');
function world(){return {day:5,width:2,height:1,weather:'clear',explored:[0],tiles:[{type:'grass',food:2,water:0,items:[{category:'food',quantity:3}],structures:[]}],agents:[{id:1,name:'Adam',alive:true,health:40,food:0,water:2,lastAction:'Searching for food'}],events:[],tech:{nodes:[]}}}
test('one compact consensus covers ten internal remits without gameplay mutation',async()=>{
 const state=world(),before=JSON.stringify(state);let calls=0,progress=0;
 const entry=await council.review(state,async prompt=>{
  calls++;assert.match(prompt,/GAME DEVELOPMENT/);assert.match(prompt,/not contain source code/);assert.match(prompt,/do not return individual findings/);
  return {status:'suggestion',title:'Earlier food access',problem:'Hungry agents can lose health while food remains elsewhere.',playerExperience:'The player sees a clear choice and can anticipate its consequence.',evidence:'Adam has zero food and health 40.',change:'Evaluate earlier food seeking.',implementation:'Adjust the search decision and expose the route rationale in the observation feed.',validation:'Equal-seed runs show fewer deprivation days without changing resource totals.',priority:'high'};
 },()=>progress++);
 assert.equal(calls,1);assert.equal(entry.status,'complete');assert.equal(entry.findings.length,0);assert.equal(entry.consensus.role,'Council consensus');assert.equal(entry.consensus.playerExperience,'The player sees a clear choice and can anticipate its consequence.');assert.equal(entry.consensus.priority,'high');assert.equal(progress,1);
 const {development,...game}=state;assert.equal(JSON.stringify(game),before);
 await council.review(state,()=>{throw Error('Should not repeat complete day')});assert.equal(state.development.reviews.length,1);
});
test('aggregated model failures are visible, never represented as successful reviews',async()=>{
 const entry=await council.review(world(),async()=>{throw Error('API unavailable')});
 assert.equal(entry.status,'partial');assert.equal(entry.findings.length,0);
 assert.equal(entry.consensus.status,'unavailable');
});
test('snapshots include introduced resources and the complete prior development history',()=>{
 const state=world();state.development={reviews:[1,2,3,4].map(day=>({day,status:'complete',consensus:{status:'suggestion',title:'Idea '+day,problem:'Problem '+day,evidence:'Evidence '+day,change:'Change '+day,validation:'Check '+day}}))};
 const snapshot=council.snapshot(state);assert.equal(snapshot.totals.food,5);assert.equal(snapshot.developmentHistory.length,4);assert.equal(snapshot.developmentHistory[0].change,'Change 1');assert.equal(snapshot.priorSuggestions[3].change,'Change 4');assert.deepEqual(snapshot.implementedSystems.length,5);
});
test('development history retains every previous day and advances with world days',async()=>{
 const state=world();state.development={reviews:Array.from({length:20},(_,day)=>({day:day-20,status:'complete',findings:[]}))};
 await council.review(state,async()=>({status:'no-evidence',evidence:'Insufficient evidence.'}));
 assert.equal(state.development.reviews.length,21);assert.equal(state.development.reviews.at(-1).day,5);
 state.day++;await council.review(state,async()=>({status:'no-evidence',evidence:'Insufficient evidence.'}));
 assert.equal(state.development.reviews.length,22);assert.equal(state.development.reviews.at(-1).day,6);
});
