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
    let resolutions=0,veto=false,unavailable=false,recoverDayTwo=false,repairReplies=0;
    const seen=[];
    await page.route('**/api/council',route=>{seen.push(route.request().postDataJSON());return route.fulfill({json:{votes:roles.map(name=>({name,approve:!(veto&&name==='Causality'),reason:veto?'The proposed cause is unsupported.':'Consistent with this world.'}))}});});
    await page.route('**/api/agent',route=>{
      const body=route.request().postDataJSON();seen.push(body);
      if(unavailable&&body.purpose?.startsWith('world-'))return route.fulfill({status:503,json:{error:'The referee service is offline.'}});
      let response={text:'I do not know yet.'};
      if(body.purpose==='world-intention')response.text=JSON.stringify({action:resolutions?'Try a tiny portion of the folded material':'Inspect the unfamiliar ground for anything interesting',reason:'I want to understand this place',goal:{title:'Understand what I encounter',reason:'I am curious',next:'Look closely'},targetEntityIds:recoverDayTwo?['Pale folded growth','some-uncertain-target']:[]});
      if(body.purpose==='world-resolution'){
        if(!body.repair)resolutions++;
        response.text=JSON.stringify(resolutions===1?{summary:'They notice a pale folded growth and try to understand it.',entities:[{op:'create',id:'folded-growth',name:'Pale folded growth',description:'A moist fan of translucent folds close to the ground.',kind:'unfamiliar living material',tile:16,quantity:3,knownBy:[1,2],properties:{delayedEffect:'May cause cramps if eaten'},appearance:{color:'#c8b99b',shape:'folded fan',scale:.4}}],agents:[{id:1,experience:'I see a pale folded growth, but I do not know its use.',goal:{status:'active',progress:25,next:'Inspect without assuming it is food'}},{id:2,experience:'Adam pointed out something folded on the ground.'}],weather:{name:'thin silver mist',description:'Fine droplets hang above the ground.'}}:{summary:'A tiny portion eases hunger but causes discomfort. Eve makes a screen from loose flakes.',entities:[{op:'update',id:'folded-growth',quantity:2,knowledge:{1:{taste:'briny',effect:'hunger eases but stomach discomfort follows'}}},{op:'create',id:'flake-screen-'+resolutions,name:'Layered flake screen',description:'Loose reflective flakes have been leaned into a low folded screen.',kind:'reflective assembly',structure:true,tile:17,quantity:1,knownBy:[1,2],appearance:{color:'#9ebfc1',shape:'folded screen',scale:.6}}],agents:[{id:1,delta:{food:2,health:-5},states:[{name:'stomach discomfort',description:'Discomfort after tasting the folded material'}],experience:'A small taste eased hunger, but my stomach feels wrong.',goal:{status:'complete',progress:100,next:'Observe the consequence'}}],discoveries:[{id:'folded-effect',name:'The folded material has mixed effects',detail:'A small taste eases hunger while causing discomfort.',learners:[1],entityIds:['folded-growth']}]});
      }
      if(body.purpose==='world-resolution'&&recoverDayTwo&&resolutions===2){
        if(!body.repair)response.text='{"summary":"A small taste","discoveries":[';
        else{
          repairReplies++;const outcome=JSON.parse(response.text);outcome.entities[0]={op:'remove',id:'folded-growth'};
          outcome.discoveries[0].entityIds=[repairReplies===1?'nonexistent-proof':'Pale folded growth'];response.text=JSON.stringify(outcome);
        }
      }
      if(body.purpose==='world-resolution'&&resolutions>2){const outcome=JSON.parse(response.text);outcome.entities=outcome.entities.filter(e=>e.id!=='folded-growth');response.text=JSON.stringify(outcome);}
      if(body.purpose==='visual')response.text=JSON.stringify({title:'A misty place of encounters',rationale:'New material and a folded screen are visible.',palette:{ground:'#71805a'},atmosphere:{saturation:.8,contrast:1,haze:.1,warmth:0}});
      if(body.purpose==='development')response.text=JSON.stringify({status:'no-evidence',evidence:'This short encounter record does not support a further change yet.'});
      return route.fulfill({json:response});
    });
    await page.goto(url);
    const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('first-world-v1')));
    let world=await read();assert.ok(world.openWorld.enabled);assert.ok(world.tiles.every(t=>t.type!=='berry'&&t.food===0));
    await page.click('#step-btn');await page.waitForFunction(()=>document.querySelector('#day-count').textContent==='02'&&!document.querySelector('#step-btn').disabled);
    world=await read();assert.equal(world.openWorld.entities[0].id,'folded-growth');assert.equal(world.agents[0].food,7);assert.equal(world.agents[0].knowledge.length,0);
    assert.equal(await page.locator('[data-entity="folded-growth"]').count(),1);assert.match(await page.locator('#atlas-weather').innerText(),/thin silver mist/);
    await page.click('[data-panel="resources"]');assert.match(await page.locator('#hotspot-list').innerText(),/Pale folded growth/);assert.doesNotMatch(await page.locator('#hotspot-list').innerText(),/cramps/);
    await page.click('[data-panel="stories"]');
    recoverDayTwo=true;await page.click('#step-btn');await page.waitForFunction(()=>document.querySelector('#day-count').textContent==='03'&&!document.querySelector('#step-btn').disabled);
    world=await read();assert.equal(repairReplies,2);assert.deepEqual(world.tech.nodes[0].entityIds,['folded-growth']);assert.equal(world.agents[0].food,9);assert.equal(world.agents[0].health,85);assert.equal(world.agents[0].worldStates[0].name,'stomach discomfort');assert.deepEqual(world.agents[0].knowledge,['folded-effect']);
    assert.equal(await page.locator('.entity-structure').count(),1);assert.equal(world.council.decisions.at(-1).votes.length,10);
    const before=JSON.stringify({agents:world.agents,entities:world.openWorld.entities,day:world.day});
    veto=true;await page.click('#step-btn');await page.waitForFunction(()=>!document.querySelector('#step-btn').disabled&&document.querySelector('#world-status').textContent.includes('OUTCOME HELD'));
    world=await read();assert.equal(JSON.stringify({agents:world.agents,entities:world.openWorld.entities,day:world.day}),before);assert.equal(world.council.decisions.at(-1).approved,false);
    assert.ok(seen.some(p=>p.facts?.mode==='open-world'&&p.facts.proposal?.entities));
    const secondDay=seen.find(p=>p.facts?.day===2);assert.ok(secondDay.facts.intentions.some(i=>i.targetEntityIds.includes('folded-growth')&&i.unverifiedReferences.includes('some-uncertain-target')));
    assert.match(await page.locator('#background-status').innerText(),/HELD/);assert.equal(await page.locator('#step-btn').innerText(),'RETRY DAY');
    veto=false;unavailable=true;await page.click('#step-btn');await page.waitForFunction(()=>!document.querySelector('#step-btn').disabled);world=await read();assert.equal(world.day,3);
    await page.reload();world=await read();assert.equal(world.openWorld.entities.length,1);assert.equal(world.agents[0].worldStates[0].name,'stomach discomfort');
    assert.deepEqual(errors,[]);await page.screenshot({path:'work/referee-world-desktop.png'});
    console.log('Open-world browser checks passed: day 2 recovers from malformed JSON, bad evidence and uncertain intentions; consumed evidence, council veto, retry feedback and saved state remain correct.');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1});
