/* Persistent geography, settlements, social groups, and overseer changes. */
(function (root) {
'use strict';
const categories = ['food','water','wood','stone','fibre','hazard','mystery'];
const colors = ['#d79b69','#a1b9da','#c69db6','#d4bf72','#9ec4ac','#ba9e78'];
const builtEffects = {
  edge: ['knapping','Knapping place','◆'], cord: ['weaving','Weaving place','≋'],
  shelter: ['shelter','Leaf shelter','⌂'], fire: ['hearth','Hearth','✦'],
  tool: ['workshop','Tool place','⚒'], vessel: ['cache','Storage place','▣'],
  frame: ['frame','Bound frame','⌗'], 'strong-shelter': ['shelter','Reinforced shelter','⌂'],
  'strong-tool': ['workshop','Weighted tool place','⚒'], 'heated-stone': ['hearth','Heated stone ring','✦'],
  'prepared-food': ['drying','Food drying place','☼'], 'stored-food': ['drying','Drying rack','☼'],
  'safe-water': ['waterwork','Water warming place','≈'], 'water-store': ['cache','Water cache','▣']
};
function tile(type,i){return {type,food:type==='berry'?5:type==='forest'?2:0,water:type==='water'?12:0,wood:type==='forest'?8:0,stone:type==='rock'?8:0,fibre:type==='forest'?6:type==='grass'?4:0,i,visits:0,structures:[],items:[],territory:{}}}
function ensure(state){
  state.width ||= 8;state.height ||= 6;state.expansions ||= 0;if(!Array.isArray(state.explored))state.explored=[...new Set((state.agents||[]).flatMap(a=>a.seenTiles||[]))];state.lastExpansionExplored ||= 0;
  state.clans ||= [];state.nextClanId ||= 1;state.interventions ||= [];state.nextInterventionId ||= 1;state.nextItemId ||= 1;
  for(const t of state.tiles){t.visits ||= 0;t.structures ||= [];t.items ||= [];t.territory ||= {}}
  for(const a of state.agents){a.clanId ||= null;a.noticedInterventions ||= [];a.knownItems ||= {};}
  state.version=3;
}
function markVisit(state,a){const i=a.y*state.width+a.x,t=state.tiles[i];if(!state.explored.includes(i))state.explored.push(i);t.visits++;if(a.clanId)t.territory[a.clanId]=(t.territory[a.clanId]||0)+1}
function maybeExpand(state,rng){if(state.width>=16||state.explored.length<(state.lastExpansionExplored||0)+Math.ceil(state.width*state.height*.25))return null;
  const oldW=state.width,oldH=state.height,W=oldW+2,H=oldH+2,old=state.tiles;
  const types=['grass','grass','grass','forest','forest','berry','rock','water'];
  const next=Array.from({length:W*H},(_,i)=>tile(types[Math.floor(rng()*types.length)],i));
  for(let y=0;y<oldH;y++)for(let x=0;x<oldW;x++){let t=old[y*oldW+x],i=(y+1)*W+x+1;t.i=i;next[i]=t}
  state.tiles=next;state.width=W;state.height=H;state.expansions++;state.lastExpansionExplored=state.explored.length;
  state.explored=state.explored.map(i=>(Math.floor(i/oldW)+1)*W+(i%oldW)+1);
  for(const a of state.agents){a.x++;a.y++;a.seenTiles=(a.seenTiles||[]).map(i=>(Math.floor(i/oldW)+1)*W+(i%oldW)+1)}
  for(const c of state.clans){c.x++;c.y++}
  for(const m of state.interventions){if(m.x!=null){m.x++;m.y++}if(m.affected)m.affected=m.affected.map(i=>(Math.floor(i/oldW)+1)*W+(i%oldW)+1)}
  return {oldW,oldH,width:W,height:H};
}
function updateClans(state,approve=()=>true){const alive=state.agents.filter(a=>a.alive),visited=new Set(),groups=[];
  for(const a of alive){if(visited.has(a.id))continue;const group=[],queue=[a];visited.add(a.id);
    while(queue.length){const p=queue.shift();group.push(p);for(const b of alive)if(!visited.has(b.id)&&(p.likes[b.id]||0)>=65&&(b.likes[p.id]||0)>=65){visited.add(b.id);queue.push(b)}}
    if(group.length>=3)groups.push(group);
  }
  const claimed=new Set(),formed=[];
  for(const group of groups){let best=null,bestOverlap=0;for(const c of state.clans){if(claimed.has(c.id))continue;let overlap=group.filter(a=>a.clanId===c.id).length;if(overlap>bestOverlap){best=c;bestOverlap=overlap}}
    if(!best){if(!approve(group))continue;let id=state.nextClanId++,t=state.tiles[group[0].y*state.width+group[0].x];let stem=t.type==='water'?'River':t.type==='forest'?'Canopy':t.type==='rock'?'Stone':t.type==='berry'?'Bramble':'Clearing';best={id,name:`${stem} Clan ${id}`,color:colors[(id-1)%colors.length],founded:state.day,members:[],x:group[0].x,y:group[0].y};state.clans.push(best);formed.push(best)}
    claimed.add(best.id);best.members=group.map(a=>a.id);best.x=Math.round(group.reduce((n,a)=>n+a.x,0)/group.length);best.y=Math.round(group.reduce((n,a)=>n+a.y,0)/group.length);for(const a of group)a.clanId=best.id;
  }
  for(const a of alive)if(!groups.some(g=>g.includes(a)))a.clanId=null;
  for(const c of state.clans)if(!claimed.has(c.id))c.members=[];
  return formed;
}
function build(state,a,node,prototype=false){const spec=builtEffects[node.effect];if(!spec)return null;let t=state.tiles[a.y*state.width+a.x];if(t.structures.some(s=>s.kind===spec[0]&&s.techId===node.id))return null;
  if(!prototype){let cost=spec[0]==='hearth'?{wood:1,stone:1}:spec[0]==='knapping'?{stone:1}:{wood:1,fibre:1};for(const [k,v] of Object.entries(cost))if((a.supplies[k]||0)<v)return null;for(const [k,v] of Object.entries(cost))a.supplies[k]-=v}
  const structure={kind:spec[0],name:spec[1],icon:spec[2],techId:node.id,day:state.day,builder:a.name,clanId:a.clanId};t.structures.push(structure);return structure;
}
function clampText(v,max){return String(v||'').trim().slice(0,max)}
function intervene(state,command){const kind=command.kind,idx=Number(command.tileIndex),valid=Number.isInteger(idx)&&idx>=0&&idx<state.tiles.length,t=valid?state.tiles[idx]:null;let text, x=t?idx%state.width:null,y=t?Math.floor(idx/state.width):null,category=null,itemId=null,affected=null;
  if(kind==='add'){
    if(!t)throw Error('Choose a tile first.');let name=clampText(command.name,80),appearance=clampText(command.appearance,80);if(!name)throw Error('Give the object a name.');category=command.category;if(!categories.includes(category))throw Error('Choose what the object does.');let quantity=Math.max(1,Math.min(99999,Math.floor(Number(command.quantity)||1)));itemId=state.nextItemId++;t.items.push({id:itemId,name,appearance:appearance||'an unfamiliar object',category,quantity,added:state.day});text=`The overseer places ${quantity} × ${name} at (${x+1}, ${y+1}).`;
  }else if(kind==='remove'){
    category=command.category;if(!['food','water','wood','stone','fibre'].includes(category))throw Error('Choose a resource to remove.');let amount=Math.max(1,Math.min(99999,Math.floor(Number(command.quantity)||1))),remaining=amount,scope=command.scope==='world'?'world':'tile';if(scope==='tile'&&!t)throw Error('Choose a tile first.');let targets=scope==='world'?state.tiles:[t];affected=[];for(const spot of targets){let before=remaining;for(const item of spot.items)if(item.category===category&&remaining>0){let take=Math.min(item.quantity,remaining);item.quantity-=take;remaining-=take}spot.items=spot.items.filter(item=>item.quantity>0);if(remaining>0){let take=Math.min(spot[category]||0,remaining);spot[category]-=take;remaining-=take}if(remaining<before)affected.push(spot.i);if(!remaining)break}text=`The overseer removes ${amount-remaining} ${category} from ${scope==='world'?'the world':`(${x+1}, ${y+1})`}.`;if(scope==='world'){x=null;y=null}
  }else if(kind==='weather'){
    if(!['clear','rain','wind'].includes(command.weather))throw Error('Choose a weather condition.');state.weather=command.weather;state.weatherUntil=state.day+Math.max(1,Math.min(999,Math.floor(Number(command.duration)||3)));x=null;y=null;text=`The overseer changes the weather to ${command.weather} for ${state.weatherUntil-state.day} days.`;
  }else if(kind==='terrain'){
    if(!t)throw Error('Choose a tile first.');if(!['grass','forest','berry','water','rock'].includes(command.terrain))throw Error('Choose terrain.');let fresh=tile(command.terrain,idx);fresh.visits=t.visits;fresh.items=t.items;fresh.structures=command.terrain==='water'?[]:t.structures;fresh.territory=t.territory;state.tiles[idx]=fresh;text=`The overseer changes (${x+1}, ${y+1}) into ${command.terrain}.`;
  }else throw Error('Choose an intervention.');
  const entry={id:state.nextInterventionId++,day:state.day,kind,x,y,category,itemId,text,affected};state.interventions.push(entry);if(state.interventions.length>200)state.interventions.shift();return entry;
}
function relevantChanges(state,a){return state.interventions.filter(m=>!a.noticedInterventions.includes(m.id)&&(m.affected?m.affected.some(i=>Math.abs(i%state.width-a.x)+Math.abs(Math.floor(i/state.width)-a.y)<=2):m.x==null||Math.abs(m.x-a.x)+Math.abs(m.y-a.y)<=2))}
function enact(state,plan){let entry;if(plan.effect.scope==='world'&&['add','terrain'].includes(plan.effect.kind)){
  const e=plan.effect;
  for(let i=0;i<state.tiles.length;i++){const t=state.tiles[i];if(e.kind==='add'){t.items.push({id:state.nextItemId++,name:e.name,appearance:e.appearance,category:e.category,quantity:e.quantity,added:state.day})}
    else{const fresh=tile(e.terrain,i);fresh.visits=t.visits;fresh.items=t.items;fresh.structures=e.terrain==='water'?[]:t.structures;fresh.territory=t.territory;state.tiles[i]=fresh}}
  entry={id:state.nextInterventionId++,day:state.day,kind:e.kind,x:null,y:null,category:e.category||null,itemId:null,text:`The overseer changes ${state.tiles.length} places across the world.`};state.interventions.push(entry);if(state.interventions.length>200)state.interventions.shift();
 }else if(plan.effect.kind==='person'){
  const a=state.agents.find(a=>a.id===plan.effect.targetId);if(!a)throw Error('That person does not exist.');
  if(plan.effect.mode==='kill'){a.health=0;a.alive=false;a.death=state.day}else if(plan.effect.mode==='hurt'){a.health=Math.max(0,a.health-plan.effect.quantity);if(!a.health){a.alive=false;a.death=state.day}}else a.health=Math.min(100,a.health+plan.effect.quantity);
  entry={id:state.nextInterventionId++,day:state.day,kind:'person',x:a.x,y:a.y,category:null,itemId:null,text:plan.interpretation,killed:!a.alive};state.interventions.push(entry);if(state.interventions.length>200)state.interventions.shift();
 }else entry=intervene(state,plan.effect);
 entry.description=plan.description;entry.perception=plan.perception;entry.interpretation=plan.interpretation;entry.text=`${plan.description} → ${entry.text}`;return entry;
}
function take(state,t,category){const item=t.items.find(i=>i.category===category&&i.quantity>0);if(item){item.quantity--;if(!item.quantity)t.items=t.items.filter(i=>i.quantity>0);return item}if((t[category]||0)>0){t[category]--;return null}return false}
function available(t,category){return (t[category]||0)+t.items.filter(i=>i.category===category).reduce((n,i)=>n+i.quantity,0)}
root.WorldSystems={tile,ensure,markVisit,maybeExpand,updateClans,build,intervene,enact,relevantChanges,take,available};
if(typeof module!=='undefined')module.exports=root.WorldSystems;
})(typeof window!=='undefined'?window:globalThis);
