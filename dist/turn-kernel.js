/* Model IO prepares commands. A versioned, synchronous transaction alone commits time. */
(function(root){
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v));
const World=()=>root.RefereeWorld||(typeof require==='function'?require('./referee-world.js'):null);
function version(s){const raw=JSON.stringify({day:s.day,seed:s.seed,width:s.width,height:s.height,weather:s.weather,weatherDescription:s.weatherDescription,tiles:s.tiles,agents:s.agents,tech:s.tech,clans:s.clans,entities:s.openWorld?.entities,laws:s.openWorld?.laws,processes:s.openWorld?.processes,scheduledEffects:s.openWorld?.scheduledEffects});let h=2166136261;for(let i=0;i<raw.length;i++)h=Math.imul(h^raw.charCodeAt(i),16777619);return (h>>>0).toString(16)+':'+raw.length;}
function bounded(work,ms,{signal}={}){return new Promise((resolve,reject)=>{const controller=new AbortController();let settled=false,timer;
 const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(error){controller.abort();reject(error);}else resolve(value);};
 const abort=()=>finish(new DOMException('Turn cancelled','AbortError'));
 if(signal?.aborted)return abort();signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>finish(Object.assign(Error('The preparation deadline expired; no command was accepted.'),{code:'TURN_DEADLINE',failureKind:'timeout'})),Math.max(1,ms));
 Promise.resolve().then(()=>work(controller.signal)).then(value=>finish(null,value),error=>finish(error));
 });}
function fault(error,actor,stage='request'){
 const semantic=stage==='validation'||error.failureKind==='invalid-response'||/^(INVALID_|UNKNOWN_|INTENTION_|INHABITANT_)/.test(error.code||'');
 return {actor,status:semantic?'rejected':error.code==='TURN_DEADLINE'?'timed-out':'unavailable',failureKind:semantic?'invalid-response':error.failureKind||'infrastructure',code:error.code||null,reason:String(error.message||error).slice(0,600)};
}
async function collect(actors,ask,parse,{current=()=>true,signal,deadlineMs=12000,onAccepted=()=>{},onFault=()=>{}}={}){
 const results=await Promise.all(actors.map(async actor=>{let stage='request';try{const value=await bounded(s=>ask(actor,s),deadlineMs,{signal});if(!current())throw new DOMException('World attempt replaced','AbortError');stage='validation';const command=parse(value,actor);onAccepted(command);return {command};}catch(error){if(signal?.aborted||!current())throw new DOMException('World attempt replaced','AbortError');const failure=fault(error,actor.id,stage);onFault(failure);return {failure};}}));
 if(!current())throw new DOMException('World attempt replaced','AbortError');return {commands:results.filter(r=>r.command).map(r=>r.command),faults:results.filter(r=>r.failure).map(r=>r.failure)};
}
function commit(state,{id,beforeVersion,outcome,intentions=[],options={},faults=[],resolution={}}){
 if(typeof id!=='string'||!id.trim()||id.length>160)throw Error('A bounded turn ID is required.');
 if((state.openWorld?.turnReceipts||[]).some(r=>r.id===id))return copy(state);
 if(version(state)!==beforeVersion)throw Object.assign(Error('The world changed while commands were prepared. Stale commands were discarded.'),{code:'STALE_TURN'});
 const actors=new Set();for(const i of intentions){if(actors.has(i.actor)||!state.agents.some(a=>a.id===i.actor&&a.alive))throw Error('Each living actor may submit at most one command per turn.');actors.add(i.actor);}
 const next=World().apply(state,outcome,intentions,options),data=next.openWorld;
 const receipt={id,fromDay:state.day,toDay:next.day,commands:intentions.map(i=>({id:id+':'+i.actor,actor:i.actor,kind:i.execution?.kind||'attempt'})),missingActions:copy(faults),proposalStatus:resolution.proposalWithheld?'withheld':resolution.authoredChangesAccepted?'admitted':'none'};
 data.turnReceipts=[...(state.openWorld?.turnReceipts||[]),receipt].slice(-16);
 data.lastResolution=copy(resolution);
 for(const f of faults){const a=next.agents.find(a=>a.id===f.actor);next.events.push({day:next.day,type:'action-result',actor:f.actor,text:(a?.name||'Agent '+f.actor)+': no action was accepted this turn ('+f.status+'). '+f.reason});}
 if(resolution.proposalWithheld)data.proposalQueue=[...(state.openWorld?.proposalQueue||[]),{id:id+':proposal',status:'withheld',preparedForDay:next.day,reason:resolution.reason,expiresAfterDay:next.day}].slice(-8);
 data.pendingProcessReviews=(options.deferProcessReviews?((root.ProcessClock||(typeof require==='function'?require('./process-clock.js'):null)).due(state)):[]).map(p=>({id:p.id,dueDay:p.nextReviewDay??state.day+1,deferredOn:next.day,reason:'No additional consequence was admitted. Previously established scheduled effects still execute; this process remains due.'}));
 for(const p of data.pendingProcessReviews)next.events.push({day:next.day,type:'resolution',text:'Process '+p.id+' still needs review. No new effects were assumed; existing scheduled effects continue.'});
 next.events=next.events.slice(-700);return next;
}
root.TurnKernel={version,bounded,collect,commit,fault};if(typeof module!=='undefined')module.exports=root.TurnKernel;
})(typeof window!=='undefined'?window:globalThis);
