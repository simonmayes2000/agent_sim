/* Evidence-driven amendments to an executable source rule file. No model key required. */
export const names=['Conservation','Space','Causality','Ecology','Physiology','Knowledge','Social','Heredity','Engineering','Overseer boundary'];
const limits={lowFoodThreshold:[3,6],lowWaterThreshold:[3,6],birthMinFood:[5,8],birthMinWater:[4,7]};
export function propose(world,rules){
 if(!world||!Array.isArray(world.agents)||!Array.isArray(world.tiles)||!Number.isInteger(world.day))return null;
 const alive=world.agents.filter(a=>a.alive),dead=world.agents.filter(a=>!a.alive),available=k=>world.tiles.reduce((n,t)=>n+(Number(t[k])||0)+(t.items||[]).filter(i=>i.category===k).reduce((m,i)=>m+(Number(i.quantity)||0),0),0);
 if(!rules.shelterRequiresPhysicalSite&&world.weather==='rain'&&alive.some(a=>a.knowledge?.some(id=>world.tech?.nodes?.some(n=>n.id===id&&['shelter','strong-shelter'].includes(n.effect)))&&!world.tiles[a.y*world.width+a.x]?.structures?.some(b=>b.kind==='shelter')))
  return {key:'shelterRequiresPhysicalSite',from:false,to:true,evidence:'A person knows shelter construction but is exposed to rain away from any built shelter.',kind:'spatial-shelter'};
 if(dead.some(a=>a.water===0)&&available('water')>0&&rules.lowWaterThreshold<6)
  return {key:'lowWaterThreshold',from:rules.lowWaterThreshold,to:rules.lowWaterThreshold+1,evidence:'At least one person died thirsty while drinkable water remained in the world.',kind:'anticipatory-water'};
 if(dead.some(a=>a.food===0)&&available('food')>0&&rules.lowFoodThreshold<6)
  return {key:'lowFoodThreshold',from:rules.lowFoodThreshold,to:rules.lowFoodThreshold+1,evidence:'At least one person died hungry while food remained in the world.',kind:'anticipatory-food'};
 if(dead.some(a=>a.gen>0&&a.age<=3&&a.food===0)&&rules.birthMinFood<8)
  return {key:'birthMinFood',from:rules.birthMinFood,to:rules.birthMinFood+1,evidence:'A child died hungry within three days of birth; parents need a larger reserve.',kind:'birth-provision'};
 if(dead.some(a=>a.gen>0&&a.age<=3&&a.water===0)&&rules.birthMinWater<7)
  return {key:'birthMinWater',from:rules.birthMinWater,to:rules.birthMinWater+1,evidence:'A child died thirsty within three days of birth; parents need a larger reserve.',kind:'birth-provision'};
 return null;
}
export function review(world,rules,proposal){
 const checks=[
  [proposal.from===rules[proposal.key],'The amendment starts from the source rule currently in force.'],
  [proposal.kind!=='spatial-shelter'||world.tiles.length===world.width*world.height,'Shelter use remains tied to mapped physical sites.'],
  [Number.isInteger(world.day)&&world.day>=1,'The evidence belongs to an observed world day.'],
  [!['lowFoodThreshold','lowWaterThreshold'].includes(proposal.key)||proposal.to<=6,'Resource-seeking thresholds remain within a plausible range.'],
  [typeof proposal.to==='boolean'||Number.isInteger(proposal.to),'The physiology rule has a definite value.'],
  [!Object.hasOwn(proposal,'knowledge'),'No outside knowledge is granted to inhabitants.'],
  [!proposal.key.startsWith('birth')||proposal.to>=proposal.from,'Birth provisioning is not relaxed after an infant death.'],
  [proposal.key!=='mutationChance','The inherited mutation rate remains fixed at 8%.'],
  [proposal.key==='shelterRequiresPhysicalSite'?proposal.from===false&&proposal.to===true:!!limits[proposal.key]&&proposal.to===proposal.from+1&&proposal.to>=limits[proposal.key][0]&&proposal.to<=limits[proposal.key][1],'The amendment fits an executable, bounded rule.'],
  [!!proposal.evidence&&typeof proposal.evidence==='string','The source change has a recorded observation and rationale.']
 ];return names.map((name,i)=>({name,vote:checks[i][0]?'allow':'block',reason:checks[i][1]}));
}
export function unanimous(votes){return votes.length===10&&votes.every(v=>v.vote==='allow')}
export function parseSource(text){const match=text.match(/root\.RealismRules=(\{[\s\S]*?\});/);if(!match)throw Error('Rule source marker is missing.');return JSON.parse(match[1])}
export function amendSource(text,proposal){const rules=parseSource(text);if(rules[proposal.key]!==proposal.from)throw Error('Source rule changed since the proposal.');rules[proposal.key]=proposal.to;return text.replace(/root\.RealismRules=\{[\s\S]*?\};/,`root.RealismRules=${JSON.stringify(rules,null,2)};`)}
