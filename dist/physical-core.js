/* Small deterministic constraints; arbitrary names, materials and intentions remain open. */
(function(root){
 'use strict';
 const rules=Object.freeze({version:1,maxTravel:3,travelEnergy:3,dailyFood:1,dailyWater:1,dailyEnergy:2,starvationDamage:7,dehydrationDamage:9,maxRecovery:3,maxRest:30,capacity:{health:100,energy:100,food:20,water:20}});
 const copy=v=>JSON.parse(JSON.stringify(v));
 const fail=message=>{throw Error('Physical rule: '+message);};
 const amount=(n,label,zero=false)=>{if(typeof n!=='number'||!Number.isFinite(n)||n>(1e9)||n<(zero?0:Number.EPSILON))fail(label+' must be a bounded '+(zero?'nonnegative':'positive')+' number.');return n;};
 const reason=v=>{if(typeof v!=='string'||!v.trim())fail('a physical source or process needs a reason.');};
 const list=(p,key)=>{if(p[key]!=null&&!Array.isArray(p[key]))fail(key+' must be an array.');return p[key]||[];};
 function resolve(state,p,{observer=false}={}){
  const people=new Map(state.agents.map(a=>[a.id,copy(a)])),oldEntities=new Map((state.openWorld?.entities||[]).map(e=>[e.id,e])),entities=new Map([...oldEntities].map(([id,e])=>[id,copy(e)])),audit=[];
  const west=p.expand?.west||0,north=p.expand?.north||0,width=state.width+west+(p.expand?.east||0),day=state.day+1;
  const remap=i=>(Math.floor(i/state.width)+north)*width+i%state.width+west;
  const person=id=>{const a=people.get(id);if(!a||!a.alive)fail('the actor must be a living person.');return a;};
  const entity=id=>{const e=entities.get(id);if(!e)fail('the material source does not exist: '+id);return e;};
  const position=a=>a.y*width+a.x;
  const accessible=(e,a)=>{if(e.carriedBy!=null?e.carriedBy!==a.id:e.tile!==position(a))fail('material is not accessible to '+a.name+'.');};
  const take=(e,n)=>{amount(n,'material quantity');if((e.quantity??1)+1e-8<n)fail('insufficient quantity of '+e.id+'.');e.quantity=Math.max(0,(e.quantity??1)-n);};
  const add=(a,k,n)=>{a[k]=Math.max(0,Math.min(rules.capacity[k],a[k]+n));};
  for(const e of entities.values()){e.tile=remap(e.tile);for(const observation of Object.values(e.observations||{}))observation.tile=remap(observation.tile);e.quantity??=1;amount(e.quantity,'existing quantity',true);}
  const movements=new Map();
  for(const a of people.values()){a.x+=west;a.y+=north;}
  for(const c of p.agents||[]){const a=person(c.id),to=c.position||a,distance=Math.abs(a.x-to.x)+Math.abs(a.y-to.y);if(!observer&&distance>rules.maxTravel)fail('travel exceeds '+rules.maxTravel+' tiles per day.');if(!observer&&distance*rules.travelEnergy>a.energy)fail('not enough energy to travel.');movements.set(a.id,distance);if(c.position){a.x=c.position.x;a.y=c.position.y;}}
  const changed=new Set(),entityIds=new Set([...(state.openWorld?.entityIds||[]),...oldEntities.keys()]);
  for(const change of p.entities||[]){if(changed.has(change.id))fail('each entity may have only one change per day.');changed.add(change.id);
   if(change.op==='remove'){continue;}
   if(change.op==='create'){if(entityIds.has(change.id))fail('entity IDs cannot be reused after depletion or deletion.');entityIds.add(change.id);}
   const old=entities.get(change.id),e={...(old||{}),...copy(change),quantity:old?.quantity??0};delete e.op;
   if(old&&!observer){if(change.carriedBy!==undefined&&change.carriedBy!==old.carriedBy)fail('use a transfer to change possession.');if(change.tile!=null&&change.tile!==old.tile)fail('use a transfer to move material.');}
   e.properties={...(old?.properties||{}),...(change.properties||{})};
   for(const key of ['massPerUnit','nourishment','hydration']){const before=key==='massPerUnit'&&old?(old.properties?.[key]??1):old?.properties?.[key],after=e.properties[key]??(key==='massPerUnit'?1:undefined);if(before!==undefined&&after!==before&&!observer)fail('established material properties cannot be rewritten: '+key);if(after!==undefined){amount(after,key,key!=='massPerUnit');if(key!=='massPerUnit'&&after>20)fail('a consumption yield exceeds the supported reserve scale.');}}
   entities.set(e.id,e);
  }
  const discovered=new Set();
  for(const t of list(p,'transactions')){
   reason(t.reason);
   if(t.kind==='encounter'){
    const e=entity(t.entity);if(oldEntities.has(e.id)||discovered.has(e.id)||e.structure)fail('encounters may introduce a new natural stock, not replenish existing stock or create a structure.');
    const a=person(t.actor);accessible(e,a);amount(t.amount,'encounter quantity');e.quantity+=t.amount;discovered.add(e.id);
   }else if(t.kind==='consume'){
    const a=person(t.actor),e=entity(t.entity);accessible(e,a);take(e,t.amount);add(a,'food',t.amount*(e.properties?.nourishment||0));add(a,'water',t.amount*(e.properties?.hydration||0));
   }else if(t.kind==='transform'){
    const a=person(t.actor);if(!Array.isArray(t.inputs)||!t.inputs.length||!Array.isArray(t.outputs)||!t.outputs.length)fail('transformation requires inputs and outputs.');let inputMass=0,outputMass=0;
    // Debit all inputs before crediting outputs: cycles cannot borrow future material.
    for(const i of t.inputs){const e=entity(i.entity);accessible(e,a);take(e,i.amount);inputMass+=i.amount*(e.properties?.massPerUnit??1);}
    for(const o of t.outputs){const e=entity(o.entity);accessible(e,a);amount(o.amount,'output quantity');outputMass+=o.amount*(e.properties?.massPerUnit??1);}
    if(!Number.isFinite(inputMass)||!Number.isFinite(outputMass)||outputMass>inputMass+1e-8)fail('a transformation creates material mass.');
    for(const o of t.outputs)entity(o.entity).quantity+=o.amount;
   }else if(t.kind==='transfer'){
    const a=person(t.actor),e=entity(t.entity);accessible(e,a);
    if(t.to==null){e.carriedBy=null;e.tile=position(a);}else{const recipient=person(t.to);if(position(recipient)!==position(a))fail('a recipient must be at the same place.');e.carriedBy=recipient.id;e.tile=position(recipient);}
   }else if(t.kind==='discard'){
    const a=person(t.actor),e=entity(t.entity);accessible(e,a);take(e,t.amount);
   }else if(t.kind==='observer'){
    if(!observer)fail('only an explicit observer intervention can create or remove stock externally.');const e=entity(t.entity);if(typeof t.amount!=='number'||!Number.isFinite(t.amount)||Math.abs(t.amount)>1e9||e.quantity+t.amount<0)fail('invalid observer quantity.');e.quantity+=t.amount;
   }else fail('unknown material transaction.');
   audit.push(copy(t));
  }
  for(const t of list(p,'reserveTransfers')){reason(t.reason);if(!['food','water'].includes(t.meter))fail('only nourishment and hydration can be provisioned.');const a=person(t.from);amount(t.amount,'provision quantity');let b;
   if(typeof t.to==='string'&&/^new:\d+$/.test(t.to)){const n=p.newPeople?.[Number(t.to.slice(4))];if(!n)fail('unknown newborn provision recipient.');b={tile:n.tile};}else b=person(t.to);
   if((b.tile??position(b))!==position(a))fail('provisions require people at the same place.');if(a[t.meter]<t.amount)fail('insufficient bodily provisions.');a[t.meter]-=t.amount;if(b.id!=null){if(b[t.meter]+t.amount>rules.capacity[t.meter])fail('provisions exceed recipient capacity.');b[t.meter]+=t.amount;}audit.push(copy(t));
  }
  for(const [index,n]of (p.newPeople||[]).entries())for(const meter of ['food','water']){const funded=(p.reserveTransfers||[]).filter(t=>t.to==='new:'+index&&t.meter===meter).reduce((sum,t)=>sum+t.amount,0);if(Math.abs(funded-n.condition[meter])>1e-8)fail('newborn reserves must be funded by explicit provisions.');}
  for(const c of p.agents||[]){const a=person(c.id);for(const [k,n]of Object.entries(c.delta||{})){if(!observer&&((k==='food'||k==='water')&&n>0))fail('reserve gains require consumption or a provision transfer.');if(!observer&&k==='energy'&&n>rules.maxRest)fail('rest exceeds the daily recovery budget.');if(!observer&&k==='health'&&n>rules.maxRecovery)fail('healing exceeds the daily recovery budget.');if(!observer&&n>0&&movements.get(a.id)>0)fail('travel and bodily recovery cannot share the same daily budget.');if(a[k]+n<0||a[k]+n>rules.capacity[k])fail('a bodily change exceeds capacity or available reserves.');a[k]+=n;}}
  const scheduled=copy(state.openWorld?.scheduledEffects||[]),effectIds=new Set([...(state.openWorld?.effectIds||[]),...scheduled.map(e=>e.id)]);
  for(const e of list(p,'scheduledEffects')){if(typeof e.id!=='string'||!e.id.trim()||effectIds.has(e.id))fail('scheduled effects require a unique ID.');person(e.actor);reason(e.reason);if(!Number.isInteger(e.dueDay)||e.dueDay<=day||e.dueDay>day+365)fail('effects must be dated 1 to 365 days after this outcome.');if(!e.delta||!Object.keys(e.delta).length)fail('an effect requires bodily changes.');for(const [k,n]of Object.entries(e.delta)){if(!Object.hasOwn(rules.capacity,k)||typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>rules.capacity[k])fail('invalid scheduled bodily change.');if((k==='food'||k==='water')&&n>0)fail('future reserve gains cannot bypass consumption.');if(k==='health'&&n>rules.maxRecovery||k==='energy'&&n>rules.maxRest)fail('scheduled recovery exceeds the daily budget.');}effectIds.add(e.id);scheduled.push(copy(e));}
  const due=scheduled.filter(e=>e.dueDay<=day),recovery=new Map();
  for(const e of due){const a=people.get(e.actor);if(!a?.alive)continue;for(const [k,n]of Object.entries(e.delta)){if(n>0){const key=e.actor+':'+k,total=(recovery.get(key)||Math.max(0,(p.agents||[]).find(c=>c.id===e.actor)?.delta?.[k]||0))+n;recovery.set(key,total);if(total>(k==='health'?rules.maxRecovery:rules.maxRest)||movements.get(a.id)>0)fail('combined scheduled recovery exceeds the daily budget.');}add(a,k,n);}audit.push({kind:'scheduled',...e});}
  for(const a of people.values())if(a.alive){const distance=movements.get(a.id)||0,before={health:a.health,energy:a.energy,food:a.food,water:a.water};add(a,'energy',-distance*rules.travelEnergy-rules.dailyEnergy);add(a,'food',-rules.dailyFood);add(a,'water',-rules.dailyWater);const damage=(a.food===0?rules.starvationDamage:0)+(a.water===0?rules.dehydrationDamage:0);add(a,'health',-damage);audit.push({kind:'upkeep',actor:a.id,food:a.food-before.food,water:a.water-before.water,energy:a.energy-before.energy,health:a.health-before.health,before,after:{health:a.health,energy:a.energy,food:a.food,water:a.water},causes:{ruleVersion:rules.version,dailyFood:rules.dailyFood,dailyWater:rules.dailyWater,dailyEnergy:rules.dailyEnergy,travelEnergy:distance*rules.travelEnergy,starvation:a.food===0?rules.starvationDamage:0,dehydration:a.water===0?rules.dehydrationDamage:0}});}
  for(const e of entities.values()){if(e.carriedBy!=null)e.tile=position(people.get(e.carriedBy)||person(e.carriedBy));amount(e.quantity,'resulting quantity',true);}
  for(const change of p.entities||[]){const e=entity(change.id);if(change.op==='remove'){if(e.quantity>1e-8)fail('stock must be consumed, transformed, discarded or removed by the observer before deleting its entity.');entities.delete(e.id);}else if(change.quantity!=null&&Math.abs(change.quantity-e.quantity)>1e-8)fail('declared quantity disagrees with the material ledger for '+e.id+'.');}
  for(const e of entities.values())if(!oldEntities.has(e.id)&&!discovered.has(e.id)&&!audit.some(t=>t.kind==='observer'&&t.entity===e.id||t.kind==='transform'&&t.outputs.some(o=>o.entity===e.id)))fail('a new entity needs an encounter, transformation or observer source.');
  for(const n of p.newPeople||[]){if(n.condition.health<=0)fail('a new living person needs positive health.');for(const [k,v]of Object.entries(n.condition))if(v>rules.capacity[k])fail('a newborn meter exceeds capacity.');}
  return {people,entities,entityIds:[...entityIds],effectIds:[...effectIds],scheduledEffects:scheduled.filter(e=>e.dueDay>day),audit};
 }
 root.PhysicalCore={rules,resolve};
 if(typeof module!=='undefined')module.exports=root.PhysicalCore;
})(typeof window!=='undefined'?window:globalThis);
