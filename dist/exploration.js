/* Observed resource locations and locally shared route knowledge. */
(function(root){
'use strict';
const resources=['food','water','wood','stone','fibre'];
const key=(tile,resource)=>`${tile}:${resource}`;
const validityDays=resource=>resource==='food'?3:6;
function normalizeWaypoint(w){if(!w)return w;w.trendPerDay=Number(w.trendPerDay)||0;w.validForDays=Number(w.validForDays)||validityDays(w.resource);w.expiresDay=Number(w.expiresDay)||Number(w.day||0)+w.validForDays;return w}
function ensure(state){
 state.exploration ||= {waypoints:{},log:[],revision:0};
 state.exploration.waypoints ||= {};state.exploration.log ||= [];state.exploration.revision ||= 0;
 for(const w of Object.values(state.exploration.waypoints))normalizeWaypoint(w);
 for(const a of state.agents||[]){if(!a.exploration){a.exploration={ground:{},waypoints:{}};for(const i of a.seenTiles||[]){const t=state.tiles[i];if(t)a.exploration.ground[i]={type:t.type,sheltered:false,revision:0}}}for(const w of Object.values(a.exploration.waypoints||{}))normalizeWaypoint(w)}
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
  if(!old||old.amount!==waypoint.amount)changes.push(record(state,{kind:'shared',actor:a.id,recipient:b.id,tile:waypoint.tile,resource:waypoint.resource,amount:waypoint.amount,expiresDay:waypoint.expiresDay,trendPerDay:waypoint.trendPerDay}));
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
  const previous=a.exploration.waypoints[id]||old,elapsed=previous?Math.max(1,state.day-previous.day):1,trendPerDay=previous&&state.day>previous.day?(amount-previous.amount)/elapsed:Number(previous?.trendPerDay)||0,validForDays=validityDays(resource);
  const waypoint={tile:i,resource,amount,day:state.day,observer:a.id,revision:ground.revision,previousAmount:previous?.amount??amount,trendPerDay,validForDays,expiresDay:state.day+validForDays};
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
 if(goal)return record(state,{kind:'travel',actor:a.id,tile:next,target:goal.target,resource:goal.resource,cost,estimatedRemaining:Math.max(0,goal.cost-cost),forecastAmount:goal.projectedAmount,forecastConfidence:goal.confidence,forecastAge:goal.age,recommendation:goal.recommendation});
 return {kind:'step',tile:next,cost};
}
function estimate(state,a,waypoint){
 ensure(state);const known=a.exploration.waypoints[key(waypoint.tile,waypoint.resource)];
 if(!known)return {status:'unknown'};
 if(known.amount<=0)return {status:'depleted',waypoint:known};
 const path=route(state,a,(_,i)=>i===known.tile);
 return path?{status:'reachable',...path,waypoint:known}:{status:'unreachable',waypoint:known};
}
function forecast(state,a,waypoint){
 ensure(state);const known=a?.exploration?.waypoints?.[key(waypoint.tile,waypoint.resource)];
 if(!known)return {status:'unknown',recommendation:'Ask a companion to share a route or explore toward this place.'};
 normalizeWaypoint(known);const age=Math.max(0,state.day-known.day),staleIn=known.expiresDay-state.day,confidence=Math.max(10,Math.round(100-age/known.validForDays*70));
 if(known.amount<=0)return {status:'depleted',waypoint:known,age,staleIn,confidence,projectedAmount:0,remainingDays:0,weatherImpact:'No travel benefit while the sighting is depleted.',recommendation:known.resource==='food'?'Wait for local regrowth or choose another food site.':'Choose another water sighting and recheck this place later.',score:-Infinity};
 const path=route(state,a,(_,i)=>i===known.tile);if(!path)return {status:'unreachable',waypoint:known,age,staleIn,confidence,projectedAmount:known.amount,remainingDays:null,weatherImpact:'No connected route through known ground.',recommendation:'Explore or share knowledge to connect a route to this sighting.',score:-Infinity};
 const arrivalDays=Math.ceil(path.steps/2),trend=Number(known.trendPerDay)||0,projectedAmount=Math.max(0,Math.round(known.amount+trend*(age+arrivalDays))),remainingDays=trend<0?Math.max(0,Math.ceil(projectedAmount/Math.abs(trend))):null,weatherPenalty=Math.max(0,path.cost-path.steps),weatherImpact=state.weather==='wind'?(weatherPenalty?`Wind adds ${weatherPenalty} energy on exposed ground.`:'The known route is sheltered from today’s wind.'):(state.weather==='rain'?'Rain does not change travel energy, but shelter may matter at day’s end.':'Clear weather adds no travel penalty.');
 let recommendation;if(projectedAmount<=0)recommendation='Recheck the sighting before committing energy; the observed trend suggests depletion.';else if(path.cost>a.energy)recommendation='Rest before travelling; current energy does not cover the route.';else if(staleIn<=0||confidence<40)recommendation='Verify this aging sighting before relying on its quantity.';else if(path.cost<=projectedAmount+1)recommendation=`Travel now; the forecast still supports a useful ${known.resource} gain.`;else recommendation='Prefer a nearer or more reliable sighting unless this resource is urgent.';
 return {status:'reachable',...path,waypoint:known,age,staleIn,confidence,arrivalDays,projectedAmount,remainingDays,weatherPenalty,weatherImpact,recommendation,score:projectedAmount-path.cost*.65+confidence/100};
}
function bestResourceRoute(state,a,resource){return Object.values(a.exploration?.waypoints||{}).filter(w=>w.resource===resource).map(w=>forecast(state,a,w)).filter(f=>f.status==='reachable'&&f.projectedAmount>0).sort((x,y)=>y.score-x.score||x.cost-y.cost||x.target-y.target)[0]||null}
function remap(state,oldWidth,newWidth){
 if(!state.exploration)return;
 const index=i=>(Math.floor(i/oldWidth)+1)*newWidth+(i%oldWidth)+1;
 const waypoints=entries=>Object.fromEntries(Object.values(entries||{}).map(w=>{const value={...w,tile:index(w.tile)};return [key(value.tile,value.resource),value]}));
 state.exploration.waypoints=waypoints(state.exploration.waypoints);
 for(const a of state.agents||[])if(a.exploration){a.exploration.ground=Object.fromEntries(Object.entries(a.exploration.ground).map(([i,g])=>[index(Number(i)),g]));a.exploration.waypoints=waypoints(a.exploration.waypoints)}
 for(const e of state.exploration.log){if(e.tile!=null)e.tile=index(e.tile);if(e.target!=null)e.target=index(e.target)}
}
root.Exploration={ensure,observe,share,route,advance,estimate,forecast,bestResourceRoute,stepCost,remap};
if(typeof module!=='undefined')module.exports=root.Exploration;
})(typeof window!=='undefined'?window:globalThis);
