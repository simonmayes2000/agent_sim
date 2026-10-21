/* Engine-owned ordinary actions. Free-form attempts still go to the world author. */
(function(root){
'use strict';
const Physics=root.PhysicalCore||(typeof require==='function'?require('./physical-core.js'):null);
const copy=v=>JSON.parse(JSON.stringify(v));
const kinds=['move','rest','inspect','consume','wait','attempt'];
function validate(value){
 if(value==null)return null;
 const bad=()=>{throw Object.assign(Error('Choose a valid execution kind and bounded parameters; use attempt for novel actions.'),{code:'INVALID_EXECUTION'});};
 if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['kind','entity','amount'].includes(k))||!kinds.includes(value.kind))bad();
 if(value.kind!=='consume')return {kind:value.kind};
 if(value.entity!=null&&(typeof value.entity!=='string'||value.entity.length>120))bad();
 if(value.amount!=null&&(!Number.isFinite(value.amount)||value.amount<=0||value.amount>20))bad();
 if(value.kind==='consume'&&(!value.entity||value.amount==null))bad();
 return copy(value);
}
function compile(state,intentions,expansion={}){
 const outcome={summary:'Ordinary actions resolve under established world rules.',agents:[],transactions:[],speech:[]},novel=[],receipts=[],reserved=new Map();
 for(const i of intentions){
  const a=state.agents.find(a=>a.id===i.actor&&a.alive);if(!a)continue;
  const e=validate(i.execution),say=i.speech;
  if(typeof say==='string'&&say.trim())outcome.speech.push({actor:a.id,text:say});
  if(!e||e.kind==='attempt'){novel.push(i);continue;}
  const receipt={actor:a.id,kind:e.kind,result:''},change={id:a.id};
  if(e.kind==='move'){
   const d=i.destination;
   if(!d||d.x<0||d.y<0||d.x>=state.width||d.y>=state.height){receipt.result='Movement did not occur: choose a destination inside the represented map; extending the world needs a novel attempt.';}
   else {let x=a.x,y=a.y,budget=Math.min(Physics.rules.maxTravel,Math.floor(a.energy/Physics.rules.travelEnergy));while(budget-->0&&(x!==d.x||y!==d.y)){if(x!==d.x)x+=Math.sign(d.x-x);else y+=Math.sign(d.y-y);}change.position={x,y};receipt.result=x===a.x&&y===a.y?'Stayed in place; already at the destination or insufficient travel energy.':'Moved to ('+(x+(expansion?.west||0))+', '+(y+(expansion?.north||0))+').'+(x!==d.x||y!==d.y?' The destination remains farther away.':'');}
  }else if(e.kind==='rest'){
   const scheduled=(state.openWorld?.scheduledEffects||[]).filter(s=>s.actor===a.id&&s.dueDay<=state.day+1).reduce((n,s)=>n+Math.max(0,s.delta?.energy||0),0);
   const recovery=Math.max(0,Math.min(Physics.rules.maxRest-scheduled,Physics.rules.capacity.energy-a.energy));
   if(recovery)change.delta={energy:recovery};receipt.result='Rested, recovering '+recovery+' energy before daily upkeep.';
  }else if(e.kind==='consume'){
   const source=(state.openWorld?.entities||[]).find(s=>s.id===e.entity),known=(root.RefereeWorld||(typeof require==='function'?require('./referee-world.js'):null)).perception(state,a).entities.find(s=>s.id===e.entity&&s.present!==false);
   const properties=known?.knownProperties||{};
   if(!source||!known||!(Object.hasOwn(properties,'nourishment')||Object.hasOwn(properties,'hydration'))){receipt.result='Consumption did not occur: the material or its consumption properties are not personally established. Testing an unfamiliar material requires a novel attempt.';}
   else if(source.carriedBy!=null?source.carriedBy!==a.id:source.tile!==a.y*state.width+a.x){receipt.result='Consumption did not occur: the material is not accessible here.';}
   else if((source.quantity??1)-(reserved.get(source.id)||0)<e.amount){receipt.result='Consumption did not occur: insufficient remaining material.';}
   else{reserved.set(source.id,(reserved.get(source.id)||0)+e.amount);outcome.transactions.push({kind:'consume',actor:a.id,entity:source.id,amount:e.amount,reason:a.name+' consumed '+e.amount+' units of an established local material.'});receipt.result='Consumed '+e.amount+' units of '+source.name+'.';}
  }else if(e.kind==='inspect')receipt.result='Inspected the current surroundings; the personal sensory snapshot records visible facts. Searching for new materials or testing hidden properties requires a novel attempt.';
  else receipt.result='Waited; established physical processes continue.';
  if(Object.keys(change).length>1)outcome.agents.push(change);
  receipts.push(receipt);
 }
 outcome.summary=receipts.map(r=>state.agents.find(a=>a.id===r.actor).name+': '+r.result).join(' ')||outcome.summary;
 for(const key of ['agents','transactions','speech'])if(!outcome[key].length)delete outcome[key];
 return {outcome,novel,receipts};
}
function merge(base,authored){
 const out=copy(authored);
 // Routine changes are immutable; a model cannot cancel an executed ordinary action.
 const west=authored.expand?.west||0,north=authored.expand?.north||0;
 for(const key of ['agents','transactions','speech']){
  const rows=copy(base[key]||[]),extra=copy(authored[key]||[]);
  if(key==='agents')for(const c of rows)if(c.position){c.position.x+=west;c.position.y+=north;}
  if(key==='agents')for(const c of extra){const prior=rows.find(r=>r.id===c.id);if(prior){for(const field of ['position','delta'])if(prior[field]&&c[field])throw Error('Authored changes conflict with an engine-owned routine '+field+'.');Object.assign(prior,c);}else rows.push(c);}
  else rows.push(...extra);
  if(rows.length)out[key]=rows;
 }
 return out;
}
root.RoutineActions={validate,compile,merge,kinds};if(typeof module!=='undefined')module.exports=root.RoutineActions;
})(typeof window!=='undefined'?window:globalThis);
