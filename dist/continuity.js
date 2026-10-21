/* Private, agent-authored continuity. No world facts or resource authority. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
function validate(value,view){
 if(value==null)return null;
 const fail=()=>{throw Error('Invalid personal reflection or communication.');};
 if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['preferences','beliefs','commitments','messages'].includes(k)))fail();
 const out={},evidence=new Set([...(view.entities||[]),...(view.experiences||[]),...(view.discoveries||[]),...(view.knownPlaces||[]),...(view.reports||[]),...(view.inferences||[])].map(x=>x.evidence?.recordId).filter(Boolean));for(const r of view.continuity?.evidence||[])evidence.add(r.id);
 for(const [kind,rows]of Object.entries(value)){
  if(!Array.isArray(rows)||rows.length>8)fail();out[kind]=[];
  for(const r of rows){
   const keys=kind==='beliefs'?['id','text','confidence','evidenceIds','prediction','reviewDay','assessment']:kind==='commitments'?['id','text','to','dueDay','status']:kind==='messages'?['to','text','kind','offerId']:['id','text','reason'];
   if(!r||typeof r!=='object'||Object.keys(r).some(k=>!keys.includes(k)))fail();
   if(typeof r.text!=='string'||!r.text.trim()||r.text.length>600)fail();
   if(kind!=='messages'&&(typeof r.id!=='string'||!/^[-\w]{1,80}$/.test(r.id)))fail();
   if(r.to!=null&&!(view.nearbyPeople||[]).some(p=>p.id===r.to))fail();
   if(kind==='messages'&&(!Number.isInteger(r.to)||!['message','offer','accept','decline'].includes(r.kind)))fail();
   if(kind==='messages'){if(r.kind!=='message'&&(typeof r.offerId!=='string'||!/^[-\w]{1,80}$/.test(r.offerId)))fail();if(['accept','decline'].includes(r.kind)&&!(view.continuity?.inbox||[]).some(m=>m.kind==='offer'&&m.from===r.to&&m.offerId===r.offerId))fail();}
   if(kind==='beliefs'){
    if(!Number.isFinite(r.confidence)||r.confidence<0||r.confidence>1||!Array.isArray(r.evidenceIds)||r.evidenceIds.some(id=>!evidence.has(id)))fail();
    if(r.assessment&&!['untested','supported','contradicted','uncertain'].includes(r.assessment))fail();
    if(r.assessment&&r.assessment!=='untested'&&!r.evidenceIds.length)fail();
   }
   for(const k of ['dueDay','reviewDay'])if(r[k]!=null&&(!Number.isInteger(r[k])||r[k]<view.day))fail();
   if(r.status&&!['promised','fulfilled','broken','withdrawn'].includes(r.status))fail();
   for(const v of Object.values(r))if(typeof v==='string'&&v.length>600)fail();
   out[kind].push(copy(r));
  }
 }
 return out;
}
function full(a){return copy(a.continuity||{version:1,preferences:[],beliefs:[],commitments:[],episodes:[],inbox:[]});}
function view(a,day){const c=full(a);c.dueCommitments=c.commitments.filter(c=>c.status==='promised'&&c.dueDay!=null&&c.dueDay<=day).map(c=>c.id);c.duePredictions=c.beliefs.filter(b=>b.reviewDay!=null&&b.reviewDay<=day).map(b=>b.id);c.episodes=c.episodes.slice(-12);c.inbox=c.inbox.slice(-12);const ids=new Set(c.beliefs.flatMap(b=>b.evidenceIds||[]));c.evidence=Object.values(a.perceptionMemory?.references||{}).filter(r=>ids.has(r.id)).slice(-32).map(copy);return c;}
function apply(before,next,intentions){
 for(const i of intentions){const a=next.agents.find(a=>a.id===i.actor),old=before.agents.find(a=>a.id===i.actor);if(!a||!old)continue;
  const c=a.continuity=full(old),r=i.reflection||{};
  for(const kind of ['preferences','beliefs','commitments'])for(const item of r[kind]||[]){const prior=c[kind].find(x=>x.id===item.id);if(prior){c.episodes.push({day:next.day,kind:'revision',category:kind,previous:copy(prior)});Object.assign(prior,item,{updatedDay:next.day});}else c[kind].push({...item,createdDay:next.day,updatedDay:next.day});c[kind]=c[kind].slice(-24);}
  for(const belief of r.beliefs||[])for(const id of belief.evidenceIds||[]){const memory=a.perceptionMemory;if(memory){const rec=Object.values(memory.facts||{}).find(x=>x.id===id)||(memory.records||[]).find(x=>x.id===id);if(rec){memory.references||={};memory.references[id]=copy(rec);}}}
  c.episodes.push({day:next.day,kind:'attempt',action:i.action,reason:i.reason,goal:i.goal?.title});c.episodes=c.episodes.slice(-80);
 }
 for(const i of intentions)for(const m of i.reflection?.messages||[]){
  const from=next.agents.find(a=>a.id===i.actor),to=next.agents.find(a=>a.id===m.to);if(!from?.alive||!to?.alive||Math.abs(from.x-to.x)+Math.abs(from.y-to.y)>2)continue;
  const entry={...copy(m),from:from.id,day:next.day,id:next.day+':'+from.id+':'+(next.events.length)};
  to.continuity=to.continuity||view(to);to.continuity.inbox.push(entry);to.continuity.inbox=to.continuity.inbox.slice(-40);
  (root.Knowledge||(typeof require==='function'?require('./knowledge.js'):null))?.hear(next,from.id,m.text);
  next.events.push({day:next.day,type:'speech',who:from.name,text:m.text,to:to.id,communicationKind:m.kind,agentAuthored:true});
 }
}
root.Continuity={validate,view,apply};if(typeof module!=='undefined')module.exports=root.Continuity;
})(typeof window!=='undefined'?window:globalThis);
