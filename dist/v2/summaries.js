/* Evidence-only observer briefings. No model requests or changes to world state. */
(function(root){
function build(initial,world){
 const E=root.Emergence||(typeof require==='function'?require('./engine.js'):null),reports=[],seen=new Set(),firsts=new Set();
 const visible=s=>s.agents.filter(a=>a.alive).flatMap(a=>s.sites.filter(b=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=2).map(b=>b.id));
 let state=JSON.parse(JSON.stringify(initial)),startState=state,events=[],markers=[],still=0;
 visible(state).forEach(id=>seen.add(id));
 for(let i=0;i<world.journal.length;i++){
  const j=world.journal[i],before=state;state=E.step(state,j.commands,j.id);events.push(...j.events.map(e=>({...e,turn:j.turn})));
  const moved=state.agents.some(a=>{const b=before.agents.find(b=>b.id===a.id);return a.x!==b.x||a.y!==b.y;});
  still=moved?0:still+1;if(still===5)markers.push('No movement for five turns.');
  for(const id of visible(state))if(!seen.has(id)){seen.add(id);markers.push('Resource discovered: '+state.sites.find(s=>s.id===id).name+'.');}
  for(const [key,predicate,title] of [
   ['consume',e=>e.kind==='action'&&/^Used \d+ (food|water)/.test(e.text),'First successful eating or drinking'],
   ['transfer',e=>e.kind==='received','First successful supply transfer'],
   ['gather',e=>e.kind==='action'&&/^(Gathered|Filled)/.test(e.text),'First supplies collected for transport']
  ])if(!firsts.has(key)&&j.events.some(predicate)){firsts.add(key);markers.push(title+'.');}
  for(const e of j.events.filter(e=>e.kind==='death'))markers.push(e.text+'.');
  if((i+1)%5===0||i===world.journal.length-1){
   const count=re=>events.filter(e=>e.kind==='action'&&re.test(e.text)).length,speech=events.filter(e=>e.kind==='speech').length,transfers=events.filter(e=>e.kind==='received').length,failures=events.filter(e=>e.kind==='failed').length;
   const movedNames=state.agents.filter(a=>{const b=startState.agents.find(b=>b.id===a.id);return a.x!==b.x||a.y!==b.y;}).map(a=>a.name);
   const total=(s,k)=>s.agents.reduce((n,a)=>n+a[k],0),delta=k=>total(state,k)-total(startState,k),signed=n=>(n>0?'+':'')+n;
   const activity=count(/^Moved to /)+' movement actions, '+count(/^Rest restored /)+' rests, '+count(/^Waited$/)+' waits; '+speech+' spoken lines.';
   const consumption=count(/^Used \d+ (food|water)/),collection=count(/^(Gathered|Filled)/);
   const text=[activity,movedNames.length?'Changed position: '+movedNames.join(', ')+'.':'All agents ended this interval where they started.',consumption+' successful eating/drinking actions, '+collection+' collections and '+transfers+' supply transfers.',
    'Combined body reserves: food '+signed(delta('food'))+', water '+signed(delta('water'))+'; combined health '+signed(delta('health'))+'. '+state.agents.filter(a=>a.alive).length+' alive.',
    failures?failures+' failed or missing actions.':'',speech&&!consumption&&!collection&&!transfers?'Conversation produced no recorded collection, consumption or supply transfer in this interval.':'',
    state.agents.some(a=>a.alive&&(a.food===0||a.water===0))?'Warning: at least one living agent has exhausted food or water and is taking damage.':''].filter(Boolean).join(' ');
   reports.push({start:world.journal[i-i%5].turn,end:j.turn,complete:(i+1)%5===0,text,markers:markers.slice(),evidence:events.slice()});
   startState=state;events=[];markers=[];
  }
 }
 return reports;
}
// Journal turn numbers are authoritative; event labels in older exports can be offset.
const api={build};root.CommonGroundSummary=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
