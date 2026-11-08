/* Persistent physical opportunities, not assigned social behaviour. Version 2 only. */
(function(root){
const copy=x=>JSON.parse(JSON.stringify(x)),distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y),here=(a,b)=>b&&distance(a,b)===0;
function initialise(s){s.version=2;s.structures=[];s.nextStructure=1;s.footprints={};s.sites.push({id:'copse',name:'Timber copse',x:5,y:3,kind:'wood',stock:18,capacity:18,renew:3});for(const a of s.agents){a.inventory.wood=0;a.inventory.food=2;a.knownPlaces=[];}return s;}
function record(s,b,a,kind,amount=1){b.history.push({turn:s.turn,actor:a.id,kind,amount});if(kind==='build'||kind==='repair'||kind==='plant'||kind==='tend'||kind==='deposit')b.contributors=[...new Set([...b.contributors,a.id])];if(['rest','eat','drink','withdraw','harvest'].includes(kind))b.users=[...new Set([...b.users,a.id])];}
function make(s,a,kind){const b={id:kind+'-'+s.nextStructure++,kind,x:a.x,y:a.y,created:s.turn,progress:0,required:kind==='shelter'?4:2,durability:12,contributors:[],users:[],history:[]};if(kind==='store')b.stock={food:0,water:0,wood:0};if(kind==='garden'){b.stock=0;b.tended=s.turn;b.required=0;}s.structures.push(b);return b;}
function perform(s,a,c,add){
 const b=s.structures.find(b=>b.id===c.target),site=s.sites.find(b=>b.id===c.target),jar=s.objects.find(o=>o.holder===a.id),n=c.amount||1,resource=c.resource;
 const complete=b&&b.progress>=b.required;
 if(c.kind==='build'){
  const kind=['store','shelter'].includes(c.target)?c.target:b?.kind;if(!['store','shelter'].includes(kind))throw Error('Build target must be store, shelter, or an existing project ID');
  let project=b||s.structures.find(b=>here(a,b)&&b.kind===kind);if(project&&!here(a,project))throw Error('Stand at the project to build');if(project&&project.progress>=project.required)throw Error('This structure is already complete');
  if(a.inventory.wood<1)throw Error('Build needs one carried wood per contribution');if(!project){if(s.structures.filter(b=>here(a,b)).length>=3)throw Error('Three structures per tile');project=make(s,a,kind);}a.inventory.wood--;project.progress++;record(s,project,a,'build');const done=project.progress===project.required;add(a.id,(done?'Completed ':'Contributed wood to ')+project.id+' at '+a.x+','+a.y+' ('+project.progress+'/'+project.required+')','construction');return 'Built '+project.id+' '+project.progress+'/'+project.required;
 }
 if(c.kind==='plant'){
  if(s.structures.some(b=>here(a,b)&&b.kind==='garden'))throw Error('A garden already exists here');if(s.structures.filter(b=>here(a,b)).length>=3)throw Error('Three structures per tile');if(a.inventory.food<2)throw Error('Planting needs two carried food as seed');a.inventory.food-=2;const garden=make(s,a,'garden');record(s,garden,a,'plant',2);add(a.id,'Planted '+garden.id+' at '+a.x+','+a.y,'construction');return 'Planted '+garden.id+'; first yield on a later third turn';
 }
 if(c.kind==='tend'){if(!here(a,b)||b.kind!=='garden')throw Error('Stand at a garden to tend it');b.tended=s.turn;record(s,b,a,'tend');return 'Tended '+b.id+'; produces 2 food every third turn while tended within 6 turns';}
 if(c.kind==='repair'){if(!here(a,b)||b.kind!=='shelter'||!complete)throw Error('Stand at a completed shelter');if(b.durability>=12)throw Error('Shelter needs no repair');if(a.inventory.wood<1)throw Error('Repair needs one wood');a.inventory.wood--;b.durability=Math.min(12,b.durability+4);record(s,b,a,'repair');add(a.id,'Repaired '+b.id,'construction');return 'Repaired '+b.id+' to '+b.durability+'/12';}
 if(c.kind==='deposit'||c.kind==='withdraw'){
  if(!here(a,b)||b.kind!=='store'||!complete)throw Error('Stand at a completed store');if(!['food','water','wood'].includes(resource))throw Error('Choose resource food, water or wood');
  const carrier=resource==='water'?jar:a.inventory;if(!carrier)throw Error('Transport water in a carried jar');const key=resource,capacity=resource==='water'?jar.capacity:8;let amount;
  if(c.kind==='deposit'){amount=Math.min(n,carrier[key],24-b.stock[key]);if(!amount)throw Error('Nothing to deposit or store full');carrier[key]-=amount;b.stock[key]+=amount;}
  else{amount=Math.min(n,b.stock[key],capacity-carrier[key]);if(!amount)throw Error('Store empty or carrying capacity reached');b.stock[key]-=amount;carrier[key]+=amount;}
  record(s,b,a,c.kind,amount);add(a.id,(c.kind==='deposit'?'Deposited ':'Withdrew ')+amount+' '+resource+(c.kind==='deposit'?' into ':' from ')+b.id,'storage');return (c.kind==='deposit'?'Deposited ':'Withdrew ')+amount+' '+resource+' at '+b.id;
 }
 if(c.kind==='harvest'||c.kind==='gather'&&b?.kind==='garden'){
  if(!here(a,b)||b.kind!=='garden')throw Error('Stand at a garden to harvest');const amount=Math.min(n,b.stock,8-a.inventory.food);if(!amount)throw Error('Garden empty or food capacity reached');b.stock-=amount;a.inventory.food+=amount;record(s,b,a,'harvest',amount);return 'Gathered '+amount+' food from '+b.id;
 }
 if(c.kind==='gather'&&site?.kind==='wood'){
  if(!here(a,site))throw Error('Stand at the timber copse');const amount=Math.min(n,site.stock,8-a.inventory.wood);if(!amount)throw Error('Copse empty or wood capacity reached');site.stock-=amount;a.inventory.wood+=amount;return 'Gathered '+amount+' wood';
 }
 if(['eat','drink'].includes(c.kind)&&b){
  const r=c.kind==='eat'?'food':'water';if(!here(a,b)||!complete||!(b.kind==='store'||b.kind==='garden'&&r==='food'))throw Error('Stand at a completed store, or garden for food');const amount=Math.min(n,b.kind==='garden'?b.stock:b.stock[r]);if(!amount)throw Error('No '+r+' here');if(b.kind==='garden')b.stock-=amount;else b.stock[r]-=amount;a[r]=Math.min(40,a[r]+5*amount);record(s,b,a,c.kind,amount);return 'Used '+amount+' '+r+' at '+b.id;
 }
 if(c.kind==='rest'){
  const shelter=s.structures.find(b=>here(a,b)&&b.kind==='shelter'&&b.progress>=b.required&&b.durability>0);if(shelter){const gain=Math.min(26,100-a.energy),healing=Math.min(2,100-a.health);a.energy+=gain;a.health+=healing;record(s,shelter,a,'rest');return 'Rest restored '+gain+' energy and '+healing+' health at '+shelter.id+'; no food or water';}
 }
 if(['build','plant','tend','repair','deposit','withdraw','harvest'].includes(c.kind))throw Error('Unavailable settlement action');return null;
}
function tick(s,add){for(const b of s.structures){if(b.kind==='garden'&&s.turn%3===0&&s.turn>b.created&&s.turn-b.tended<=6){const gain=Math.min(2,12-b.stock);b.stock+=gain;if(gain)add(null,b.id+' grew '+gain+' food','production');}if(b.kind==='shelter'&&b.progress>=b.required&&s.turn%6===0&&b.durability>0){b.durability--;if(!b.durability)add(null,b.id+' needs repair before use','decay');}}
 for(const a of s.agents.filter(a=>a.alive)){for(const place of [...s.sites,...s.structures].filter(p=>distance(a,p)<=2)){const known={id:place.id,name:place.name||place.id,kind:place.kind,x:place.x,y:place.y,observedTurn:s.turn};a.knownPlaces=a.knownPlaces.filter(p=>p.id!==place.id);a.knownPlaces.push(known);a.knownPlaces=a.knownPlaces.slice(-24);}const key=a.x+','+a.y;s.footprints[key]=(s.footprints[key]||0)+1;}
}
function view(s,a){
 const structures=s.structures.filter(b=>distance(a,b)<=2),sites=s.sites.filter(b=>distance(a,b)<=2),objects=s.objects.filter(o=>o.holder===a.id||o.holder===null&&distance(a,o)<=2),actions=[];
 const option=(label,command)=>actions.push({label,command});
 for(const site of sites){if(!here(a,site)){option('Move toward '+site.name,{kind:'move',x:site.x,y:site.y});continue;}if(site.stock>0){if(site.kind!=='wood')option((site.kind==='water'?'Drink':'Eat')+' here at '+site.name,{kind:site.kind==='water'?'drink':'eat',target:site.id,amount:1});if(site.kind!=='water'&&a.inventory[site.kind]<8)option('Collect '+site.kind+' for carrying',{kind:'gather',target:site.id,amount:2});}}
 if(a.inventory.food>0)option('Eat carried food',{kind:'eat',amount:1});
 const jar=objects.find(o=>o.holder===a.id);if(jar?.water)option('Drink carried jar water',{kind:'drink',target:jar.id,amount:1});
 for(const o of objects)if(here(a,o)&&o.holder===null&&!jar)option('Pick up '+o.id,{kind:'take',target:o.id});
 if(jar){option('Put down '+jar.id,{kind:'drop',target:jar.id});if(jar.water<jar.capacity&&sites.some(b=>here(a,b)&&b.kind==='water'&&b.stock))option('Fill carried jar here',{kind:'fill',target:jar.id,amount:2});}
 const local=structures.filter(b=>here(a,b));
 if(a.inventory.wood>0){for(const kind of ['store','shelter']){const b=local.find(b=>b.kind===kind);if(b?b.progress<b.required:local.length<3)option('Contribute one wood to '+(b?.id||'new '+kind)+' here',{kind:'build',target:b?.id||kind});}}
 if(a.inventory.food>=2&&!local.some(b=>b.kind==='garden')&&local.length<3)option('Plant garden here using two food',{kind:'plant'});
 for(const b of structures){if(!here(a,b)){option('Move toward '+b.id,{kind:'move',x:b.x,y:b.y});continue;}
  if(b.kind==='garden'){option('Tend '+b.id,{kind:'tend',target:b.id});if(b.stock){option('Eat from '+b.id,{kind:'eat',target:b.id,amount:1});if(a.inventory.food<8)option('Harvest '+b.id,{kind:'harvest',target:b.id,amount:2});}}
  if(b.kind==='shelter'&&b.progress>=b.required&&b.durability<12&&a.inventory.wood)option('Repair '+b.id,{kind:'repair',target:b.id});
  if(b.kind==='store'&&b.progress>=b.required)for(const r of ['food','water','wood']){const carrier=r==='water'?jar:a.inventory;if(carrier?.[r]&&b.stock[r]<24)option('Deposit '+r+' into '+b.id,{kind:'deposit',target:b.id,resource:r,amount:1});if(b.stock[r]&&carrier&&carrier[r]<(r==='water'?jar.capacity:8))option('Withdraw '+r+' from '+b.id,{kind:'withdraw',target:b.id,resource:r,amount:1});if(b.stock[r]&&r!=='wood')option('Consume '+r+' at '+b.id,{kind:r==='food'?'eat':'drink',target:b.id,amount:1});}
 }
 for(const b of s.agents.filter(b=>b.alive&&b.id!==a.id&&distance(a,b)<=1)){if(a.inventory.food&&b.inventory.food<8)option('Give food to '+b.name,{kind:'give',target:String(b.id),amount:1});if(jar?.water)option('Pour water for '+b.name,{kind:'pour',target:String(b.id),amount:1});}
 for(const [dx,dy]of [[2,0],[-2,0],[0,2],[0,-2]]){const x=a.x+dx,y=a.y+dy;if(x>=0&&x<s.width&&y>=0&&y<s.height)option('Explore toward '+x+','+y,{kind:'move',x,y});}
 for(const p of a.knownPlaces.filter(p=>distance(a,p)>2))option('Move toward remembered '+(p.name||p.id)+' (last observed turn '+p.observedTurn+')',{kind:'move',x:p.x,y:p.y});
 option('Rest here'+(local.some(b=>b.kind==='shelter'&&b.progress>=b.required&&b.durability>0)?' in shelter':''),{kind:'rest'});option('Wait here',{kind:'wait'});
 return {worldVersion:2,visibleStructures:copy(structures.map(b=>({...b,history:b.history.slice(-8)}))),availableActions:actions,physicalFacts:['People never block movement or source access. Sharing a tile is allowed. No combat or theft penalty exists.','All completed stores and shelters can be used by anyone; claims in speech have no automatic enforcement.','Choose one physical action. Talking about doing something does not do it.','Build a store with 2 wood contributions or shelter with 4; one contribution per action. Plant a garden with 2 carried food.','Stores hold 24 of each resource. Gardens yield 2 food every third turn if tended within 6 turns, capacity 12.','A usable shelter improves rest to 26 energy and 2 health; loses 1 durability every 6 turns, repair costs 1 wood for 4 durability.','Forgiving conditions consume food and water every second turn; scarce conditions every turn. Energy costs 1 every turn.'],knownPlaces:copy(a.knownPlaces)};
}
const api={initialise,perform,tick,view};root.Settlement=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
