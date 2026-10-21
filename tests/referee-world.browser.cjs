const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
  const root=path.resolve(__dirname,'../dist');
  const server=http.createServer((req,res)=>{
    const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);
    try{
      const data=fs.readFileSync(file);
      res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');
      res.end(data);
    }catch{res.statusCode=404;res.end()}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/__source-council/status',route=>route.fulfill({json:{connected:false}}));
    const url=`http://127.0.0.1:${server.address().port}`;
    const roles=require('../dist/council.js').reviewers;
    let resolutions=0,veto=false,unavailable=false,badLedger=false,settle=false,badIdentity=false;
    const seen=[];
    await page.route('**/api/council',route=>{seen.push(route.request().postDataJSON());return route.fulfill({json:{votes:roles.map(name=>({name,approve:!(veto&&name==='Causality'),reason:veto?'The proposed cause is unsupported.':'Consistent with this world.'}))}});});
    await page.route('**/api/inhabitant',route=>{
      const body=route.request().postDataJSON();seen.push(body);
      if(unavailable)return route.fulfill({status:503,json:{error:'Tool-free inhabitant inference is offline.'}});
      const intention={action:resolutions?'Try a tiny portion of the folded material':'Inspect the unfamiliar ground for anything interesting',reason:'I want to understand this place',goal:{title:'Understand what I encounter',reason:'I am curious',next:'Look closely'},targetEntityIds:[]};
      return route.fulfill({json:body.operation==='intention'?{actor:badIdentity?body.actor+10:body.actor,operation:body.operation,intention}:{actor:body.actor,operation:body.operation,text:'I do not know.'}});
    });
    await page.route('**/api/referee',route=>{
      const body=route.request().postDataJSON();seen.push(body);
      if(unavailable&&body.purpose?.startsWith('world-'))return route.fulfill({status:503,json:{error:'The referee service is offline.'}});
      let response={text:'I do not know yet.'};

      if(body.purpose==='world-resolution'){
        resolutions++;
        response.text=JSON.stringify(resolutions===1?{summary:'They notice a pale folded growth and try to understand it.',entities:[{op:'create',id:'folded-growth',name:'Pale folded growth',description:'A moist fan of translucent folds close to the ground.',kind:'unfamiliar living material',tile:16,quantity:3,knownBy:[1,2],properties:{nourishment:2,delayedEffect:'May cause cramps if eaten'},appearance:{color:'#c8b99b',shape:'folded fan',scale:.4}}],transactions:[{kind:'encounter',actor:1,entity:'folded-growth',amount:3,reason:'They encounter a natural growth'}],agents:[{id:1,experience:'I see a pale folded growth, but I do not know its use.',goal:{status:'active',progress:25,next:'Inspect without assuming it is food'}},{id:2,experience:'Adam pointed out something folded on the ground.'}],weather:{name:'thin silver mist',description:'Fine droplets hang above the ground.'}}:{summary:'A tiny portion eases hunger but causes discomfort. Eve makes a screen from loose flakes.',entities:[{op:'create',id:'raw-flakes-'+resolutions,name:'Loose flakes',description:'Reflective loose fragments',tile:17,quantity:0,knownBy:[2]},{op:'update',id:'folded-growth',knowledge:{1:{taste:'briny',effect:'hunger eases but stomach discomfort follows'}}},{op:'create',id:'flake-screen-'+resolutions,name:'Layered flake screen',description:'Loose reflective flakes have been leaned into a low folded screen.',kind:'reflective assembly',structure:true,tile:17,quantity:1,knownBy:[1,2],appearance:{color:'#9ebfc1',shape:'folded screen',scale:.6}}],transactions:[{kind:'consume',actor:1,entity:'folded-growth',amount:1,reason:'Adam tastes one portion'},{kind:'encounter',actor:2,entity:'raw-flakes-'+resolutions,amount:2,reason:'Eve encounters loose flakes'},{kind:'transform',actor:2,inputs:[{entity:'raw-flakes-'+resolutions,amount:2}],outputs:[{entity:'flake-screen-'+resolutions,amount:1}],reason:'Eve assembles the flakes'}],scheduledEffects:[{id:'cramps-'+resolutions,actor:1,dueDay:resolutions+2,delta:{health:-2},reason:'The delayed cramps worsen'}],agents:[{id:1,delta:{health:-5},states:[{name:'stomach discomfort',description:'Discomfort after tasting the folded material'}],experience:'A small taste eased hunger, but my stomach feels wrong.',goal:{status:'complete',progress:100,next:'Observe the consequence'}}],discoveries:[{id:'folded-effect',name:'The folded material has mixed effects',detail:'A small taste eases hunger while causing discomfort.',learners:[1],entityIds:['folded-growth']}]});
      }
      if(body.purpose==='world-resolution'&&settle)response.text=JSON.stringify({summary:'A quiet day passes with no new model-authored changes.'});
      if(body.purpose==='world-resolution'&&badLedger)response.text=JSON.stringify({summary:'An unsupported reserve gain is proposed.',agents:[{id:1,delta:{food:1000000}}]});
      if(body.purpose==='world-resolution'&&body.prompt.includes('\"description\":\"Heal Adam.\"'))response.text=JSON.stringify({summary:'The observer heals Adam.',agents:[{id:1,delta:{health:10}}]});
      if(body.purpose==='visual')response.text=JSON.stringify({title:'A misty place of encounters',rationale:'New material and a folded screen are visible.',palette:{ground:'#71805a'},atmosphere:{saturation:.8,contrast:1,haze:.1,warmth:0}});
      if(body.purpose==='development')response.text=JSON.stringify({status:'no-evidence',evidence:'This short encounter record does not support a further change yet.'});
      return route.fulfill({json:response});
    });
    await page.goto(url);
    const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('first-world-v1')));
    let world=await read();assert.ok(world.openWorld.enabled);assert.ok(world.tiles.every(t=>t.type!=='berry'&&t.food===0));
    await page.click('#step-btn');await page.waitForFunction(()=>document.querySelector('#day-count').textContent==='02'&&!document.querySelector('#step-btn').disabled);
    world=await read();assert.equal(world.openWorld.entities[0].id,'folded-growth');assert.equal(world.agents[0].food,6);assert.equal(world.agents[0].knowledge.length,0);
    assert.equal(await page.locator('[data-entity="folded-growth"]').count(),1);assert.match(await page.locator('#atlas-weather').innerText(),/thin silver mist/);
    await page.click('[data-panel="resources"]');assert.match(await page.locator('#hotspot-list').innerText(),/Pale folded growth/);assert.doesNotMatch(await page.locator('#hotspot-list').innerText(),/cramps/);
    await page.click('[data-panel="stories"]');
    await page.click('#step-btn');await page.waitForFunction(()=>document.querySelector('#day-count').textContent==='03'&&!document.querySelector('#step-btn').disabled);
    world=await read();assert.equal(world.agents[0].food,7);assert.equal(world.agents[0].health,85);assert.equal(world.agents[0].worldStates[0].name,'stomach discomfort');assert.deepEqual(world.agents[0].knowledge,['folded-effect']);
    assert.equal(await page.locator('.entity-structure').count(),1);assert.equal(world.council.decisions.at(-1).votes.length,10);
    const beforeEntities=JSON.stringify(world.openWorld.entities.map(({observations,knowledge,knownBy,...physical})=>physical));
    veto=true;await page.click('#step-btn');await page.waitForFunction(()=>!document.querySelector('#step-btn').disabled&&document.querySelector('#day-count').textContent==='04');
    world=await read();assert.equal(JSON.stringify(world.openWorld.entities.map(({observations,knowledge,knownBy,...physical})=>physical)),beforeEntities);assert.equal(world.agents[0].health,83);assert.equal(world.agents[0].food,6);assert.equal(world.openWorld.scheduledEffects.length,0);assert.equal(world.openWorld.lastResolution.proposalWithheld,true);assert.equal(world.council.decisions.at(-1).approved,false);
    assert.ok(seen.some(p=>p.facts?.mode==='open-world'&&p.facts.proposal?.entities));
    veto=false;unavailable=true;await page.click('#step-btn');await page.waitForFunction(()=>!document.querySelector('#step-btn').disabled);world=await read();assert.equal(world.day,4);
    await page.reload();world=await read();assert.equal(world.openWorld.entities.length,3);assert.equal(world.agents[0].worldStates[0].name,'stomach discomfort');
    unavailable=false;badLedger=true;const councilCalls=seen.filter(p=>p.facts).length;
    await page.click('#step-btn');await page.waitForFunction(()=>!document.querySelector('#step-btn').disabled&&document.querySelector('#day-count').textContent==='05');
    world=await read();assert.equal(world.day,5);assert.equal(world.agents[0].food,5);assert.equal(seen.filter(p=>p.facts).length,councilCalls);assert.equal(world.openWorld.scheduledEffects.length,0);
    badLedger=false;settle=true;await page.click('#step-btn');await page.waitForFunction(()=>document.querySelector('#day-count').textContent==='06'&&!document.querySelector('#step-btn').disabled);
    world=await read();assert.equal(world.agents[0].health,83);assert.equal(world.agents[0].food,4);assert.equal(world.openWorld.scheduledEffects.length,0);assert.ok(!world.openWorld.lastPhysicalAudit.some(e=>e.kind==='scheduled'));
    await page.reload();await page.click('#step-btn');await page.waitForFunction(()=>document.querySelector('#day-count').textContent==='07'&&!document.querySelector('#step-btn').disabled);world=await read();assert.equal(world.agents[0].health,83);
    await page.click('#overseer-btn');await page.locator('textarea[name="description"]').fill('Heal Adam.');await page.locator('#overseer-form button[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#day-count').textContent==='08'&&!document.querySelector('#step-btn').disabled);world=await read();assert.equal(world.agents[0].health,84);
    await page.locator('#close-modal').click();
    const boundaryBefore=JSON.stringify({day:world.day,agents:world.agents,entities:world.openWorld.entities}),authorCalls=seen.filter(p=>p.purpose==='world-resolution').length;
    badIdentity=true;await page.click('#step-btn');await page.waitForFunction(()=>!document.querySelector('#step-btn').disabled&&document.querySelector('#world-status').textContent.includes('INHABITANT INFERENCE UNAVAILABLE'));
    world=await read();assert.equal(JSON.stringify({day:world.day,agents:world.agents,entities:world.openWorld.entities}),boundaryBefore);assert.equal(seen.filter(p=>p.purpose==='world-resolution').length,authorCalls);assert.match(world.openWorld.lastError,/identity/);
    const residentRequests=seen.filter(p=>p.operation);assert.ok(residentRequests.some(p=>p.operation==='intention'));assert.ok(residentRequests.every(p=>!p.prompt&&!p.world&&!p.purpose&&!p.view.laws&&p.view.entities.every(e=>!e.properties)));
    assert.deepEqual(errors,[]);await page.screenshot({path:'work/referee-world-desktop.png'});
    console.log('Open-world browser checks passed: no scripted food, arbitrary encounters, mixed consumption effects, free discovery, dynamic entities/weather, ten-vote veto, API failure, enforced accounting, daily upkeep, delayed effects across reload explicit observer exceptions, and rejection of forged inhabitant identities.');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1});
