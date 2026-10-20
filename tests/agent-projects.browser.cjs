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
    let slow=true,release;
    const waiting=new Promise(resolve=>release=resolve),prompts=[];
    await page.route('**/api/council',route=>route.fulfill({json:{votes:roles.map(name=>({name,approve:true,reason:'The proposed action is physically possible.'}))}}));
    await page.route('**/api/agent',async route=>{
      const body=route.request().postDataJSON();prompts.push(body);
      if(slow)await waiting;
      let text='I see trees.';
      if(body.purpose==='visual')text=JSON.stringify({title:'Daily grounded view',rationale:'Based on current visits and weather.',palette:{ground:'#71805a'},atmosphere:{saturation:.9,contrast:1,haze:0,warmth:0}});
      if(body.purpose==='development')text=JSON.stringify({status:'no-evidence',evidence:'No further change is supported by this day.'});
      await route.fulfill({json:{text}}).catch(()=>{});
    });
    await page.goto(url);
    await page.evaluate(()=>{
      const world=JSON.parse(localStorage.getItem('first-world-v1'));world.modelIntroDone=true;world.seed=42;world.openWorld={enabled:false,entities:[],laws:[],history:[]};world.tiles.forEach(t=>{t.food=5;t.water=12;t.wood=8;t.fibre=6;t.stone=8;});world.tiles[0].type='forest';world.tiles[6].type='forest';
      world.agents.forEach((a,i)=>{a.x=i===0?0:6;a.y=0;a.seenTiles=[a.x];a.observed=['forest'];a.food=12;a.water=12;a.energy=90;});
      localStorage.setItem('first-world-v1',JSON.stringify(world));
    });
    await page.reload();
    for(let day=2;day<=4;day++){
      await page.click('#step-btn');
      await page.waitForFunction(d=>Number(document.querySelector('#day-count').textContent)===d&&!document.querySelector('#step-btn').disabled,day);
    }
    assert.match(await page.locator('#background-status').innerText(),/BACKGROUND/);
    assert.equal(await page.locator('.personal-project').count(),2);
    const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('first-world-v1')));
    const old=await read();assert.deepEqual(old.dayEvidence.map(e=>e.day),[1,2,3,4]);
    assert.ok(old.agents.every(a=>a.goal||a.goalHistory?.length));
    // Starting a new world must invalidate every in-flight old response.
    page.once('dialog',dialog=>dialog.accept());await page.click('#new-game-btn');
    slow=false;release();
    await page.waitForFunction(()=>Number(document.querySelector('#day-count').textContent)===1);
    await page.waitForTimeout(150);
    const fresh=await read();assert.equal(fresh.day,1);assert.deepEqual(fresh.dayEvidence.map(e=>e.day),[1]);
    assert.ok(!fresh.development?.reviews?.length);assert.ok(!fresh.visualDirection?.history?.length);
    assert.equal(await page.locator('#modal-overlay').evaluate(e=>e.classList.contains('hidden')),true);
    // Isolated, well-provisioned agents pursue observed-material experiments over multiple days.
    await page.evaluate(()=>{
      const world=JSON.parse(localStorage.getItem('first-world-v1'));world.modelIntroDone=true;world.seed=42;world.openWorld={enabled:false,entities:[],laws:[],history:[]};world.tiles.forEach(t=>{t.food=5;t.water=12;t.wood=8;t.fibre=6;t.stone=8;});world.tiles[0].type='forest';world.tiles[6].type='forest';
      world.agents.forEach((a,i)=>{a.x=i===0?0:6;a.y=0;a.seenTiles=[a.x];a.observed=['forest'];a.food=20;a.water=20;a.energy=90;});
      localStorage.setItem('first-world-v1',JSON.stringify(world));
    });
    await page.reload();
    for(let day=2;day<=12;day++){
      await page.click('#step-btn');
      await page.waitForFunction(d=>Number(document.querySelector('#day-count').textContent)===d&&!document.querySelector('#step-btn').disabled,day);
    }
    await page.waitForFunction(()=>!document.querySelector('#background-status').textContent.startsWith('BACKGROUND'));
    const developed=await read();
    assert.ok(developed.tech.nodes.length>0,'projects should produce a learned invention');
    assert.ok(developed.agents.some(a=>a.goalHistory?.some(g=>g.status==='complete')),'finished projects should remain in history');
    assert.ok(developed.tiles.some(t=>t.structures.length),'successful physical experiments should appear on the map');
    const lastDevelopment=prompts.filter(p=>p.purpose==='development').at(-1);
    assert.match(lastDevelopment.prompt,/dailyEvidence/);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:'work/agent-projects-desktop.png'});
    console.log('Agent project browser checks passed: nonblocking slow reviews, world reset isolation, daily evidence and multi-day project completion.');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1});
