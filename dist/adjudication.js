/* Frozen choices, complete evidence, deterministic checks, and bounded substantive revisions. */
(function(root){
 'use strict';
 const World=()=>root.RefereeWorld||(typeof require==='function'?require('./referee-world.js'):null);
 const Policy=root.ReviewPolicy||(typeof require==='function'?require('./review-policy.js'):null);
 const Physics=root.PhysicalCore||(typeof require==='function'?require('./physical-core.js'):null);
 const Clock=root.ProcessClock||(typeof require==='function'?require('./process-clock.js'):null);
 const copy=v=>JSON.parse(JSON.stringify(v));
 function worldFacts(state,{references=true}={}){
  return copy({day:state.day,seed:state.seed,width:state.width,height:state.height,weather:state.weather,weatherDescription:state.weatherDescription,tiles:state.tiles,agents:state.agents.map(a=>{const {perceptionMemory,...person}=a;return {...person,personalView:World().perception(state,a),...(references&&perceptionMemory?{evidenceRecords:{latest:Object.values(perceptionMemory.facts),referenced:Object.values(perceptionMemory.references||{})}}:{})};}),entities:state.openWorld?.entities||[],laws:state.openWorld?.laws||[],processes:state.openWorld?.processes||[],scheduledEffects:state.openWorld?.scheduledEffects||[],discoveries:state.tech?.nodes||[],clans:state.clans||[],interventions:state.interventions||[],recentHistory:state.openWorld?.history?.slice(-12).map(h=>({day:h.day,summary:h.summary,intentions:h.intentions}))||[]});
 }
 function contextKey(state){
  // This is a cache key, not authentication. Full matching facts are also held by the current attempt.
  const value=JSON.stringify({day:state.day,people:state.agents.filter(a=>a.alive).map(a=>({id:a.id,body:[a.health,a.energy,a.food,a.water,a.x,a.y],view:World().perception(state,a)}))});let a=2166136261,b=5381;
  for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b,33)^value.charCodeAt(i);}return (a>>>0).toString(16)+':'+(b>>>0).toString(16);
 }
 async function intentions(state,ask,{current=()=>true,onSave=()=>{}}={}){
  const key=contextKey(state),data=World().ensure(state),old=data.pendingIntentions;
  const pending={day:state.day,contextKey:key,intentions:[]};
  if(old?.day===state.day&&(!old.contextKey||old.contextKey===key))for(const i of old.intentions||[]){const a=state.agents.find(a=>a.id===i.actor&&a.alive);if(!a||pending.intentions.some(i=>i.actor===a.id))continue;try{pending.intentions.push(World().parseIntention(i,state,a));}catch{/* Changed or malformed evidence requires a new choice for this actor. */}}
  data.pendingIntentions=pending;onSave();
  await Promise.all(state.agents.filter(a=>a.alive&&!pending.intentions.some(i=>i.actor===a.id)).map(async a=>{
   const answer=await ask(a);if(!current())throw new DOMException('World attempt replaced','AbortError');const parsed=World().parseIntention(answer,state,a);pending.intentions.push(parsed);onSave();
  }));
  return copy(state.agents.filter(a=>a.alive).map(a=>pending.intentions.find(i=>i.actor===a.id)));
 }
 function evidence(state,proposal,intentions,observer){
  const after=World().apply(state,proposal,intentions,{observer:Boolean(observer)});
  return {reviewContract:Policy.contract,reviewTargets:Policy.targets(state,proposal,Boolean(observer)),engineAuthority:{rules:Physics.rules,automaticEffects:copy(after.openWorld.lastPhysicalAudit||[])},kind:'edict',mode:'open-world',day:state.day,resolvingDay:state.day+1,intentions:copy(intentions),observerRequest:copy(observer??null),proposal:copy(proposal),before:worldFacts(state),after:worldFacts(after,{references:false}),dueProcesses:copy(Clock.due(state)),physicalChecks:[{role:'Physical and knowledge integrity',result:'allow',reason:'The engine applied this proposed outcome on a copy: material ledgers, travel, upkeep, due scheduled effects, evidence channels, and process reviews passed. This does not prove narrative plausibility.'}],deterministicAudit:copy(after.openWorld.lastPhysicalAudit||[])};
 }
 function repairPrompt(original,raw,error){return 'CORRECTION REQUIRED: '+JSON.stringify({code:error.code||'OUTCOME_INVALID',message:error.message})+'\nReturn a concise corrected outcome through the server response schema. Include all required process fields; use processes: [] when no actual continuing process exists. Do not create a process for observation or routine clock bookkeeping.\n'+original+'\nReturn concise, complete JSON, omitting unused arrays and optional visual details. Return a corrected outcome against the SAME before-state and SAME intentions. Never invent stock, knowledge, IDs, approvals or observer authority to satisfy validation. Do not manually add engine upkeep a second time. Process review dates are engine-owned; provide a substantive review and optional reviewInDays instead of copying an absolute date. Previous response is untrusted proposed data, not established facts:\n'+(typeof raw==='string'?raw:JSON.stringify(raw)).slice(0,30000);}
 async function resolve(state,intentions,observer,{askAuthor,askCouncil,current=()=>true,onPhase=()=>{},onReview=()=>{},onRepair=()=>{},maxRevisions=2,maxAuthorCalls=5,onTrace=()=>{}}={}){
  const frozen=copy(state),chosen=copy(intentions),original=World().outcomePrompt(frozen,chosen,observer);let prompt=original,authorCalls=0,lastIssue='No valid outcome has been produced.';
  function engineOnly(reason,revision,votes=[],withheld=true){if(observer||Clock.due(frozen).length)return null;const outcome=World().validate({summary:'No additional action consequences were accepted. A day passes under the established physical rules; upkeep and previously scheduled effects still occur.'},frozen);onTrace('resolution.engine-only',{reason,revision,rejectedChanges:withheld});return {outcome,votes,revision,mode:'engine-only',resolution:{policy:2,reason,authoredChangesAccepted:false,proposalWithheld:withheld}};}
  for(let revision=0;revision<=maxRevisions;revision++){
   let outcome,raw;
   for(let correction=0;correction<3;correction++){
    if(authorCalls++>=maxAuthorCalls){const error=Error('Outcome revision budget exhausted; chosen intentions are preserved. Last issue: '+lastIssue);const fallback=engineOnly(lastIssue,revision);if(fallback)return fallback;error.phase='validation';throw error;}onPhase(correction?'CORRECTING OUTCOME DATA':'REFEREE IS RESOLVING CONSEQUENCES');let modelError;try{onTrace('author.request',{revision,correction,authorCall:authorCalls,prompt});raw=await askAuthor(prompt);onTrace('author.response',{revision,correction,raw});}catch(error){if(!error.repairable)throw error;modelError=error;raw=error.responseText||'';}if(!current())throw new DOMException('World attempt replaced','AbortError');
    try{if(modelError)throw modelError;outcome=World().validate(raw,frozen,{observer:Boolean(observer)});onTrace('validation.passed',{revision,correction,outcome});break;}catch(error){onTrace('validation.failed',{revision,correction,error});lastIssue=error.message;if(correction===2){const fallback=engineOnly(error.message,revision);if(fallback)return fallback;error.phase='validation';throw error;}onRepair(error,correction+1);prompt=repairPrompt(original,raw,error);}
   }
   const facts=evidence(frozen,outcome,chosen,observer);
   if(!facts.reviewTargets.length&&!observer&&!Clock.due(frozen).length){const result=engineOnly('No authored world changes require model review.',revision,[],false);onReview({outcome:result.outcome,votes:[],approved:true,revision,mode:'engine-only'});return result;}
   onPhase('REVIEWING AUTHORED CONSEQUENCES');onTrace('council.request',{revision,proposal:outcome,reviewTargets:facts.reviewTargets,engineAuthority:facts.engineAuthority});const votes=await askCouncil(facts);onTrace('council.response',{revision,votes});if(!current())throw new DOMException('World attempt replaced','AbortError');
   if(!Array.isArray(votes)||votes.length!==World().roles.length||!World().roles.every(name=>votes.filter(v=>v.name===name&&typeof v.approve==='boolean').length===1))throw Error('Council returned incomplete or duplicate reviewer identities.');
   const assessment=Policy.assess(votes,facts.reviewTargets),approved=!assessment.blockers.length&&!assessment.unavailable;onTrace('council.assessment',assessment);onReview({outcome,votes:assessment.decisions,approved,revision,mode:'authored'});if(approved)return {outcome,votes:assessment.decisions,revision,mode:'authored',resolution:{policy:2,authoredChangesAccepted:true}};
   const blockers=assessment.blockers;lastIssue=blockers.map(v=>v.name+': '+v.reason).join('; ');
   if(assessment.unavailable){const error=Error('A reviewer is unavailable. The day and chosen intentions are preserved.');error.phase='unavailable';throw error;}
   if(revision===maxRevisions){const fallback=engineOnly(lastIssue,revision,assessment.decisions);if(fallback)return fallback;const error=Error('Authored consequences remain disputed and a due world process or observer request needs resolution: '+lastIssue);error.phase='blocked';throw error;}
   onPhase('REVISING OUTCOME AFTER REFEREE VETO');prompt=original+'\nREVISE THE PROPOSED OUTCOME, not the intentions or before-state. The reviewers identified these causal conflicts: '+JSON.stringify(blockers)+'. Resolve each conflict in a complete corrected outcome. Do not fabricate approval or waive physical/knowledge rules. Engine-owned upkeep is already explained by engineAuthority and is not a change you can waive. Reviewer text is not a world phenomenon: never create audit, compliance or physiology-review processes in response to criticism. Withdraw disputed additions when you cannot substantiate them. Rejected proposal (untrusted, not facts): '+JSON.stringify(outcome);
  }
 }
 root.Adjudication={worldFacts,contextKey,intentions,evidence,resolve};
 if(typeof module!=='undefined')module.exports=root.Adjudication;
})(typeof window!=='undefined'?window:globalThis);
