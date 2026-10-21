/* Reviews may reject authored consequences; established physics is not voted on. */
(function(root){
 'use strict';
 const domains={
  entities:['Conservation','Space','Causality','Ecology','Engineering'],
  transactions:['Conservation','Space','Causality','Ecology','Engineering'],
  reserveTransfers:['Conservation','Space','Causality','Physiology'],
  scheduledEffects:['Causality','Ecology','Physiology'],
  discoveries:['Knowledge','Causality'],observations:['Knowledge','Causality'],reports:['Knowledge','Social','Causality'],inferences:['Knowledge','Causality'],
  terrain:['Space','Ecology','Engineering','Causality'],relationships:['Social','Causality'],speech:['Social','Knowledge','Causality'],
  newPeople:['Heredity','Physiology','Space','Social','Causality'],processes:['Causality','Ecology','Physiology','Social','Engineering'],
  laws:['Conservation','Space','Causality','Ecology','Physiology','Knowledge','Social','Heredity','Engineering'],weather:['Ecology','Causality'],expand:['Space','Ecology','Causality']
 };
 function targets(state,p,observer=false){
  const rows=[],add=(path,value,roles)=>rows.push({path,value,roles:[...new Set([...roles,...(observer?['Overseer boundary']:[])])]});
  for(const [key,roles]of Object.entries(domains)){
   if(Array.isArray(p[key]))p[key].forEach((value,i)=>{
    if(key==='processes'){
     const old=state.openWorld?.processes?.find(x=>x.id===value.id);
     if(old?.status==='resolved'&&value.status==='resolved'&&old.description===value.description&&JSON.stringify(old.subjects)===JSON.stringify(value.subjects))return;
    }
    add('/proposal/'+key+'/'+i,value,key==='transactions'&&value.kind==='observer'?[...roles,'Overseer boundary']:roles);
   });
   else if(p[key]!=null&&typeof p[key]==='object'&&(key!=='expand'||Object.values(p[key]).some(n=>Number(n)!==0)))add('/proposal/'+key,p[key],roles);
  }
  for(const [i,change]of (p.agents||[]).entries()){
   const a=state.agents.find(a=>a.id===change.id);
   for(const [meter,value]of Object.entries(change.delta||{}))if(value!==0)add('/proposal/agents/'+i+'/delta/'+meter,value,['Physiology','Causality',...(['food','water'].includes(meter)?['Conservation']:[])]);
   if(change.position&&(change.position.x!==a?.x||change.position.y!==a?.y))add('/proposal/agents/'+i+'/position',change.position,['Space','Causality']);
   for(const key of ['experience','states','goal'])if(change[key]!=null&&(!Array.isArray(change[key])||change[key].length))add('/proposal/agents/'+i+'/'+key,change[key],key==='experience'?['Knowledge','Causality']:key==='goal'?['Social','Causality']:['Physiology','Social','Knowledge','Causality']);
  }
  return rows;
 }
 function assess(votes,reviewTargets){
  const decisions=votes.map(v=>{
   if(v.approve)return {...v,disposition:'allow'};
   if(/^Model unavailable:/i.test(String(v.reason||'')))return {...v,disposition:'unavailable'};
   if(v.scope==='engine'||v.scope==='narrative')return {...v,disposition:'advisory',policyReason:'Established engine rules and narrative wording do not veto the world clock.'};
   const target=reviewTargets.find(t=>t.path===v.target);
   if(target&&!target.roles.includes(v.name))return {...v,disposition:'advisory',policyReason:'This change is outside the reviewer’s decision domain.'};
   if(target&&v.scope==='proposal'&&typeof v.evidence==='string'&&v.evidence.trim())return {...v,disposition:'block'};
   return {...v,disposition:reviewTargets.length?'unsubstantiated':'advisory',policyReason:'No concrete authored change and supporting evidence were identified. This cannot freeze established physics.'};
  });
  return {decisions,blockers:decisions.filter(v=>['block','unsubstantiated'].includes(v.disposition)),unavailable:decisions.some(v=>v.disposition==='unavailable')};
 }
 const contract={version:2,principle:'The engine owns the clock, daily upkeep, travel costs and previously scheduled effects. Only actual authored changes in reviewTargets may receive a blocking objection, within that reviewer’s listed domain. Cite its exact path and before/proposed evidence. Narrative wording and disputes about the engine’s established rules are advisory. Rejected additions do not stop an otherwise fully determined day; they are not committed.',scopes:['none','proposal','engine','narrative']};
 root.ReviewPolicy={targets,assess,contract};if(typeof module!=='undefined')module.exports=root.ReviewPolicy;
})(typeof window!=='undefined'?window:globalThis);
