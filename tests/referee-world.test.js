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
 assert.throws(()=>World.parseIntention({action:'Eat the unknown thing',targetEntityIds:['not-observed']},state,a),/unknown/);
});
test('a novel edible encounter can nourish and harm, with persistent delayed consequences',()=>{
 const state=fixture(),before=JSON.stringify(state);
 const next=World.apply(state,{summary:'The unfamiliar flesh eases hunger but causes cramps.',entities:[{op:'create',id:'shore-morsel',name:'Pale folded morsel',description:'A moist folded piece of flesh',tile:0,quantity:1,properties:{nourishment:2,species:'unknown shore organism',delayedEffect:'cramps may worsen tomorrow'},knownBy:[1],knowledge:{1:{taste:'briny'}}}],transactions:[{kind:'encounter',entity:'shore-morsel',actor:1,amount:2,reason:'A shore organism is encountered'},{kind:'consume',entity:'shore-morsel',actor:1,amount:1,reason:'A small taste'}],agents:[{id:1,delta:{health:-9,water:-1},experience:'It tasted briny; my stomach now hurts.',states:[{name:'cramps',description:'Unresolved discomfort after tasting flesh'}]}]});
 assert.equal(JSON.stringify(state),before);assert.equal(next.agents[0].food,7);assert.equal(next.agents[0].health,71);assert.equal(next.agents[0].water,3);assert.equal(next.agents[0].worldStates[0].name,'cramps');assert.match(World.outcomePrompt(next,[]),/cramps may worsen/);
 assert.doesNotMatch(JSON.stringify(World.perception(next,next.agents[0])),/cramps may worsen tomorrow/);
});
test('discovery and physical construction require no predefined recipe or material categories',()=>{
 const state=fixture();state.openWorld.entities.push({id:'flakes',name:'Loose flakes',description:'Reflective fragments',tile:0,quantity:2});const next=World.apply(state,{summary:'Layering unfamiliar flakes creates a reflective screen.',entities:[{op:'create',id:'screen',name:'Layered reflective screen',description:'A tilted surface of overlapping bright flakes',tile:0,structure:true,quantity:1,properties:{function:'redirects glare'},knownBy:[1],appearance:{color:'#a7bfc0',shape:'irregular folded sheet'}}],transactions:[{kind:'transform',actor:1,inputs:[{entity:'flakes',amount:2}],outputs:[{entity:'screen',amount:1}],reason:'Assemble flakes'}],discoveries:[{id:'redirect-glare',name:'Redirecting glare',detail:'Tilted overlapping flakes direct light toward a chosen place.',learners:[1],entityIds:['screen']}]});
 assert.equal(next.tech.nodes[0].effect,'open');assert.deepEqual(next.agents[0].knowledge,['redirect-glare']);assert.equal(next.openWorld.entities.find(e=>e.id==='screen').structure,true);
});
test('daily upkeep runs even when a referee omits bodily changes',()=>{
 const state=fixture();const next=World.apply(state,{summary:'The day passes without a bodily change.'});
 assert.equal(next.agents[0].food,5);assert.equal(next.agents[0].water,4);assert.equal(next.agents[0].energy,58);assert.equal(next.agents[0].health,80);assert.equal(next.day,2);
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
 let state=World.apply(fixture(),{summary:'A dull growth is noticed.',entities:[{op:'create',id:'growth',name:'Dull growth',description:'A soft spreading patch',tile:0,quantity:4,knownBy:[1],properties:{toxin:'hidden'}}],transactions:[{kind:'encounter',actor:1,entity:'growth',amount:4,reason:'A growth is encountered'}]});
 state=World.apply(state,{summary:'Adam walks away.',agents:[{id:1,position:{x:1,y:0}}]});
 state=World.apply(state,{summary:'An observer adds to the distant growth.',entities:[{op:'update',id:'growth',quantity:9}],transactions:[{kind:'observer',entity:'growth',amount:5,reason:'External addition'}]},[],{observer:true});
 const view=World.perception(state,state.agents[0]);assert.equal(view.entities[0].quantity,4);assert.doesNotMatch(JSON.stringify(view),/toxin|hidden/);
});
test('state records cannot inject prototype properties',()=>{
 const state=fixture();assert.throws(()=>World.validate('{"summary":"bad","entities":[{"op":"create","id":"a","name":"A","description":"A","tile":0,"properties":{"__proto__":{"polluted":true}}}]}',state),/Invalid world property/);assert.equal({}.polluted,undefined);
});
test('referees can expand the horizon without exploration thresholds and keep existing locations attached',()=>{
 const state=fixture();state.openWorld.entities=[{id:'old',name:'Old marker',tile:0,quantity:1,knownBy:[1]}];
 const next=World.apply(state,{summary:'The traveller finds ground beyond the northern edge.',expand:{north:1,east:1},terrain:[{tile:0,type:'salt ridge',description:'A bright crust',color:'#aa9988'}],agents:[{id:1,position:{x:0,y:0},experience:'I reach a bright ridge.'}],entities:[{op:'create',id:'ridge-mark',name:'Spiral crust',description:'Curved raised ridges',tile:0,knownBy:[1]}],transactions:[{kind:'encounter',actor:1,entity:'ridge-mark',amount:1,reason:'A ridge feature is encountered'}]});
 assert.equal(next.width,3);assert.equal(next.height,2);assert.equal(next.openWorld.entities[0].tile,3);assert.equal(next.tiles[3].type,'grass');assert.equal(next.tiles[0].type,'salt ridge');assert.ok(next.agents[0].seenTiles.includes(3));assert.ok(next.agents[0].seenTiles.includes(0));
});
