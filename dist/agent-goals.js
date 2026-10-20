/* Persistent intentions, grounded in personal observations and known inventions. */
(function(root){
  'use strict';
  const buildable=new Set(['shelter','strong-shelter','fire','frame','vessel','tool','prepared-food','stored-food']);
  function ensure(a){a.goalHistory ||= [];return a.goal||null;}
  function finish(a,state,status='complete',reason='Finished'){
    if(!a.goal)return;
    a.goal.status=status;a.goal.finished=state.day;a.goal.next=reason;if(status==='complete')a.goal.progress=100;
    a.goalHistory.push({...a.goal});a.goalHistory=a.goalHistory.slice(-12);a.goal=null;a.project=null;
  }
  function select(a,state,tech){
    const options=tech.possibilities(a,state);
    const existing=options.find(c=>c.id===a.project);
    const shelters=a.knowledge.map(id=>tech.get(state,id)).filter(n=>n&&buildable.has(n.effect));
    const known=(a.seenTiles||[]).map(i=>state.tiles[i]).filter(Boolean);
    const builtIds=new Set(known.flatMap(t=>(t.structures||[]).map(s=>s.techId)));
    const building=shelters.find(n=>!builtIds.has(n.id)&&['shelter','strong-shelter'].includes(n.effect));
    if(building)return {kind:'build',nodeId:building.id,title:'Build '+building.name,reason:'Put a known invention to use in a familiar place.',costs:{wood:1,fibre:1},site:'forest'};
    if(options.length){
      const ranked=[...options].sort((x,y)=>{
        const score=c=>(c.effect==='shelter'?(state.weather==='rain'?20:8):0)+(c.effect==='food'?10:0)+c.weight-Object.entries(c.costs).reduce((n,[k,v])=>n+Math.max(0,v-(a.supplies?.[k]||0)),0);
        return score(y)-score(x)||x.id.localeCompare(y.id);
      });
      const c=existing||ranked[(a.id-1)%Math.min(2,ranked.length)];
      return {kind:'experiment',candidateId:c.id,title:'Learn '+c.name,reason:'Test materials already encountered here.',costs:{...c.costs},site:c.site};
    }
    return {kind:'explore',title:'Explore unfamiliar ground',reason:'Find useful places beyond personally visited ground.',startCount:(a.seenTiles||[]).length,targetCount:(a.seenTiles||[]).length+3,costs:{}};
  }
  function plan(a,state,tech){
    ensure(a);let g=a.goal;
    if(g?.kind==='experiment'&&a.knowledge.includes(g.candidateId)){finish(a,state);g=null;}
    if(g?.kind==='experiment'&&!tech.possibilities(a,state).some(c=>c.id===g.candidateId)){finish(a,state,'abandoned','The experiment is no longer available.');g=null;}
    if(g?.kind==='explore'&&(a.seenTiles||[]).length>=g.targetCount){finish(a,state);g=null;}
    if(!g){g=a.goal={...select(a,state,tech),started:state.day,status:'active',attempts:0,progress:0,next:'Preparing'};a.project=g.candidateId||null;}
    const interruption=a.water<3?'Find water before continuing':a.food<3?'Find food before continuing':a.energy<35?'Rest before continuing':null;
    g.status=interruption?'paused':'active';
    if(interruption){g.next=interruption;return g;}
    if((g.retryAfter||0)>state.day){g.status='blocked';g.next='Await another day before requesting approval again';return g;}
    const missing=Object.entries(g.costs).map(([k,n])=>[k,Math.max(0,['food','water'].includes(k)?n+3-a[k]:n-(a.supplies?.[k]||0))]).filter(([,n])=>n>0);
    const total=Object.values(g.costs).reduce((n,v)=>n+v,0),held=Object.entries(g.costs).reduce((n,[k,v])=>n+Math.min(v,['food','water'].includes(k)?Math.max(0,a[k]-3):(a.supplies?.[k]||0)),0);
    if(g.kind==='explore'){g.progress=Math.min(95,Math.round(((a.seenTiles||[]).length-g.startCount)/3*100));g.next='Visit '+Math.max(0,g.targetCount-(a.seenTiles||[]).length)+' more unfamiliar places';}
    else {g.progress=total?Math.round(held/total*65):65;g.next=missing.length?'Gather '+missing.map(([k,n])=>n+' '+k).join(', '):state.tiles[a.y*state.width+a.x].type!==g.site?'Travel to known '+g.site+' ground':g.kind==='build'?'Construct at this place':'Test the prepared materials';if(!missing.length&&state.tiles[a.y*state.width+a.x].type===g.site)g.progress=85;}
    return g;
  }
  root.AgentGoals={ensure,plan,finish};
  if(typeof module!=='undefined')module.exports=root.AgentGoals;
})(typeof window!=='undefined'?window:globalThis);
