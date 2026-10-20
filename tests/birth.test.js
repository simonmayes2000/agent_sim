const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');
test('a birth transfers parental food and water without creating or losing provisions',async()=>{
  const a={id:1,name:'Adam',alive:true,age:25,food:8,water:8,health:90,parents:[],likes:{2:90},x:0,y:0,born:1,gen:0};
  const b={...a,id:2,name:'Eve',likes:{1:90}};
  const state={day:8,nextId:3,agents:[a,b]};
  const before=state.agents.reduce((sum,p)=>({food:sum.food+p.food,water:sum.water+p.water}),{food:0,water:0});
  const context=vm.createContext({state,living:()=>state.agents,RealismRules:{birthMinFood:5,birthMinWater:5,birthBondMinimum:65},rng:()=>0,councilDecision:async()=>({approved:true}),firstNames:['Ari'],inherit:()=>({}),makeAgent:(name,id)=>({name,id,likes:{}}),event:()=>{},speak:()=>{}});
  vm.runInContext(app.slice(app.indexOf('async function birth(){'),app.indexOf('\nfunction upkeep')),context);
  await context.birth();
  assert.equal(state.agents.length,3);
  assert.equal(state.agents[2].food,4);assert.equal(state.agents[2].water,2);
  assert.equal(state.agents.reduce((n,p)=>n+p.food,0),before.food);
  assert.equal(state.agents.reduce((n,p)=>n+p.water,0),before.water);
});
