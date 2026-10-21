/* Review timing is engine bookkeeping. Reviews describe consequences; schedules never apply them twice. */
(function(root){
 'use strict';
 const copy=v=>JSON.parse(JSON.stringify(v));
 const fail=(message,code)=>{const error=Error('Process review: '+message);error.code=code;throw error;};
 function due(state){return (state.openWorld?.processes||[]).filter(p=>p.status==='active'&&(!Number.isInteger(p.nextReviewDay)||p.nextReviewDay<=state.day+1));}
 function prepare(state,proposal){
  const p=copy(proposal),day=state.day+1,old=state.openWorld?.processes||[],updates=p.processes||[],ids=new Set(),corrections=[];
  if(!Array.isArray(updates))fail('processes must be an array.','PROCESS_SHAPE');
  p.processes=updates.map(change=>{
   if(!change||typeof change.id!=='string'||!change.id.trim()||ids.has(change.id))fail('each review needs a unique process ID.','PROCESS_SHAPE');ids.add(change.id);
   if(typeof change.review!=='string'||!change.review.trim())fail('process '+JSON.stringify(change.id)+' needs a causal review of this day; changing its date alone is not a review.','PROCESS_REVIEW_MISSING');
   const previous=old.find(v=>v.id===change.id),merged={...previous,...change};
   if(typeof merged.description!=='string'||!merged.description.trim()||!['active','resolved'].includes(merged.status)||!Array.isArray(merged.subjects))fail('a process requires description, active/resolved status, and subjects (person IDs or []).','PROCESS_SHAPE');
   for(const id of merged.subjects)if(!state.agents.some(a=>a.id===id))fail('process subjects must identify existing people.','PROCESS_SHAPE');
   if(merged.status==='resolved')return {...merged,lastReviewed:day,nextReviewDay:null,reviewInDays:null};
   let interval=1;
   if(change.reviewInDays!=null){const value=Number(change.reviewInDays);if(Number.isInteger(value)&&value>=1&&value<=365)interval=value;else corrections.push({id:change.id,reason:'Unsupported review interval replaced by a review on the next day.'});}
   else if(change.nextReviewDay!=null){const value=Number(change.nextReviewDay);if(Number.isInteger(value)&&value>day&&value<=day+365)interval=value-day;else corrections.push({id:change.id,requested:change.nextReviewDay,reason:'The completed review used a stale or invalid absolute date. The engine schedules its next review.'});}
   // An update without a date does not inherit an already-due date from the prior record.
   return {...merged,reviewInDays:interval,lastReviewed:day,nextReviewDay:day+interval};
  });
  const missing=due(state).filter(process=>!ids.has(process.id));
  if(missing.length)fail('Due processes need explicit consequence/stability reviews: '+missing.map(p=>JSON.stringify(p.id)).join(', ')+'. Apply their actual effects in the outcome and review each ID; the engine supplies future dates.','PROCESS_REVIEW_MISSING');
  if(corrections.length)p.calendarCorrections=corrections;
  else delete p.calendarCorrections;
  return p;
 }
 root.ProcessClock={due,prepare};
 if(typeof module!=='undefined')module.exports=root.ProcessClock;
})(typeof window!=='undefined'?window:globalThis);
