const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../dist'),server=http.createServer((req,res)=>{
  try{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const roles=require('../dist/council.js').reviewers,requests=[];let stage=0,slow=false,firstResolution=true;
  await page.route('**/__source-council/status',route=>route.fulfill({json:{connected:false}}));
  await page.route('**/api/council',route=>route.fulfill({json:{votes:roles.map(name=>({name,approve:true,reason:'The outcome follows elapsed time and the prior facts.'}))}}));
  await page.route('**/api/inhabitant',route=>{const body=route.request().postDataJSON();requests.push(body);return route.fulfill({json:{actor:body.actor,operation:body.operation,intention:{action:'Test the unfamiliar water again without drinking',reason:'I remain uncertain',targetEntityIds:[]}}});});
  await page.route('**/api/referee',async route=>{
   const body=route.request().postDataJSON();requests.push(body);let text='{}';
   if(body.purpose==='world-intention')text=JSON.stringify({action:'Test the unfamiliar water again without drinking',reason:'I remain uncertain',goal:{title:'Understand the water',reason:'I am uncertain',next:'Look again'},targetEntityIds:[],destination:null});
   if(body.purpose==='world-resolution'){
    if(slow){await new Promise(resolve=>setTimeout(resolve,3500));}
    if(firstResolution){firstResolution=false;return route.fulfill({json:{text:'{"summary":"An incomplete but parseable beginning"}',model_status:'incomplete',incomplete_reason:'max_output_tokens'}});}
    const actors=stage>=2?[2]:[1,2];text=JSON.stringify({summary:stage===0?'Another day passes without intake. Adam becomes weaker.':stage===1?'Adam dies after continued refusal to drink.':'Eve continues independently.',agents:actors.map(id=>({id,delta:{health:0,water:0,food:0,energy:0},conditionReason:id===1?'No drinking occurred; the continuing deprivation worsens despite repeated tests.':'Controlled fixture: provisions and recovery balance this day’s needs.',experience:id===1?'I still decline the unfamiliar water.':'I continue observing.'})),processes:stage===0?[{id:'unmet-water',description:'Adam’s unresolved water deprivation',subjects:[1],status:'active',nextReviewDay:4,review:'No intake occurred and his condition worsened.'}]:stage===1?[{id:'unmet-water',status:'resolved',review:'The continuing lack of intake proves fatal.'}]:[]});
   }
   if(body.purpose==='visual')text=JSON.stringify({title:'An unchanged shore',rationale:'No new terrain feature.',palette:{},atmosphere:{}});
   if(body.purpose==='development')text=JSON.stringify({status:'no-evidence',evidence:'This is a controlled regression scenario.'});
   try{await route.fulfill({json:{text}});}catch(error){if(!slow)throw error;}
  });
  const url=`http://127.0.0.1:${server.address().port}`;await page.goto(url);
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('first-world-v1'));s.day=2;s.agents[0].health=14;s.agents[0].water=1;s.openWorld.initialized=true;localStorage.setItem('first-world-v1',JSON.stringify(s));});await page.reload();
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('first-world-v1')));
  await page.click('#step-btn');await page.waitForFunction(()=>document.querySelector('#day-count').textContent==='03'&&!document.querySelector('#step-btn').disabled);
  let world=await read();assert.equal(world.agents[0].health,5);assert.equal(world.agents[0].water,0);assert.equal(world.openWorld.processes[0].status,'active');assert.match(await page.locator('#story-list').innerText(),/unresolved water deprivation/);assert.equal(await page.locator('[data-water-choice]').count(),0);
  assert.ok(requests.some(r=>r.purpose==='world-resolution'&&r.prompt.includes('Incomplete'))||requests.some(r=>r.purpose==='world-resolution'&&r.prompt.includes('incomplete')));
  stage=1;await page.reload();await page.click('#step-btn');await page.waitForFunction(()=>document.querySelector('#day-count').textContent==='04'&&!document.querySelector('#step-btn').disabled);
  world=await read();assert.equal(world.agents[0].alive,false);assert.equal(world.agents[0].death,4);assert.equal(world.openWorld.processes[0].status,'resolved');assert.ok(world.events.some(e=>e.type==='death'&&e.text.includes('Adam')));
  const before=JSON.stringify({day:world.day,agents:world.agents,entities:world.openWorld.entities});stage=2;slow=true;await page.click('#step-btn');await page.waitForFunction(()=>document.querySelector('#world-status').textContent.includes('RESOLVING CONSEQUENCES'));
  await page.waitForFunction(()=>/[1-9]\d*s/.test(document.querySelector('#world-status').textContent));
  await page.click('#cancel-resolution');await page.waitForFunction(()=>!document.querySelector('#step-btn').disabled);
  world=await read();assert.equal(JSON.stringify({day:world.day,agents:world.agents,entities:world.openWorld.entities}),before);assert.match(world.openWorld.lastError,/cancelled/);const intentCount=requests.filter(r=>r.operation==='intention').length;
  slow=false;await page.click('#step-btn');await page.waitForFunction(()=>document.querySelector('#day-count').textContent==='05'&&!document.querySelector('#step-btn').disabled);assert.equal(requests.filter(r=>r.operation==='intention').length,intentCount);
  await new Promise(resolve=>setTimeout(resolve,1000));assert.equal((await read()).day,5);assert.deepEqual(errors,[]);
  console.log('Continuity browser checks passed: autonomous deterioration and death, persisted processes, incomplete-output repair, elapsed progress, cancellation, and cached-intention retry.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
