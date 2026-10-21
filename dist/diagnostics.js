/* Observer-only diagnostics: never included in an inhabitant's context or world save. */
(function(root){
'use strict';
const KEY='first-world-diagnostics-v1',MAX=2000000;
function clean(value,depth=0){
 if(depth>30)return '[depth limit]';if(value instanceof Error)return clean({name:value.name,message:value.message,code:value.code,phase:value.phase,stack:value.stack},depth+1);
 if(typeof value==='string')return value.replace(/Bearer\s+[^\s"']+/gi,'Bearer [redacted]').replace(/\bsk-[A-Za-z0-9_-]{12,}/g,'[redacted key]');
 if(Array.isArray(value))return value.map(v=>clean(v,depth+1));if(value&&typeof value==='object'){const out={};for(const [k,v]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))continue;out[k]=/^(authorization|cookie|set-cookie|api[-_]?key|access[-_]?token|refresh[-_]?token|password|secret)$/i.test(k)?'[redacted]':clean(v,depth+1);}return out;}return value;
}
function bounded(value,limit){const data=clean(value),raw=JSON.stringify(data);return raw?.length>limit?{truncated:true,originalCharacters:raw.length,preview:raw.slice(0,limit)}:data;}
function create({storage,now=()=>new Date().toISOString(),id=()=>Math.random().toString(36).slice(2),onError=()=>{}}={}){
 let attempts=[],storageError=null;try{const saved=JSON.parse(storage?.getItem(KEY)||'null');if(saved?.version===1&&Array.isArray(saved.attempts))attempts=saved.attempts.slice(-4);}catch(error){storageError='Previous diagnostic log could not be read: '+error.message;}
 function persist(){try{let raw=JSON.stringify({version:1,attempts});while(raw.length>MAX&&attempts.length>1){attempts.shift();raw=JSON.stringify({version:1,attempts});}if(raw.length>MAX){const a=attempts[0];a.truncated=true;while(JSON.stringify({version:1,attempts}).length>MAX&&a.events.length>1)a.events.shift();}storage?.setItem(KEY,JSON.stringify({version:1,attempts}));}catch(error){storageError='Diagnostic storage failed: '+error.message;onError(storageError);}}
 function event(attempt,type,data){const a=attempts.find(a=>a.id===attempt);if(!a)return;a.events.push({time:now(),type,data:bounded(data,220000)});if(a.events.length>100){a.events.shift();a.truncated=true;}persist();}
 function start(state,observer){const snapshot=JSON.parse(JSON.stringify(state));delete snapshot.lastTransition;const a={id:id(),started:now(),day:state.day,resolvingDay:state.day+1,status:'running',clientBuild:'diagnostics-v1',runId:state.experiment?.runId,before:bounded(snapshot,650000),observerRequest:bounded(observer,10000),events:[]};attempts.push(a);attempts=attempts.slice(-4);persist();return a.id;}
 function finish(attempt,status,data){const existing=attempts.find(a=>a.id===attempt);if(existing&&existing.status!=='running')return;event(attempt,'attempt.'+status,data);const a=attempts.find(a=>a.id===attempt);if(a){a.status=status;a.finished=now();persist();}}
 function bundle(state,extra={}){return {format:'first-world-bug-report',version:1,exported:now(),storageError,retention:'Latest four attempts, at most 2 MB persisted. Oversized entries are explicitly truncated. Current world is included in full.',...clean(extra),attempts:clean(attempts),currentWorld:clean(state)};}
 return {start,event,finish,bundle};
}
root.WorldDiagnostics={create,clean};if(typeof module!=='undefined')module.exports=root.WorldDiagnostics;
})(typeof window!=='undefined'?window:globalThis);
