/* IndexedDB checkpoint archive. Stored outcomes and snapshots never call a model on replay. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
function validate(s){
 if(!s||![1,2,3].includes(s.version)||!Number.isInteger(s.day)||s.day<1||!Number.isInteger(s.width)||!Number.isInteger(s.height)||s.width<1||s.height<1||s.width*s.height>100000||!Array.isArray(s.tiles)||s.tiles.length!==s.width*s.height||!Array.isArray(s.agents)||!s.agents.length)throw Error('Invalid or unsupported world save. Original save retained.');
 const ids=new Set();for(const a of s.agents){if(!Number.isInteger(a.id)||ids.has(a.id)||!Number.isInteger(a.x)||!Number.isInteger(a.y)||a.x<0||a.y<0||a.x>=s.width||a.y>=s.height)throw Error('Invalid saved inhabitant.');ids.add(a.id);}
 return copy(s);
}
function checksum(value){let h=2166136261;for(const c of JSON.stringify(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
function seal(value){return {format:'first-world-archive',version:1,value:copy(value),checksum:checksum(value)};}
function unseal(envelope){if(envelope?.format!=='first-world-archive'||envelope.version!==1||checksum(envelope.value)!==envelope.checksum)throw Error('Archive integrity check failed.');validate(envelope.value.state);if(typeof envelope.value.runId!=='string'||envelope.value.runId.length>160)throw Error('Invalid archive run identity.');const value=copy(envelope.value);value.metrics=metrics(value.state);return value;}
function metrics(s){const alive=s.agents.filter(a=>a.alive);return {day:s.day,population:alive.length,births:s.agents.filter(a=>a.born>1).length,deaths:s.agents.filter(a=>!a.alive).length,meanHealth:alive.length?Math.round(alive.reduce((n,a)=>n+a.health,0)/alive.length):0,discoveries:s.tech?.nodes?.length||0,verifiedTransfers:s.evaluation?.transfers||0,completedGoals:s.evaluation?.completedGoals??s.agents.reduce((n,a)=>n+(a.goalHistory||[]).filter(g=>g.status==='complete').length,0),reportedBrokenPromises:s.agents.reduce((n,a)=>n+(a.continuity?.commitments||[]).filter(c=>c.status==='broken').length,0),reportedMistakenBeliefs:s.agents.reduce((n,a)=>n+(a.continuity?.beliefs||[]).filter(b=>b.assessment==='contradicted').length,0),explored:s.explored?.length||0};}
function create(indexedDB){let opening,queue=Promise.resolve();
 function db(){return opening||(opening=new Promise((resolve,reject)=>{const r=indexedDB.open('first-world-archive',1);r.onupgradeneeded=()=>{r.result.createObjectStore('checkpoints',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Archive database is blocked by another tab.'));}));}
 async function transaction(mode,action){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('checkpoints',mode),r=action(tx.objectStore('checkpoints'));let value;r.onsuccess=()=>{value=r.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Archive transaction aborted'));});}
 return {save(value){const entry=seal(value),id=value.runId+':'+String(value.state.day).padStart(9,'0')+':'+value.sequence;const task=queue.then(()=>transaction('readwrite',s=>s.add({id,...entry})));queue=task.catch(()=>{});return task;},async list(){await queue;const rows=await transaction('readonly',s=>s.getAll());return rows.map(r=>({id:r.id,...unseal(r)}));},async get(id){await queue;const row=await transaction('readonly',s=>s.get(id));if(!row)throw Error('Checkpoint not found.');return unseal(row);}};
}
root.WorldArchive={validate,checksum,seal,unseal,metrics,create};if(typeof module!=='undefined')module.exports=root.WorldArchive;
})(typeof window!=='undefined'?window:globalThis);
