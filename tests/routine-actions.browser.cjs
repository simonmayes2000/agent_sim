const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../dist'),server=http.createServer((req,res)=>{try{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage(),errors=[],requests=[];let authors=0,councils=0;
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/__source-council/status',r=>r.fulfill({json:{connected:false}}));
  await page.route('**/api/inhabitant',r=>{const q=r.request().postDataJSON();requests.push(q);assert.equal(q.operation,'intention');return r.fulfill({json:{actor:q.actor,operation:q.operation,intention:{action:q.actor===1?'Walk beside Eve and ask to explore together':'Rest and reply to Adam',execution:{kind:q.actor===1?'move':'rest'},destination:q.actor===1?{x:1,y:2}:null,targetEntityIds:[],speech:q.view.day===1?(q.actor===1?'Eve, shall we explore together?':'I would like to explore with you.'):'Let us look for water together.'}}});});
  await page.route('**/api/referee',r=>{const q=r.request().postDataJSON();if(q.purpose==='world-resolution')authors++;return r.fulfill({json:{text:JSON.stringify({status:'no-evidence'})}});});
  await page.route('**/api/council',r=>{councils++;return r.fulfill({json:{votes:[]}});});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.click('#step-btn');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('first-world-v1')).day===2&&!document.querySelector('#step-btn').disabled);
  let s=await page.evaluate(()=>JSON.parse(localStorage.getItem('first-world-v1')));assert.equal(s.agents[0].x,1);assert.equal(s.agents[0].energy,70);assert.equal(s.agents[1].energy,98);assert.equal(s.events.filter(e=>e.type==='speech').length,2);assert.equal(authors,0);assert.equal(councils,0);
  await page.click('[data-panel="chronicle"]');for(let i=0;i<20&&!(await page.locator('#filter-btn').textContent()).includes('AGENT CHAT');i++)await page.click('#filter-btn');await page.waitForFunction(()=>document.querySelector('#filter-btn').textContent.includes('AGENT CHAT'));assert.match(await page.locator('#activity-feed').textContent(),/shall we explore together/);
  await page.click('#step-btn');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('first-world-v1')).day===3&&!document.querySelector('#step-btn').disabled);
  assert.ok(requests.filter(q=>q.view.day===2).every(q=>q.view.experiences.some(e=>e.evidence.kind==='hearsay'&&e.text.includes('explore'))));assert.equal(authors,0);assert.equal(councils,0);
  await page.getByRole('button',{name:'ARCHIVE ↗',exact:true}).click();await page.getByRole('button',{name:'Verify replay'}).first().click();await page.waitForFunction(()=>document.querySelector('#archive-message').textContent.includes('Replay verified'));await page.locator('#close-modal').click();
  await page.reload();s=await page.evaluate(()=>JSON.parse(localStorage.getItem('first-world-v1')));assert.equal(s.day,3);assert.equal(s.agents[0].x,1);assert.ok(s.agents[0].continuity.episodes.some(e=>e.kind==='result'));assert.deepEqual(errors,[]);
  console.log('Routine browser checks passed: automatic agent speech, chat filter, nearby hearing, movement/rest, no author or council calls, private result feedback, reload and exact archive replay.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
