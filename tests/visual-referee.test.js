const test=require('node:test');
const assert=require('node:assert/strict');
const visual=require('../dist/visual-referee.js');

function world(){return {day:8,weather:'rain',width:2,height:1,explored:[0,1],tiles:[{type:'forest',food:1,water:0,wood:7,stone:0,visits:12,structures:[{kind:'shelter',name:'Leaf shelter',day:6}],items:[]},{type:'water',food:0,water:9,wood:0,stone:0,visits:2,structures:[],items:[]}],agents:[{name:'Adam',alive:true,x:0,y:0,lastAction:'Building shelter',health:80}],events:[{day:8,type:'build',text:'Adam builds a leaf shelter at (1, 1).'}]}}

test('fallback appearance derives satellite features from authoritative world state',()=>{
 const state=world(),plan=visual.fallback(state);
 assert.match(plan.title,/Rain/i);assert.ok(plan.regions.some(region=>region.tiles.includes(0)));assert.ok(plan.marks.some(mark=>mark.label==='Built ground'));assert.ok(plan.marks.some(mark=>mark.label==='Repeated travel'));assert.equal(plan.palette.water,'#315f69');
});

test('model plans accept dynamic marks while constraining coordinates and colours',()=>{
 const state=world(),plan=visual.parse({title:'Wet settlement edge',rationale:'Rain and travel darken the clearing.',palette:{ground:'#445533',water:'#224466',roof:'not-a-colour'},atmosphere:{saturation:4,contrast:.1,haze:.2,warmth:-.4},regions:[{tiles:[0,99],tint:'#556644',canopy:.8,moisture:.9,soil:.4,texture:'muddy canopy'}],marks:[{tile:0,x:.4,y:.6,radius:.3,rotation:22,color:'#6f5038',opacity:.3,shape:'polygon',texture:'mud and worn earth',label:'Shelter clearing'},{tile:99,x:9,y:-4,radius:9,color:'bad',shape:'anything'}]},state);
 assert.equal(plan.palette.ground,'#445533');assert.equal(plan.palette.roof,'#9b704c');assert.equal(plan.atmosphere.saturation,1.35);assert.deepEqual(plan.regions[0].tiles,[0]);assert.equal(plan.marks.length,2);assert.equal(plan.marks[1].tile,1);assert.equal(plan.marks[1].shape,'ellipse');assert.equal(plan.marks[1].x,.98);
});

test('one visual referee plan is saved per day and reused',async()=>{
 const state=world();let calls=0;
 const entry=await visual.review(state,async prompt=>{calls++;assert.match(prompt,/overhead satellite/i);assert.match(prompt,/never invent/i);return {title:'Model-directed rain',rationale:'Rain darkens occupied ground.',palette:{ground:'#43563f'},atmosphere:{saturation:.8,contrast:1.1,haze:.12,warmth:0},regions:[{tiles:[0],tint:'#40583f',canopy:.9,moisture:1,soil:.3,texture:'wet woodland'}],marks:[{tile:0,x:.5,y:.5,radius:.3,rotation:0,color:'#705a42',opacity:.2,shape:'ellipse',texture:'settlement clearing',label:'Built clearing'}]}});
 assert.equal(entry.status,'complete');assert.equal(entry.plan.title,'Model-directed rain');assert.equal(visual.current(state).palette.ground,'#43563f');
 await visual.review(state,()=>{throw Error('must not repeat')});assert.equal(calls,1);assert.equal(state.visualDirection.history.length,1);
});

test('model failure leaves a world-derived visual plan instead of a blank map',async()=>{
 const state=world(),entry=await visual.review(state,async()=>{throw Error('offline')});
 assert.equal(entry.status,'fallback');assert.ok(entry.plan.regions.length);assert.match(entry.error,/offline/);
});
