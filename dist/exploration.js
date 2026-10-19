/* Observed resource locations and locally shared route knowledge. */
(function(root){
'use strict';
const resources=['food','water','wood','stone','fibre'];
const key=(tile,resource)=>`${tile}:${resource}`;
function ensure(state){
 state.exploration ||= {waypoints:{},log:[],revision:0};
 state.exploration.waypoints ||= {};state.exploration.log ||= [];state.exploration.revision ||= 0;
 for(const a of state.agents||[])if(!a.exploration){
  a.exploration={ground:{},waypoints:{}};
  // Old saves retain known geography; quantities require a fresh observation.
  for(const i of a.seenTiles||[]){const t=state.tiles[i];if(t)a.exploration.ground[i]={type:t.type,sheltered:false,revision:0}}
 }
 return state.exploration;
}
function record(state,entry){const log=ensure(state).log;log.push({day:state.day,...entry});if(log.length>200)log.shift();return log.at(-1)}
function observedGround(state,a,i){
 const t=state.tiles[i],value={type:t.type,sheltered:t.structures?.some(b=>b.kind==='shelter')||false,revision:++state.exploration.revision};
 for(const r of resources)value[r]=(t[r]||0)+(t.items||[]).filter(item=>item.category===r&&a.knownItems?.[item.id]==='tested').reduce((n,item)=>n+item.quantity,0);
 return value;
}
function share(state,a,b){
 ensure(state);if(!a.alive||!b.alive||a.id===b.id||Math.abs(a.x-b.x)+Math.abs(a.y-b.y)>2)return [];
 const changes=[];
 for(const [i,ground] of Object.entries(a.exploration.ground))if(!b.exploration.ground[i]||ground.revision>b.exploration.ground[i].revision)b.exploration.ground[i]={...ground};
 for(const [id,waypoint] of Object.entries(a.exploration.waypoints)){
  const old=b.exploration.waypoints[id];if(old&&old.revision>=waypoint.revision)continue;
  b.exploration.waypoints[id]={...waypoint};
  if(!old||old.amount!==waypoint.amount)changes.push(record(state,{kind:'shared',actor:a.id,recipient:b.id,tile:waypoint.tile,resource:waypoint.resource,amount:waypoint.amount}));
 }
 return changes;
}
function observe(state,a){
 const data=ensure(state);if(!a.alive)return [];
 const i=a.y*state.width+a.x,ground=observedGround(state,a,i),changes=[];
 a.exploration.ground[i]=ground;
 a.seenTiles ||= [];if(!a.seenTiles.includes(i))a.seenTiles.push(i);
 state.explored ||= [];if(!state.explored.includes(i))state.explored.push(i);
 for(const resource of ['food','water']){
  const id=key(i,resource),old=data.waypoints[id],amount=ground[resource];
  if(!amount&&!old&&!a.exploration.waypoints[id])continue;
  const waypoint={tile:i,resource,amount,day:state.day,observer:a.id,revision:ground.revision};
  data.waypoints[id]=waypoint;a.exploration.waypoints[id]={...waypoint};
  if(!old||old.amount!==amount)changes.push(record(state,{kind:!old?'discovered':'updated',actor:a.id,...waypoint}));
 }
 for(const b of state.agents||[])changes.push(...share(state,a,b));
 return changes;
}
function stepCost(weather,ground){return 1+(weather==='wind'&&ground?.type!=='forest'&&!ground?.sheltered?1:0)}
function neighbours(state,i){const x=i%state.width,y=Math.floor(i/state.width);return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([x,y])=>x>=0&&y>=0&&x<state.width&&y<state.height).map(([x,y])=>y*state.width+x)}
function route(state,a,test){
 ensure(state);const start=a.y*state.width+a.x,ground=a.exploration.ground;
 const costs=new Map([[start,0]]),previous=new Map(),open=[start],closed=new Set();
 while(open.length){
  open.sort((x,y)=>costs.get(x)-costs.get(y)||x-y);const i=open.shift();if(closed.has(i))continue;closed.add(i);
  if(ground[i]&&test(ground[i],i)){
   const path=[];for(let p=i;p!==start;p=previous.get(p))path.unshift(p);
   return {target:i,path,cost:costs.get(i),steps:path.length};
  }
  for(const n of neighbours(state,i))if(ground[n]&&!closed.has(n)){
   const cost=costs.get(i)+stepCost(state.weather,ground[n]);
   if(cost<(costs.get(n)??Infinity)){costs.set(n,cost);previous.set(n,i);open.push(n)}
  }
 }
 return null;
}
function advance(state,a,next,goal=null){
 if(!neighbours(state,a.y*state.width+a.x).includes(next))return null;
 const t=state.tiles[next],cost=stepCost(state.weather,{type:t.type,sheltered:t.structures?.some(b=>b.kind==='shelter')});
 if(!a.alive||a.energy<cost)return null;
 a.energy-=cost;a.x=next%state.width;a.y=Math.floor(next/state.width);
 if(goal)return record(state,{kind:'travel',actor:a.id,tile:next,target:goal.target,resource:goal.resource,cost,estimatedRemaining:Math.max(0,goal.cost-cost)});
 return {kind:'step',tile:next,cost};
}
function estimate(state,a,waypoint){
 ensure(state);const known=a.exploration.waypoints[key(waypoint.tile,waypoint.resource)];
 if(!known)return {status:'unknown'};
 if(known.amount<=0)return {status:'depleted',waypoint:known};
 const path=route(state,a,(_,i)=>i===known.tile);
 return path?{status:'reachable',...path,waypoint:known}:{status:'unreachable',waypoint:known};
}
function remap(state,oldWidth,newWidth){
 if(!state.exploration)return;
 const index=i=>(Math.floor(i/oldWidth)+1)*newWidth+(i%oldWidth)+1;
 const waypoints=entries=>Object.fromEntries(Object.values(entries||{}).map(w=>{const value={...w,tile:index(w.tile)};return [key(value.tile,value.resource),value]}));
 state.exploration.waypoints=waypoints(state.exploration.waypoints);
 for(const a of state.agents||[])if(a.exploration){a.exploration.ground=Object.fromEntries(Object.entries(a.exploration.ground).map(([i,g])=>[index(Number(i)),g]));a.exploration.waypoints=waypoints(a.exploration.waypoints)}
 for(const e of state.exploration.log){if(e.tile!=null)e.tile=index(e.tile);if(e.target!=null)e.target=index(e.target)}
}
root.Exploration={ensure,observe,share,route,advance,estimate,stepCost,remap};
if(typeof module!=='undefined')module.exports=root.Exploration;
})(typeof window!=='undefined'?window:globalThis);
