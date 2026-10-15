const test = require('node:test');
const assert = require('node:assert/strict');
const Council = require('../dist/council.js');
const Tech = require('../dist/technology.js');
function fixture(){
 const agents=[1,2,3].map(id=>({id,alive:true,x:id-1,y:0,age:20,health:90,food:7,water:7,genes:{curiosity:60},parents:[],likes:{},knowledge:[],observed:['rock'],supplies:{stone:2},knownItems:{4:'tested'}}));
 for(const a of agents)for(const b of agents)if(a!==b)a.likes[b.id]=80;
 return {day:4,width:4,height:3,tiles:Array.from({length:12},(_,i)=>({type:i===0?'rock':'grass',structures:[],food:0,items:[]})),agents,tech:{nodes:[],trials:[]},explored:[0,1,2,3,4,5],lastExpansionExplored:0,clans:[]};
}
test('ten referees reach consensus on feasible birth and block lack of mutual affinity',()=>{const s=fixture();assert.equal(Council.reviewers.length,10);let yes=Council.decide(s,{kind:'birth',parents:[1,2]});assert.equal(yes.approved,true);s.agents[1].likes[1]=20;let no=Council.decide(s,{kind:'birth',parents:[1,2]});assert.equal(no.approved,false);assert.equal(no.votes.find(v=>v.name==='Social').vote,'block');assert.equal(s.council.approved,1);assert.equal(s.council.blocked,1)});
test('experiments need observed opportunity, supplies, and a suitable site',()=>{const s=fixture(),a=s.agents[0],c=Tech.possibilities(a,s).find(x=>x.effect==='edge');assert.equal(Council.decide(s,{kind:'experiment',actor:1,candidate:c}).approved,true);a.supplies.stone=0;assert.equal(Council.decide(s,{kind:'experiment',actor:1,candidate:c}).approved,false)});
test('clans and tested object discoveries receive two relevant approvals',()=>{const s=fixture();assert.equal(Council.decide(s,{kind:'clan',members:[1,2,3]}).approved,true);assert.equal(Council.decide(s,{kind:'item-discovery',actor:1,itemId:4}).approved,true)});
test('overseer cannot create minds or remove absent resources',()=>{const s=fixture();assert.equal(Council.decide(s,{kind:'intervention',command:{kind:'mind',tileIndex:0}}).approved,false);assert.equal(Council.decide(s,{kind:'intervention',command:{kind:'remove',category:'food',quantity:1,scope:'world',tileIndex:0}}).approved,false);assert.equal(Council.decide(s,{kind:'intervention',command:{kind:'add',tileIndex:0,name:'apple',category:'food',quantity:1}}).approved,true)});
test('ten model referees must agree after physical checks pass',async()=>{
 const s=fixture(),roles=[];
 const decision=await Council.decideWithModels(s,{kind:'birth',parents:[1,2]},async role=>{roles.push(role);return {approve:true,reason:'Both people can provide for a child.'}});
 assert.equal(roles.length,10);assert.equal(decision.approved,true);assert.equal(decision.mode,'model');
 const veto=await Council.decideWithModels(s,{kind:'birth',parents:[1,2]},async role=>({approve:role!=='Social',reason:'Social review'}));
 assert.equal(veto.approved,false);assert.equal(veto.votes.find(v=>v.name==='Social').vote,'block');
 s.agents[1].likes[1]=20;let calls=0;
 const safeguard=await Council.decideWithModels(s,{kind:'birth',parents:[1,2]},async()=>{calls++;return {approve:true}});
 assert.equal(safeguard.approved,false);assert.equal(calls,0);
});
test('model failure cannot approve a world event',async()=>{
 const s=fixture(),decision=await Council.decideWithModels(s,{kind:'birth',parents:[1,2]},async()=>{throw Error('offline')});
 assert.equal(decision.approved,false);assert.equal(decision.votes.length,10);
});
