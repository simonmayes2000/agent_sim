/* Personal evidence is stored independently of physical truth. No remote refresh on read. */
(function(root){
 'use strict';
 const copy=v=>JSON.parse(JSON.stringify(v));
 const fail=message=>{throw Error('Knowledge rule: '+message);};
 const place=(state,a)=>a.y*state.width+a.x;
 const nearby=(a,b)=>a.alive&&b.alive&&Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=2;
 const factKey=(subject,id,kind,sourceActor=null)=>JSON.stringify([subject,String(id),kind,...(kind==='hearsay'&&subject!=='experience'?[sourceActor]:[])]);
 const entries=a=>Object.values(a.perceptionMemory?.facts||{});
 const find=(a,subject,id,kinds=['observation','legacy','hearsay'])=>kinds.map(kind=>kind==='hearsay'?entries(a).filter(r=>r.kind===kind&&r.subject===subject&&r.subjectId===String(id)).sort((x,y)=>(y.day??-1)-(x.day??-1)||Number(y.id.split(':e')[1])-Number(x.id.split(':e')[1]))[0]:a.perceptionMemory?.facts?.[factKey(subject,id,kind)]).find(Boolean);
 function put(a,state,{subject,subjectId,value,kind='observation',day=state.day,tile=place(state,a),observedDay=day,sourceActor=null,sourceName=null,sourceRecordId=null,reason=null}){
  const m=a.perceptionMemory; m.references||={};const key=factKey(subject,subjectId,kind,sourceActor),old=m.facts[key];
  const record={subject,subjectId:String(subjectId),value:copy(value),kind,observer:a.id,day,tile,observedDay,sourceActor,sourceName,sourceRecordId,reason};
  if(old&&reason==null&&old.day===day&&old.tile===tile&&JSON.stringify(old.value)===JSON.stringify(record.value))record.reason=old.reason;
  if(old&&JSON.stringify({...old,id:undefined})===JSON.stringify(record))return old;
  for(const id of [sourceRecordId,...(value.evidenceIds||[]),...Object.values(value.propertyEvidence||{}).map(e=>e.recordId)].filter(Boolean)){const source=Object.values(m.facts).find(r=>r.id===id)||m.records.find(r=>r.id===id)||m.references[id];if(source)m.references[id]=copy(source);}
  if(subject==='entity'&&record.value.knownProperties){record.value.propertyEvidence||={};for(const key of Object.keys(record.value.knownProperties))record.value.propertyEvidence[key]||={kind:'legacy',observer:a.id,observedDay:null};}
  record.id=a.id+':e'+m.nextId++;m.facts[key]=record;m.records.push(record);
  // Latest facts persist separately when old audit entries fall out of this local window.
  m.records=m.records.slice(-400);return record;
 }
 function initialize(state){
  for(const a of state.agents){if(a.perceptionMemory?.version===1){a.perceptionMemory.references||={};continue;}
   a.perceptionMemory={version:1,nextId:1,facts:{},records:[],references:{}};
   for(const i of a.seenTiles||[]){const saved=a.exploration?.ground?.[i],value={tile:i,type:saved?.revision>0?saved.type:'unknown (previously visited)',description:'Imported from an older save; no dated observation was recorded.'};put(a,state,{subject:'place',subjectId:i,value,kind:'legacy',day:null,tile:i,observedDay:null});}
   for(const e of state.openWorld?.entities||[]){const saved=e.observations?.[a.id];if(saved){const value={id:e.id,name:saved.name,appearance:saved.appearance,tile:saved.tile,quantity:saved.quantity,knownProperties:saved.knownProperties||{}};put(a,state,{subject:'entity',subjectId:e.id,value,kind:'legacy',day:saved.observedDay??null,tile:saved.tile??null,observedDay:saved.observedDay??null});}
    else if(e.knownBy?.includes(a.id)){put(a,state,{subject:'entity',subjectId:e.id,kind:'legacy',day:null,tile:null,observedDay:null,value:{id:e.id,name:'Previously encountered object',appearance:'No dated appearance or location was saved.',knownProperties:e.knowledge?.[a.id]||{}}});}}
   for(const id of a.knowledge||[]){const d=state.tech?.nodes?.find(n=>n.id===id);if(d)put(a,state,{subject:'discovery',subjectId:id,value:{id:d.id,name:d.name,detail:d.detail},kind:'legacy',day:null,tile:null,observedDay:null});}
   for(const [i,e]of (a.experiences||[]).entries())put(a,state,{subject:'experience',subjectId:'legacy:'+i,value:{text:e.text},kind:'legacy',day:e.day??null,tile:null,observedDay:e.day??null});
  }
 }
 function visible(state,a,e,inspect=false){return a.alive&&(e.carriedBy===a.id||e.carriedBy==null&&e.tile===place(state,a))&&(inspect||e.concealed!==true);}
 function snapshot(e,properties,propertyEvidence={}){return {id:e.id,name:e.name,appearance:e.description,tile:e.tile,quantity:e.quantity??1,carriedBy:e.carriedBy??null,present:true,knownProperties:properties||{},propertyEvidence};}
 function refresh(state,actors=null){
  initialize(state);
  for(const a of state.agents.filter(a=>a.alive&&(!actors||actors.includes(a.id)))){
   const i=place(state,a),t=state.tiles[i];
   put(a,state,{subject:'body',subjectId:'self',value:{condition:{health:a.health,energy:a.energy,nourishment:a.food,hydration:a.water,sensations:[...(a.food<=1?['I am very hungry.']:a.food<=3?['I feel hungry.']:[]),...(a.water<=1?['I am very thirsty.']:a.water<=3?['I feel thirsty.']:[]),...(a.health<80?['I feel physically weaker.']:[]),...(a.energy<15?['I feel exhausted.']:[])]},states:(a.worldStates||[]).filter(s=>s.perceived!==false).map(s=>({name:s.name,description:s.description}))}});
   put(a,state,{subject:'people',subjectId:'nearby',value:state.agents.filter(b=>b.id!==a.id&&nearby(a,b)).map(b=>({id:b.id,name:b.name}))});
   put(a,state,{subject:'place',subjectId:i,value:{tile:i,type:t?.type||'unresolved ground',description:t?.description||''}});
   const seen=new Set();
   for(const e of state.openWorld?.entities||[])if(visible(state,a,e)){
    const old=find(a,'entity',e.id,['observation','legacy']);seen.add(e.id);
    put(a,state,{subject:'entity',subjectId:e.id,value:snapshot(e,old?.value.knownProperties||{},old?.value.propertyEvidence||{})});
   }
   // Absence at the remembered place is perceptible; the cause and new location are not.
   for(const old of entries(a).filter(r=>r.subject==='entity'&&['observation','legacy'].includes(r.kind))){
    if(old.value.tile!==i||seen.has(old.subjectId)||old.value.present===false)continue;
    const value={...old.value,present:false,lastSeenDay:old.observedDay};delete value.quantity;delete value.carriedBy;
    put(a,state,{subject:'entity',subjectId:old.subjectId,value});
   }
  }
 }
 function remap(state,west,north,width){
  if(!west&&!north&&width===state.width)return;
  const index=i=>i==null?null:(Math.floor(i/state.width)+north)*width+i%state.width+west;
  for(const a of state.agents){const m=a.perceptionMemory;if(!m)continue;
   const change=r=>{r.tile=index(r.tile);if(r.subject==='place')r.subjectId=String(index(Number(r.subjectId)));if(r.value?.tile!=null)r.value.tile=index(r.value.tile);for(const e of Object.values(r.value?.propertyEvidence||{}))if(e.tile!=null)e.tile=index(e.tile);return r;};
   // Separate copies: the persisted fact and audit log may reference the same object before JSON reload.
   m.records=m.records.map(r=>change(copy(r)));m.references=Object.fromEntries(Object.entries(m.references||{}).map(([id,r])=>[id,change(copy(r))]));m.facts=Object.fromEntries(Object.values(m.facts).map(r=>{const v=change(copy(r));return [factKey(v.subject,v.subjectId,v.kind,v.sourceActor),v];}));
  }
 }
 function evidence(record,state,a){return {recordId:record.id,kind:record.kind,observer:record.observer,observedDay:record.observedDay,receivedDay:record.day,tile:record.tile,sourceActor:record.sourceActor,sourceName:record.sourceName,sourceRecordId:record.sourceRecordId,current:record.kind==='observation'&&record.day===state.day&&record.tile===place(state,a)};}
 function perception(state,a){
  // Migration/initial capture on copies makes reads pure, including old saves.
  if(a.perceptionMemory?.version!==1){const next=copy(state);refresh(next);return perception(next,next.agents.find(p=>p.id===a.id));}
  const facts=entries(a),pick=subject=>{const ids=[...new Set(facts.filter(r=>r.subject===subject).map(r=>r.subjectId))];return ids.map(id=>find(a,subject,id));};
  const project=r=>({...copy(r.value),evidence:evidence(r,state,a)});
  const entities=pick('entity').map(r=>{const value=project(r);if(r.kind==='hearsay'){value.reportedProperties=value.knownProperties;value.reportedPropertyEvidence=value.propertyEvidence||{};value.knownProperties={};value.propertyEvidence={};}return value;});
  const current=find(a,'place',place(state,a)),body=find(a,'body','self'),people=find(a,'people','nearby');
  return {continuity:(root.Continuity||(typeof require==='function'?require('./continuity.js'):null)).view(a,state.day),day:state.day,name:a.name,condition:copy(body?.value.condition||{health:0,energy:0,nourishment:0,hydration:0}),position:{x:a.x,y:a.y},visibleGround:current?project(current):{tile:place(state,a),type:'unknown ground'},nearbyPeople:copy(people?.value||[]),knownPlaces:pick('place').map(project),entities,experiences:facts.filter(r=>r.subject==='experience').slice(-14).map(r=>({day:r.day,text:r.value.text,evidence:evidence(r,state,a)})),discoveries:pick('discovery').map(project),goal:a.goal?{title:a.goal.title,reason:a.goal.reason,next:a.goal.next}:null,states:copy(body?.value.states||[]),traits:copy(a.genes||{}),reports:facts.filter(r=>r.kind==='hearsay'&&r.subject!=='experience').slice(-10).map(r=>({subject:r.subject,subjectId:r.subjectId,value:copy(r.value),evidence:evidence(r,state,a)})),inferences:facts.filter(r=>r.kind==='inference').slice(-10).map(r=>({claim:r.value.claim,evidenceIds:copy(r.value.evidenceIds),evidence:evidence(r,state,a)}))};
 }
 function recordExperience(state,actor,text){initialize(state);const a=state.agents.find(a=>a.id===actor);if(a)put(a,state,{subject:'experience',subjectId:'result:'+state.day+':'+actor,kind:'observation',value:{text}});}
 function hear(state,actor,text){
  initialize(state);const from=state.agents.find(a=>a.id===actor);if(!from?.alive)return;
  for(const a of state.agents)if(a.id!==actor&&nearby(from,a))put(a,state,{subject:'experience',subjectId:'speech:'+state.day+':'+actor+':'+a.perceptionMemory.nextId,kind:'hearsay',observedDay:state.day,sourceActor:actor,sourceName:from.name,value:{text:'I heard '+from.name+' say: '+text}});
 }
 function resolve(state,p,physical){
  const next=copy(state);refresh(next);
  const west=p.expand?.west||0,north=p.expand?.north||0,width=state.width+west+(p.expand?.east||0),height=state.height+north+(p.expand?.south||0);
  remap(next,west,north,width);
  next.tiles=Array.from({length:width*height},()=>({type:'unresolved ground',description:'Ground beyond the previously represented horizon.'}));
  for(let i=0;i<state.tiles.length;i++)next.tiles[(Math.floor(i/state.width)+north)*width+i%state.width+west]=copy(state.tiles[i]);
  next.width=width;next.height=height;next.day++;
  for(const t of p.terrain||[])Object.assign(next.tiles[t.tile],{type:t.type||next.tiles[t.tile].type,description:t.description||''});
  next.openWorld.entities=[...physical.entities.values()].map(copy);
  for(const a of next.agents){const body=physical.people.get(a.id);for(const k of ['x','y','health','energy','food','water'])a[k]=body[k];a.alive=a.alive&&a.health>0;const c=p.agents?.find(c=>c.id===a.id);if(c?.states)a.worldStates=copy(c.states);}
  refresh(next);
  const person=id=>{const a=next.agents.find(a=>a.id===id);if(!a?.alive)fail('learning and communication require a living person.');return a;};
  const entity=id=>{const e=next.openWorld.entities.find(e=>e.id===id);if(!e)fail('observation evidence does not exist.');return e;};
  const learn=(actor,id,properties,reason,inspect=false)=>{const a=person(actor),e=entity(id);if(!visible(next,a,e,inspect))fail('properties cannot be learned from an unobserved distant or concealed object.');if(!properties||typeof properties!=='object'||Array.isArray(properties))fail('learned properties must be an object.');const old=find(a,'entity',id,['observation','legacy']),propertyEvidence=copy(old?.value.propertyEvidence||{});for(const key of Object.keys(properties))propertyEvidence[key]={kind:'observation',observer:a.id,observedDay:next.day,tile:place(next,a),recordId:a.id+':e'+a.perceptionMemory.nextId};return put(a,next,{subject:'entity',subjectId:id,value:snapshot(e,{...(old?.value.knownProperties||{}),...copy(properties)},propertyEvidence),reason});};
  for(const o of p.observations||[]){if(typeof o.reason!=='string'||!o.reason.trim())fail('an observation needs an explanation.');learn(o.actor,o.entity,o.properties||{},o.reason,true);}
  // Compatibility with the old outcome schema, now constrained to local observation.
  for(const e of p.entities||[])for(const [actor,properties]of Object.entries(e.knowledge||{}))learn(Number(actor),e.id,properties,'Referee-resolved local learning.');
  for(const d of p.discoveries||[]){const existing=state.tech?.nodes?.find(n=>n.id===d.id);if(existing&&(existing.name!==d.name||existing.detail!==d.detail))fail('a discovery ID cannot redefine an established concept.');
   for(const id of d.learners||[]){const a=person(id),sources=d.entityIds||[],ids=d.evidenceIds||[];if(!Array.isArray(ids))fail('discovery evidenceIds must be an array.');const own=[...entries(a),...a.perceptionMemory.records,...Object.values(a.perceptionMemory.references||{})];for(const recordId of ids)if(!own.some(r=>r.id===recordId&&['observation','legacy'].includes(r.kind)))fail('a discovery requires personally observed evidence, not a report or hypothesis.');
    if(sources.length){for(const source of sources){const e=entity(source);if(!visible(next,a,e)&&!find(a,'entity',source,['observation','legacy']))fail('a discovery requires the learner\'s own evidence.');}}
    else if(!ids.length&&(!d.evidence||d.evidence.tile!==place(next,a)||typeof d.evidence.reason!=='string'||!d.evidence.reason.trim()))fail('a discovery without object evidence needs a local observation and reason.');
    put(a,next,{subject:'discovery',subjectId:d.id,value:{id:d.id,name:d.name,detail:d.detail},sourceRecordId:ids[0]||(sources.length?find(a,'entity',sources[0],['observation','legacy'])?.id:find(a,'place',place(next,a))?.id)||null,reason:d.evidence?.reason||'Established from personally observed evidence.'});
   }
  }
  for(const c of p.agents||[])if(c.experience){const a=next.agents.find(a=>a.id===c.id);put(a,next,{subject:'experience',subjectId:'outcome:'+next.day,value:{text:c.experience},reason:'Referee-resolved personal experience.'});}
  for(const s of p.speech||[])if(next.agents.find(a=>a.id===s.actor)?.alive)hear(next,s.actor,s.text);
  for(const report of p.reports||[]){const from=person(report.from),to=person(report.to),speech=p.speech?.[report.speech];
   if(from.id===to.id||!nearby(from,to)||!Number.isInteger(report.speech)||!speech||speech.actor!==from.id)fail('a report requires an actual audible statement by its source.');
   if(!['entity','place','discovery'].includes(report.subject))fail('unsupported report subject.');
   const source=find(from,report.subject,report.subjectId);if(!source)fail('a speaker cannot report a fact they have never observed or heard.');
   const value=copy(source.value);
   if(report.subject==='entity'){const properties={};if(report.propertyKeys!=null&&!Array.isArray(report.propertyKeys))fail('report propertyKeys must be an array.');for(const key of report.propertyKeys||[]){if(typeof key!=='string'||!Object.hasOwn(value.knownProperties||{},key))fail('a report cannot reveal a property unknown to its speaker.');properties[key]=copy(value.knownProperties[key]);}value.knownProperties=properties;value.propertyEvidence=Object.fromEntries(Object.keys(properties).filter(k=>value.propertyEvidence?.[k]).map(k=>[k,copy(value.propertyEvidence[k])]));}
   put(to,next,{subject:report.subject,subjectId:report.subjectId,value,kind:'hearsay',observedDay:source.observedDay,sourceActor:from.id,sourceName:from.name,sourceRecordId:source.id,reason:'Reported in an audible statement.'});
  }
  for(const inference of p.inferences||[]){const a=person(inference.actor),ids=inference.evidenceIds;
   if(typeof inference.claim!=='string'||!inference.claim.trim()||!Array.isArray(ids)||!ids.length)fail('an inference needs a claim and personal evidence IDs.');
   const own=new Set([...entries(a),...a.perceptionMemory.records,...Object.values(a.perceptionMemory.references||{})].map(r=>r.id));for(const id of ids)if(!own.has(id))fail('an inference cannot cite another person\'s private evidence.');
   put(a,next,{subject:'inference',subjectId:'inference:'+a.perceptionMemory.nextId,kind:'inference',observedDay:null,value:{claim:inference.claim,evidenceIds:copy(ids)}});
  }
  return new Map(next.agents.map(a=>[a.id,a.perceptionMemory]));
 }
 root.Knowledge={initialize,refresh,perception,resolve,remap,hear,recordExperience};
 if(typeof module!=='undefined')module.exports=root.Knowledge;
})(typeof window!=='undefined'?window:globalThis);
