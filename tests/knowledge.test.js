const test=require('node:test');
const assert=require('node:assert/strict');
const World=require('../dist/referee-world.js');
const Systems=require('../dist/world.js');
const Inhabitant=require('../dist/inhabitant.js');
function fixture(){const person=(id,x)=>({id,name:id===1?'Adam':'Eve',alive:true,x,y:0,age:20,gen:0,parents:[],health:90,energy:90,food:20,water:20,genes:{curiosity:60},knowledge:[],seenTiles:[x],likes:{}});return {day:1,width:6,height:1,seed:4,weather:'clear',tiles:Array.from({length:6},(_,i)=>({...Systems.tile('grass',i),description:'Original ground '+i})),agents:[person(1,0),person(2,0)],nextId:3,events:[],explored:[0],tech:{nodes:[],trials:[]},openWorld:{enabled:true,entities:[{id:'growth',name:'Pale growth',description:'Soft pale folds',tile:0,quantity:4,knownBy:[],properties:{toxin:'secret bodily mechanism',nourishment:2}}],laws:[],history:[]}};}
const step=(state,p={},options={})=>World.apply(state,{summary:'A day of observations.',...p},[],options);
const view=(s,id=1)=>World.perception(s,s.agents.find(a=>a.id===id));
const entity=(s,id=1)=>view(s,id).entities.find(e=>e.id==='growth');
const away=s=>step(s,{agents:[{id:1,position:{x:3,y:0}},{id:2,position:{x:3,y:0}}]});
const directLearning={op:'update',id:'growth',knowledge:{1:{taste:'briny'}}};

test('distant terrain retains dated observations until revisited',()=>{
 let s=step(fixture());const original=view(s).visibleGround;s=away(s);
 s=step(s,{terrain:[{tile:0,type:'changed secret terrain',description:'A new distant feature'}]});
 const remembered=view(s).knownPlaces.find(p=>p.tile===0);assert.equal(remembered.type,'grass');assert.equal(remembered.description,'Original ground 0');assert.equal(remembered.evidence.observedDay,original.evidence.observedDay);assert.equal(remembered.evidence.current,false);assert.doesNotMatch(JSON.stringify(view(s)),/changed secret terrain|new distant feature/);
 s=step(s,{agents:[{id:1,position:{x:0,y:0}}]});assert.equal(view(s).visibleGround.type,'changed secret terrain');assert.equal(view(s).visibleGround.evidence.current,true);
});
test('entity identity, appearance, stock, hidden properties and remote knowledge do not refresh from truth',()=>{
 let s=step(fixture(),{entities:[directLearning]});s=away(s);
 s=step(s,{entities:[{op:'update',id:'growth',name:'Remote new name',description:'Remote new appearance',quantity:9}],transactions:[{kind:'observer',entity:'growth',amount:5,reason:'External addition'}]}, {observer:true});
 const memory=entity(s);assert.equal(memory.name,'Pale growth');assert.equal(memory.quantity,4);assert.deepEqual(memory.knownProperties,{taste:'briny'});assert.equal(memory.evidence.current,false);
 assert.doesNotMatch(JSON.stringify(view(s)),/Remote new|secret bodily mechanism/);
 const before=JSON.stringify(s);assert.throws(()=>step(s,{entities:[{op:'update',id:'growth',knowledge:{1:{secret:'a remote grant'}}}]}),/unobserved distant/);assert.equal(JSON.stringify(s),before);
});
test('deletion stays unknown at a distance, and a revisit records absence without guessing a new location',()=>{
 let s=away(step(fixture()));s=step(s,{entities:[{op:'remove',id:'growth'}],transactions:[{kind:'observer',entity:'growth',amount:-4,reason:'External removal'}]}, {observer:true});
 assert.equal(entity(s).quantity,4);assert.equal(entity(s).present,true);
 s=step(s,{agents:[{id:1,position:{x:0,y:0}}]});assert.equal(entity(s).present,false);assert.equal(entity(s).quantity,undefined);assert.equal(entity(s).tile,0);assert.equal(entity(s).evidence.current,true);
});
test('knownBy cannot reveal a concealed object; a reasoned local inspection can',()=>{
 let s=fixture();s.openWorld.entities=[];
 s=step(s,{entities:[{op:'create',id:'growth',name:'Buried growth',description:'A concealed organism',tile:0,quantity:2,concealed:true,knownBy:[1,2],properties:{toxin:'hidden'}}],transactions:[{kind:'observer',entity:'growth',amount:2,reason:'A concealed organism is placed here'}]}, {observer:true});
 assert.equal(view(s).entities.length,0);
 s=step(s,{observations:[{actor:1,entity:'growth',properties:{surface:'soft'},reason:'A shallow excavation reveals its surface'}]});assert.equal(entity(s).name,'Buried growth');assert.deepEqual(entity(s).knownProperties,{surface:'soft'});assert.equal(view(s,2).entities.length,0);assert.doesNotMatch(JSON.stringify(view(s)),/toxin|hidden/);
});
test('nearby people do not automatically inspect another person\'s carried inventory',()=>{
 let s=step(fixture(),{transactions:[{kind:'transfer',actor:1,entity:'growth',to:1,reason:'Pick it up'}]});s=step(s,{agents:[{id:1,position:{x:3,y:0}},{id:2,position:{x:3,y:0}}]});
 assert.equal(entity(s,1).tile,3);assert.equal(entity(s,1).evidence.current,true);assert.equal(entity(s,2).tile,0);assert.equal(entity(s,2).evidence.current,false);
});
test('reports copy a speaker\'s dated memory rather than remote truth, with explicit property selection',()=>{
 let s=step(fixture(),{entities:[directLearning]});s=away(s);
 s=step(s,{entities:[{op:'update',id:'growth',quantity:8}],transactions:[{kind:'observer',entity:'growth',amount:4,reason:'External addition'}]}, {observer:true});
 const observedDay=entity(s).evidence.observedDay;
 s=step(s,{speech:[{actor:1,text:'The pale folds I saw tasted briny.'}],reports:[{from:1,to:2,subject:'entity',subjectId:'growth',speech:0,propertyKeys:['taste']}]});
 const report=view(s,2).reports.find(r=>r.subjectId==='growth');assert.equal(report.value.quantity,4);assert.deepEqual(report.value.knownProperties,{taste:'briny'});assert.equal(report.evidence.kind,'hearsay');assert.equal(report.evidence.sourceActor,1);assert.equal(report.evidence.observedDay,observedDay);assert.equal(report.evidence.receivedDay,s.day);
 assert.deepEqual(entity(s,2).knownProperties,{});assert.doesNotMatch(JSON.stringify(view(s,2)),/secret bodily mechanism/);
 assert.throws(()=>step(s,{speech:[{actor:1,text:'I report a secret.'}],reports:[{from:1,to:2,subject:'entity',subjectId:'growth',speech:0,propertyKeys:['toxin']}]}),/unknown to its speaker/);
});
test('a person who only heard of an entity receives a labelled claim with no verified properties',()=>{
 let s=fixture();s.agents[1].x=3;s.agents[1].seenTiles=[3];s=step(s,{entities:[directLearning]});s=step(s,{agents:[{id:1,position:{x:3,y:0}}],speech:[{actor:1,text:'I saw pale folds and tasted them.'}],reports:[{from:1,to:2,subject:'entity',subjectId:'growth',speech:0,propertyKeys:['taste']}]});
 const reported=entity(s,2);assert.equal(reported.evidence.kind,'hearsay');assert.deepEqual(reported.knownProperties,{});assert.deepEqual(reported.reportedProperties,{taste:'briny'});assert.equal(reported.quantity,4);
});
test('reports require audible source speech and prior speaker knowledge',()=>{
 const s=step(fixture()),report={from:1,to:2,subject:'entity',subjectId:'growth',speech:0};
 assert.throws(()=>step(s,{reports:[report]}),/audible statement/);
 assert.throws(()=>step(s,{speech:[{actor:2,text:'A statement.'}],reports:[report]}),/audible statement/);
 assert.throws(()=>step(s,{agents:[{id:2,position:{x:3,y:0}}],speech:[{actor:1,text:'A distant statement.'}],reports:[report]}),/audible statement/);
 assert.throws(()=>step(s,{speech:[{actor:1,text:'An invented object.'}],reports:[{...report,subjectId:'never-seen'}]}),/never observed or heard/);
});
test('generic speech records a heard claim without sharing a whole discovery inventory',()=>{
 let s=step(fixture(),{discoveries:[{id:'finding-a',name:'First finding',detail:'An established effect',learners:[1],entityIds:['growth']},{id:'finding-b',name:'Second finding',detail:'Another established effect',learners:[1],entityIds:['growth']}]});
 s=step(s,{speech:[{actor:1,text:'I am curious about these folds.'}]});assert.equal(view(s,2).discoveries.length,0);assert.equal(view(s,2).experiences.at(-1).evidence.kind,'hearsay');assert.equal(view(s,2).experiences.at(-1).evidence.sourceActor,1);
 s=step(s,{speech:[{actor:1,text:'I explain my first finding.'}],reports:[{from:1,to:2,subject:'discovery',subjectId:'finding-a',speech:0}]});assert.deepEqual(view(s,2).discoveries.map(d=>d.id),['finding-a']);assert.equal(view(s,2).discoveries[0].evidence.kind,'hearsay');
});
test('inferences cite private evidence and remain hypotheses without changing physical or learned facts',()=>{
 let s=step(fixture()),id=entity(s).evidence.recordId,foreign=entity(s,2).evidence.recordId;s=step(s,{inferences:[{actor:1,claim:'The folds might react to sunlight.',evidenceIds:[id]}]});
 assert.equal(view(s).inferences[0].evidence.kind,'inference');assert.match(view(s).inferences[0].claim,/might/);assert.deepEqual(entity(s).knownProperties,{});assert.equal(s.tech.nodes.length,0);assert.equal(s.openWorld.entities[0].properties.nourishment,2);
 assert.throws(()=>step(s,{inferences:[{actor:1,claim:'An unsupported conclusion',evidenceIds:[foreign]}]}),/another person's private evidence/);
});
test('discovery snapshots do not change with global records or grant new concepts remotely',()=>{
 const initial=fixture();initial.agents[1].x=3;initial.agents[1].seenTiles=[3];let s=step(initial,{discoveries:[{id:'finding',name:'A finding',detail:'Personally established detail',learners:[1],entityIds:['growth']}]});s.tech.nodes[0].detail='A later hidden global edit';assert.equal(view(s).discoveries[0].detail,'Personally established detail');
 s=step(s,{agents:[{id:2,position:{x:3,y:0}}]});assert.throws(()=>step(s,{discoveries:[{id:'remote',name:'A remote finding',detail:'Unearned knowledge',learners:[2],entityIds:['growth']}]}),/own evidence/);
});
test('old saves import only saved snapshots and mark missing dates/appearances as unknown',()=>{
 const s=fixture();s.agents[0].x=3;s.agents[0].seenTiles=[0,3];s.agents[0].exploration={ground:{0:{type:'forged-current-terrain',revision:0}}};s.openWorld.entities[0].knownBy=[1];s.openWorld.entities[0].name='A new remote secret name';
 const p=view(s);assert.equal(p.knownPlaces.find(t=>t.tile===0).type,'unknown (previously visited)');assert.equal(p.knownPlaces.find(t=>t.tile===0).evidence.observedDay,null);assert.equal(p.entities[0].tile,undefined);assert.equal(p.entities[0].quantity,undefined);assert.doesNotMatch(JSON.stringify(p),/secret name|forged-current-terrain|secret bodily mechanism/);assert.equal(s.agents[0].perceptionMemory,undefined);
});
test('save/reload and expanded coordinates preserve records and source links',()=>{
 let s=step(fixture());s=away(s);s=step(s,{speech:[{actor:1,text:'I remember the place.'}],reports:[{from:1,to:2,subject:'place',subjectId:0,speech:0}]});
 const before=view(s,2).reports[0],id=before.evidence.sourceRecordId;s=step(JSON.parse(JSON.stringify(s)),{expand:{west:2,north:1}});const p=view(s,2),report=p.reports[0];assert.equal(report.value.tile,10);assert.equal(report.evidence.sourceRecordId,id);assert.equal(report.evidence.tile,13);assert.equal(p.knownPlaces.find(t=>t.tile===10).type,'grass');
});
test('new people do not inherit parental evidence or private learned properties',()=>{
 let s=step(fixture(),{entities:[directLearning]});s=step(s,{newPeople:[{name:'Child',tile:0,parents:[1,2],reason:'A birth',condition:{health:80,energy:50,food:2,water:2}}],reserveTransfers:[{from:1,to:'new:0',meter:'food',amount:2,reason:'Provision the child'},{from:2,to:'new:0',meter:'water',amount:2,reason:'Provision the child'}]});
 const child=view(s,3);assert.equal(child.discoveries.length,0);assert.deepEqual(child.entities[0].knownProperties,{});assert.ok(s.agents[2].perceptionMemory.records.every(r=>r.observer===3));assert.equal(s.agents[2].perceptionMemory.records.some(r=>r.id.startsWith('1:')),false);
});
test('views are detached record projections accepted by the inhabitant protocol',()=>{
 const s=step(fixture()),p=view(s),before=JSON.stringify(s);Inhabitant.request({actor:1,operation:'intention',view:p});p.entities[0].name='Changed in a response';p.knownPlaces[0].type='Changed in a response';assert.equal(JSON.stringify(s),before);
});

test('historical observations can support reflection after the physical object is deleted',()=>{
 let s=step(fixture()),recordId=entity(s).evidence.recordId;s=away(s);s=step(s,{entities:[{op:'remove',id:'growth'}],transactions:[{kind:'observer',entity:'growth',amount:-4,reason:'External removal'}]},{observer:true});
 s=step(s,{discoveries:[{id:'remembered-pattern',name:'A remembered pattern',detail:'A regularity in previously observed folds.',learners:[1],evidenceIds:[recordId]}]});assert.equal(view(s).discoveries[0].evidence.sourceRecordId,recordId);
});
test('reports from different sources remain attributed even when they disagree',()=>{
 let s=fixture();s.agents.push({...JSON.parse(JSON.stringify(s.agents[1])),id:3,name:'Ari',x:3,seenTiles:[3]});s.nextId=4;
 s=step(s);s=step(s,{agents:[{id:1,position:{x:3,y:0}}],speech:[{actor:1,text:'I saw four pale folds.'}],reports:[{from:1,to:3,subject:'entity',subjectId:'growth',speech:0}]});
 s=step(s,{entities:[{op:'update',id:'growth',quantity:9}],transactions:[{kind:'observer',entity:'growth',amount:5,reason:'External addition'}]},{observer:true});
 s=step(s,{agents:[{id:2,position:{x:3,y:0}}],speech:[{actor:2,text:'I saw nine pale folds.'}],reports:[{from:2,to:3,subject:'entity',subjectId:'growth',speech:0}]});
 const reports=view(s,3).reports.filter(r=>r.subjectId==='growth');assert.deepEqual(reports.map(r=>r.value.quantity),[4,9]);assert.deepEqual(reports.map(r=>r.evidence.sourceActor),[1,2]);assert.equal(entity(s,3).evidence.kind,'hearsay');assert.deepEqual(entity(s,3).knownProperties,{});
});
test('a report or hypothesis cannot be cited as a verified personal discovery',()=>{
 let s=fixture();s.agents[1].x=3;s.agents[1].seenTiles=[3];s=step(s);s=step(s,{agents:[{id:1,position:{x:3,y:0}}],speech:[{actor:1,text:'I saw pale folds.'}],reports:[{from:1,to:2,subject:'entity',subjectId:'growth',speech:0}]});
 const reportId=entity(s,2).evidence.recordId;assert.throws(()=>step(s,{discoveries:[{id:'unverified',name:'Unverified claim',detail:'A claim repeated as fact',learners:[2],evidenceIds:[reportId]}]}),/not a report or hypothesis/);
});

test('revisiting updates visible stock without re-dating old property tests',()=>{
 let s=step(fixture(),{entities:[directLearning]});const learned=entity(s).propertyEvidence.taste.observedDay;s=step(s);assert.equal(entity(s).evidence.observedDay,s.day);assert.equal(entity(s).propertyEvidence.taste.observedDay,learned);
 s=step(s,{speech:[{actor:1,text:'I remember how it tasted.'}],reports:[{from:1,to:2,subject:'entity',subjectId:'growth',speech:0,propertyKeys:['taste']}]});const report=view(s,2).reports[0];assert.equal(report.value.propertyEvidence.taste.observedDay,learned);
});
test('cited evidence survives the recent-audit retention window without refreshing its contents',()=>{
 const Knowledge=require('../dist/knowledge.js');let s=step(fixture());const id=entity(s).evidence.recordId;s=step(s,{inferences:[{actor:1,claim:'The folds might respond to light.',evidenceIds:[id]}]});
 for(let i=0;i<410;i++){s.tiles[0].description='A directly observed change '+i;Knowledge.refresh(s);}
 const memory=s.agents[0].perceptionMemory;assert.ok(memory.records.length<=400);assert.equal(memory.references[id].value.quantity,4);assert.ok(memory.facts);assert.equal(view(s).inferences[0].evidenceIds[0],id);
});
