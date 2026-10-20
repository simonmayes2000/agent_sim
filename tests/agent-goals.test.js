const test=require('node:test');
const assert=require('node:assert/strict');
const Goals=require('../dist/agent-goals.js');
const tech=require('../dist/technology.js');
function fixture(){return {state:{day:1,weather:'clear',width:1,tiles:[{type:'forest',structures:[]}],tech:{nodes:[],trials:[]}},a:{id:1,x:0,y:0,food:7,water:7,energy:70,observed:['forest'],seenTiles:[0],knowledge:[],supplies:{wood:0,fibre:0,stone:0}}};}
test('a personal project persists across days, survival interruptions and save/reload',()=>{
 const {state,a}=fixture();const goal=Goals.plan(a,state,tech),id=goal.candidateId;
 state.day=2;a.water=1;assert.equal(Goals.plan(a,state,tech).status,'paused');assert.equal(a.goal.candidateId,id);
 const restored=JSON.parse(JSON.stringify(a));state.day=4;restored.water=7;
 assert.equal(Goals.plan(restored,state,tech).candidateId,id);assert.equal(restored.goal.started,1);assert.equal(restored.goal.status,'active');
});
test('preparation progress reflects actual materials, not elapsed time',()=>{
 const {state,a}=fixture();Goals.plan(a,state,tech);const before=a.goal.progress;
 Object.assign(a.supplies,a.goal.costs);Goals.plan(a,state,tech);
 assert.ok(a.goal.progress>before);assert.equal(a.goal.progress,85);assert.match(a.goal.next,/Test/);
});
test('learning completes a project and retains its history before selecting another',()=>{
 const {state,a}=fixture();const g=Goals.plan(a,state,tech);a.knowledge.push(g.candidateId);state.tech.nodes.push({id:g.candidateId,name:g.title,effect:'cord'});state.day=3;
 Goals.plan(a,state,tech);assert.equal(a.goalHistory[0].status,'complete');assert.equal(a.goalHistory[0].progress,100);assert.equal(a.goalHistory[0].finished,3);
});
test('goals never unlock experiments in unobserved terrain',()=>{
 const {state,a}=fixture();a.observed=[];const g=Goals.plan(a,state,tech);assert.equal(g.kind,'explore');assert.deepEqual(a.knowledge,[]);
});
test('known shelters produce a concrete construction project, then stop duplicating it',()=>{
 const {state,a}=fixture();const node={id:'shelter',name:'Leaf shelter',effect:'shelter'};state.tech.nodes.push(node);a.knowledge.push(node.id);
 const g=Goals.plan(a,state,tech);assert.equal(g.kind,'build');assert.deepEqual(g.costs,{wood:1,fibre:1});
 state.tiles[0].structures.push({techId:node.id});Goals.finish(a,state);assert.notEqual(Goals.plan(a,state,tech).kind,'build');
});
test('a blocked goal respects its approval retry day',()=>{
 const {state,a}=fixture();const g=Goals.plan(a,state,tech);g.retryAfter=3;
 assert.equal(Goals.plan(a,state,tech).status,'blocked');state.day=3;assert.equal(Goals.plan(a,state,tech).status,'active');
});
