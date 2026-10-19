const test=require('node:test');
const assert=require('node:assert/strict');
const council=require('../dist/development.js');
function world(){return {day:5,width:2,height:1,weather:'clear',explored:[0],tiles:[{type:'grass',food:2,water:0,items:[{category:'food',quantity:3}],structures:[]}],agents:[{id:1,name:'Adam',alive:true,health:40,food:0,water:2,lastAction:'Searching for food'}],events:[],tech:{nodes:[]}}}
test('daily development covers ten remits with bounded concurrency and no gameplay mutation',async()=>{
 const state=world(),before=JSON.stringify(state);let active=0,peak=0,calls=0,progress=0;
 const entry=await council.review(state,async(role,prompt)=>{
  calls++;active++;peak=Math.max(peak,active);
  assert.match(prompt,/GAME DEVELOPMENT/);assert.match(prompt,/not contain source code/);
  await new Promise(resolve=>setImmediate(resolve));active--;
  return {status:'suggestion',evidence:'Adam has zero food and health 40.',change:'Evaluate earlier food seeking.',validation:'Compare deprivation over equal-seed runs.'};
 },()=>progress++);
 assert.equal(calls,10);assert.equal(peak,3);assert.equal(entry.status,'complete');assert.equal(entry.findings.length,10);assert.equal(progress,12);
 const {development,...game}=state;assert.equal(JSON.stringify(game),before);
 await council.review(state,()=>{throw Error('Should not repeat complete day')});assert.equal(state.development.reviews.length,1);
});
test('model failures and invalid advice are visible, never represented as successful reviews',async()=>{
 const entry=await council.review(world(),async(role)=>{
  if(role==='Social')throw Error('API unavailable');
  if(role==='Space')return {status:'suggestion',evidence:'Evidence',change:'',validation:''};
  return JSON.stringify({status:'no-evidence',evidence:'No supported change from this snapshot.'});
 });
 assert.equal(entry.status,'partial');assert.equal(entry.findings.filter(f=>f.status==='unavailable').length,2);
 assert.equal(entry.findings.filter(f=>f.status==='no-evidence').length,8);
});
test('snapshots include introduced resources and past suggestions without full review history',()=>{
 const state=world();state.development={reviews:[{findings:[{role:'Social',status:'suggestion',change:'Improve cooperation.'}]}]};
 const snapshot=council.snapshot(state);assert.equal(snapshot.totals.food,5);assert.equal(snapshot.priorSuggestions[0].change,'Improve cooperation.');assert.equal(snapshot.development,undefined);
});
test('development history stays bounded and advances with world days',async()=>{
 const state=world();state.development={reviews:Array.from({length:20},(_,day)=>({day:day-20,status:'complete',findings:[]}))};
 await council.review(state,async()=>({status:'no-evidence',evidence:'Insufficient evidence.'}));
 assert.equal(state.development.reviews.length,20);assert.equal(state.development.reviews.at(-1).day,5);
 state.day++;await council.review(state,async()=>({status:'no-evidence',evidence:'Insufficient evidence.'}));
 assert.equal(state.development.reviews.at(-1).day,6);
});
