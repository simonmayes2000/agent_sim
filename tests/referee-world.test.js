const test=require('node:test');
const assert=require('node:assert/strict');
const World=require('../dist/referee-world.js');
const Systems=require('../dist/world.js');
function fixture(){const state={day:1,width:2,height:1,weather:'clear',seed:42,tiles:[Systems.tile('grass',0),Systems.tile('rock',1)],agents:[{id:1,name:'Adam',alive:true,x:0,y:0,health:80,food:6,water:5,energy:60,age:20,gen:0,parents:[],genes:{curiosity:50},knowledge:[],seenTiles:[0],likes:{},supplies:{},knownItems:{}}],tech:{nodes:[],trials:[]},events:[],nextId:2,explored:[0]};World.ensure(state);return state;}
test('different starting geographies contain no fixed first food or free resource inventory',()=>{
 const a=World.geography(8,6,100,Systems.tile),b=World.geography(8,6,200,Systems.tile);
 assert.notDeepEqual(a.map(t=>t.type),b.map(t=>t.type));assert.ok(a.every(t=>t.type!=='berry'&&['food','water','wood','stone','fibre'].every(k=>t[k]===0)));
});
test('intentions are free text, without recipe candidates or an enforced need hierarchy',()=>{
 const state=fixture(),a=state.agents[0];const p=World.parseIntention({action:'Watch how the wind carries a loose surface fragment',reason:'I am curious',goal:{title:'Understand the moving ground'},targetEntityIds:[]},state,a);
 assert.match(p.action,/wind carries/);assert.match(World.intentionPrompt(state,a),/not choosing from a menu/);
 const uncertain=World.parseIntention({action:'Look for the unknown thing',targetEntityIds:['not-observed']},state,a);assert.deepEqual(uncertain.targetEntityIds,[]);assert.deepEqual(uncertain.unverifiedReferences,['not-observed']);assert.deepEqual(a.knowledge,[]);
});
test('a novel edible encounter can nourish and harm, with persistent delayed consequences',()=>{
 const state=fixture(),before=JSON.stringify(state);
 const next=World.apply(state,{summary:'The unfamiliar flesh eases hunger but causes cramps.',entities:[{op:'create',id:'shore-morsel',name:'Pale folded morsel',description:'A moist folded piece of flesh',tile:0,quantity:1,properties:{species:'unknown shore organism',delayedEffect:'cramps may worsen tomorrow'},knownBy:[1],knowledge:{1:{taste:'briny'}}}],agents:[{id:1,delta:{food:2,health:-9,water:-1},experience:'It tasted briny; my stomach now hurts.',states:[{name:'cramps',description:'Unresolved discomfort after tasting flesh'}]}]});
 assert.equal(JSON.stringify(state),before);assert.equal(next.agents[0].food,8);assert.equal(next.agents[0].health,71);assert.equal(next.agents[0].water,4);assert.equal(next.agents[0].worldStates[0].name,'cramps');assert.match(World.outcomePrompt(next,[]),/cramps may worsen/);
 assert.doesNotMatch(JSON.stringify(World.perception(next,next.agents[0])),/cramps may worsen tomorrow/);
});
test('discovery and physical construction require no predefined recipe or material categories',()=>{
 const state=fixture();const next=World.apply(state,{summary:'Layering unfamiliar flakes creates a reflective screen.',entities:[{op:'create',id:'screen',name:'Layered reflective screen',description:'A tilted surface of overlapping bright flakes',tile:0,structure:true,quantity:1,properties:{function:'redirects glare'},knownBy:[1],appearance:{color:'#a7bfc0',shape:'irregular folded sheet'}}],discoveries:[{id:'redirect-glare',name:'Redirecting glare',detail:'Tilted overlapping flakes direct light toward a chosen place.',learners:[1],entityIds:['screen']}]});
 assert.equal(next.tech.nodes[0].effect,'open');assert.deepEqual(next.agents[0].knowledge,['redirect-glare']);assert.equal(next.openWorld.entities[0].structure,true);
});
test('food effects and recovery never happen automatically behind the referees',()=>{
 const state=fixture();const next=World.apply(state,{summary:'The day passes without a bodily change.'});
 for(const k of ['food','water','energy','health'])assert.equal(next.agents[0][k],state.agents[0][k]);assert.equal(next.day,2);
});
test('arbitrary terrain and world laws persist as referee-owned facts',()=>{
 const state=fixture();const next=World.apply(state,{summary:'The ground crust darkens after rain.',terrain:[{tile:0,type:'dark porous crust',description:'Perforated mineral plates',color:'#443e37',properties:{porosity:'high'}}],laws:[{id:'crust-response',description:'Repeated soaking loosens these plates.'}],weather:{name:'drifting salt fog',description:'Fine salt hangs close to the ground.'}});
 assert.equal(next.tiles[0].type,'dark porous crust');assert.equal(next.weather,'drifting salt fog');assert.match(next.openWorld.laws[0].description,/soaking/);
});
test('invalid references, negative quantities and duplicate bodily deltas cannot partially mutate state',()=>{
 const state=fixture(),before=JSON.stringify(state);
 assert.throws(()=>World.apply(state,{summary:'Invalid change',entities:[{op:'create',id:'new',name:'Thing',description:'Something',tile:0,quantity:-1}]}),/negative/);
 assert.throws(()=>World.apply(state,{summary:'Invalid change',agents:[{id:1,delta:{health:-50}},{id:1,delta:{health:-50}}]}),/one combined/);
 assert.throws(()=>World.apply(state,{summary:'Invalid change',agents:[{id:99,delta:{health:1}}]}),/unknown person/);assert.equal(JSON.stringify(state),before);
});
test('distant observations retain their last-known quantities and do not expose hidden properties',()=>{
 let state=World.apply(fixture(),{summary:'A dull growth is noticed.',entities:[{op:'create',id:'growth',name:'Dull growth',description:'A soft spreading patch',tile:0,quantity:4,knownBy:[1],properties:{toxin:'hidden'}}]});
 state=World.apply(state,{summary:'Adam walks away.',agents:[{id:1,position:{x:1,y:0}}]});
 state=World.apply(state,{summary:'The distant growth spreads.',entities:[{op:'update',id:'growth',quantity:9}]});
 const view=World.perception(state,state.agents[0]);assert.equal(view.entities[0].quantity,4);assert.doesNotMatch(JSON.stringify(view),/toxin|hidden/);
});
test('state records cannot inject prototype properties',()=>{
 const state=fixture();assert.throws(()=>World.validate('{"summary":"bad","entities":[{"op":"create","id":"a","name":"A","description":"A","tile":0,"properties":{"__proto__":{"polluted":true}}}]}',state),/Invalid world property/);assert.equal({}.polluted,undefined);
});
test('referees can expand the horizon without exploration thresholds and keep existing locations attached',()=>{
 const state=fixture();state.openWorld.entities=[{id:'old',name:'Old marker',tile:0,quantity:1,knownBy:[1]}];
 const next=World.apply(state,{summary:'The traveller finds ground beyond the northern edge.',expand:{north:1,east:1},terrain:[{tile:0,type:'salt ridge',description:'A bright crust',color:'#aa9988'}],agents:[{id:1,position:{x:0,y:0},experience:'I reach a bright ridge.'}],entities:[{op:'create',id:'ridge-mark',name:'Spiral crust',description:'Curved raised ridges',tile:0,knownBy:[1]}]});
 assert.equal(next.width,3);assert.equal(next.height,2);assert.equal(next.openWorld.entities[0].tile,3);assert.equal(next.tiles[3].type,'grass');assert.equal(next.tiles[0].type,'salt ridge');assert.ok(next.agents[0].seenTiles.includes(3));assert.ok(next.agents[0].seenTiles.includes(0));
});
test('an intention can name a known object without copying its internal ID',()=>{
 const state=fixture();state.openWorld.entities=[{id:'encounter-17',name:'Pale folded growth',tile:0,knownBy:[1],quantity:1}];
 const intent=World.parseIntention({action:'Inspect the pale growth',targetEntityIds:['pale folded growth']},state,state.agents[0]);assert.deepEqual(intent.targetEntityIds,['encounter-17']);assert.deepEqual(intent.unverifiedReferences,[]);
});
test('a consumed or removed entity remains valid evidence of a discovery',()=>{
 const state=fixture();state.openWorld.entities=[{id:'sample',name:'Folded morsel',description:'A small folded piece',tile:0,knownBy:[1],quantity:1}];
 const next=World.apply(state,{summary:'The last piece is eaten and the effect is observed.',entities:[{op:'remove',id:'sample'}],discoveries:[{id:'effect',name:'A bodily effect',detail:'The small piece eased hunger.',learners:[1],entityIds:['Folded morsel']}]});
 assert.equal(next.openWorld.entities.length,0);assert.deepEqual(next.tech.nodes[0].entityIds,['sample']);assert.deepEqual(next.agents[0].knowledge,['effect']);
 const later=World.apply(next,{summary:'The earlier experience supports a later reflection.',discoveries:[{id:'later-reflection',name:'A later reflection',detail:'The earlier small piece had an effect.',learners:[1],entityIds:['sample']}]});assert.deepEqual(later.tech.nodes.at(-1).entityIds,['sample']);
});
test('invented discovery evidence still requires correction instead of being silently accepted',()=>{
 assert.throws(()=>World.validate({summary:'A discovery',discoveries:[{id:'effect',name:'Effect',detail:'An alleged effect',learners:[1],entityIds:['never-existed']}]},fixture()),/Discovery evidence does not exist: never-existed/);
});
test('malformed JSON and bad references are repaired before any changes are applied',async()=>{
 const state=fixture(),before=JSON.stringify(state),requests=[],errors=[];
 const results=['{"summary":"Broken JSON","entities":[',JSON.stringify({summary:'Bad reference',discoveries:[{id:'effect',name:'Effect',detail:'Some effect',entityIds:['missing']}] }),JSON.stringify({summary:'An observation of the ground.',discoveries:[{id:'ground',name:'Ground texture',detail:'The ground has a coarse texture.',learners:[1],entityIds:[]}]})];
 const result=await World.requestValidated(async(prompt,attempt)=>{requests.push({prompt,attempt});return results[attempt];},'Resolve this world without inventing facts.',raw=>World.validate(raw,state),error=>errors.push(error));
 assert.equal(requests.length,3);assert.equal(errors.length,2);assert.match(requests[1].prompt,/RESPONSE TO REPAIR/);assert.match(requests[2].prompt,/missing/);assert.equal(JSON.stringify(state),before);assert.equal(World.apply(state,result).day,2);
});
test('failed repairs are bounded and network failures are not treated as malformed model output',async()=>{
 let calls=0;await assert.rejects(World.requestValidated(async()=>{calls++;return '{bad';},'Return JSON',raw=>World.validate(raw,fixture())),/after 3 attempts/);assert.equal(calls,3);
 calls=0;await assert.rejects(World.requestValidated(async()=>{calls++;throw Error('Service offline');},'Return JSON',raw=>World.validate(raw,fixture())),/Service offline/);assert.equal(calls,1);
});
test('saved day two outcomes resolve names and case variants before council and application',()=>{
 const state=fixture();state.day=2;state.openWorld.lastError='Cannot change an entity that does not exist.';
 state.openWorld.entities=[{id:'growth-17',name:'Pale folded growth',description:'A folded patch',tile:0,quantity:3,knownBy:[1]}];
 const proposal=World.validate({summary:'One portion is examined.',entities:[{op:'update',id:'PALE FOLDED GROWTH',quantity:2}]},state);
 assert.equal(proposal.entities[0].id,'growth-17');assert.equal(proposal.referenceCorrections.length,1);
 const next=World.apply(state,proposal);assert.equal(next.day,3);assert.equal(next.openWorld.lastError,null);assert.equal(next.openWorld.entities[0].quantity,2);assert.equal(state.openWorld.entities[0].quantity,3);
 const removed=World.apply(next,{summary:'The patch is removed.',entities:[{op:'remove',id:'GROWTH-17'}]});assert.equal(removed.openWorld.entities.length,0);
});
test('fully specified first encounters mislabeled update become explicit council-reviewable creations',()=>{
 const state=fixture(),p=World.validate({summary:'A new material is noticed.',entities:[{op:'update',id:'unfamiliar',name:'Loose curls',description:'Thin curls on the ground',tile:0,quantity:2,knownBy:[1]}],discoveries:[{id:'curls',name:'Surface curls',detail:'The ground bears loose curls.',learners:[1],entityIds:['Loose curls']}]},state);
 assert.equal(p.entities[0].op,'create');assert.match(p.referenceCorrections[0].reason,/NEW creation/);assert.equal(World.apply(state,p).openWorld.entities[0].id,'unfamiliar');
 assert.deepEqual(p.discoveries[0].entityIds,['unfamiliar']);
});
test('explicit create can follow its update in output without losing the update',()=>{
 const next=World.apply(fixture(),{summary:'A loose object is found and moved.',entities:[{op:'update',id:'Loose curl',tile:1},{op:'create',id:'curl',name:'Loose curl',description:'A curled fragment',tile:0}]});
 assert.equal(next.openWorld.entities[0].tile,1);assert.deepEqual(next.openWorld.history[0].changes.entities.map(e=>e.op),['create','update']);
});
test('missing, ambiguous and already removed objects cannot grant unsupported changes',()=>{
 const state=fixture();state.openWorld.entities=[{id:'a',name:'Fragment',tile:0},{id:'b',name:'Fragment',tile:1}];
 const before=JSON.stringify(state);
 for(const operation of [{op:'update',id:'missing',quantity:4},{op:'update',id:'Fragment',quantity:4},{op:'remove',id:'never-existed'}])assert.throws(()=>World.apply(state,{summary:'Unsupported',entities:[operation],agents:[{id:1,delta:{food:3}}]}),/Current mutable IDs.*"a".*"b"/);
 assert.throws(()=>World.apply(state,{summary:'Double removal',entities:[{op:'remove',id:'a'},{op:'remove',id:'a'}]}),/already removed/);
 state.openWorld.history=[{changes:{entities:[{op:'create',id:'gone',name:'Old fragment'}]}}];
 assert.throws(()=>World.validate({summary:'Resurrection',entities:[{op:'update',id:'gone',name:'Old fragment',description:'Previously consumed',tile:0}]},state),/not a current object/);
 state.openWorld.history=[];assert.equal(JSON.stringify(state),before);
});
