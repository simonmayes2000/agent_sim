const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../dist'),server=http.createServer((req,res)=>{try{const file=path.join(root,req.url==='/'?'/index.html':req.url.split('?')[0]);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],plans=[],authorPrompts=[],reviews=[];page.on('pageerror',e=>errors.push(e.message));
  let mode='stale',omitOnce=false,vetoOnce=false,incompleteOnce=false,releaseHold;
  await page.route('**/__source-council/status',r=>r.fulfill({json:{connected:false}}));
  await page.route('**/api/inhabitant',r=>{const body=r.request().postDataJSON();plans.push(body);return r.fulfill({json:{actor:body.actor,operation:body.operation,intention:{action:'Inspect the local ground',reason:'I want to understand it',targetEntityIds:[]}}});});
  const roles=require('../dist/council.js').reviewers;
  await page.route('**/api/council',r=>{const facts=r.request().postDataJSON().facts;reviews.push(facts);const block=vetoOnce;vetoOnce=false;return r.fulfill({json:{votes:roles.map((name,i)=>({name,approve:!(block&&name==='Causality'),scope:block&&name==='Causality'?'proposal':'none',target:block&&name==='Causality'?'/proposal/processes/0':'',evidence:block&&name==='Causality'?'The process review lacks its causal evidence.':'',reason:block&&name==='Causality'?'The outcome explanation needs a concrete causal correction.':'Consistent with the complete before/after evidence.'}))}});});
  await page.route('**/api/referee',async r=>{
   const body=r.request().postDataJSON();if(body.purpose!=='world-resolution')return r.fulfill({json:{text:JSON.stringify(body.purpose==='visual'?{title:'A stable landscape',rationale:'Current world evidence.'}:{status:'no-evidence',evidence:'No extra change is justified.'})}});
   authorPrompts.push(body.prompt);if(mode==='offline')return r.fulfill({status:503,json:{error:'Model service is offline.'}});
   if(mode==='hold')await new Promise(resolve=>releaseHold=resolve);
   if(incompleteOnce){incompleteOnce=false;return r.fulfill({json:{text:'{"summary":',model_status:'incomplete',incomplete_reason:'max_output_tokens'}});}
   let outcome={summary:'The day passes with bodily demand accounted for.',processes:[{id:'deprivation',review:'Daily bodily demand continues; the physical core applies this day\'s balance.',nextReviewDay:5}]};
   if(omitOnce){omitOnce=false;outcome={summary:'The first proposal accidentally omitted a due process.'};}
   if(mode==='invalid')outcome={...outcome,agents:[{id:1,delta:{food:1000000}}]};
   await r.fulfill({json:{text:JSON.stringify(outcome)}}).catch(()=>{});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('first-world-v1'));s.day=4;s.agents.forEach(a=>{a.food=20;a.water=20;a.health=90;a.energy=90;delete a.perceptionMemory;});s.openWorld.processes=[{id:'deprivation',description:'Continued bodily demand',subjects:[1,2],status:'active',nextReviewDay:5,review:'Previously reviewed.'}];localStorage.setItem('first-world-v1',JSON.stringify(s));});await page.reload();
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('first-world-v1')));
  async function step(day){await page.click('#step-btn');await page.waitForFunction(day=>document.querySelector('#day-count').textContent===String(day).padStart(2,'0')&&!document.querySelector('#step-btn').disabled,day);}
  await step(5);let s=await read();assert.equal(authorPrompts.length,1);assert.equal(s.openWorld.processes[0].nextReviewDay,6);assert.equal(s.agents[0].food,19);
  await step(6);s=await read();assert.equal(authorPrompts.length,2);assert.equal(s.openWorld.processes[0].nextReviewDay,7);assert.equal(s.agents[0].food,18);
  omitOnce=true;const beforeRepairs=plans.length;await step(7);assert.equal(plans.length,beforeRepairs+2);assert.match(authorPrompts.at(-1),/PROCESS_REVIEW_MISSING/);s=await read();assert.equal(s.openWorld.processes[0].nextReviewDay,8);
  vetoOnce=true;const beforeVetoPlans=plans.length,beforeVetoAuthors=authorPrompts.length;await step(8);assert.equal(plans.length,beforeVetoPlans+2);assert.equal(authorPrompts.length,beforeVetoAuthors+2);s=await read();assert.equal(s.council.decisions.at(-2).approved,false);assert.equal(s.council.decisions.at(-1).approved,true);
  mode='offline';await page.click('#step-btn');await page.waitForFunction(()=>!document.querySelector('#step-btn').disabled&&document.querySelector('#world-status').textContent.includes('UNAVAILABLE'));s=await read();assert.equal(s.day,8);assert.equal(s.openWorld.pendingIntentions.intentions.length,2);const savedChoices=JSON.stringify(s.openWorld.pendingIntentions.intentions),beforeReloadPlans=plans.length;
  await page.reload();mode='stale';await step(9);assert.equal(plans.length,beforeReloadPlans);s=await read();assert.equal(JSON.stringify(s.openWorld.history.at(-1).intentions),savedChoices);assert.equal(s.openWorld.pendingIntentions,undefined);
  mode='invalid';const reviewed=reviews.length;await page.click('#step-btn');await page.waitForFunction(()=>!document.querySelector('#step-btn').disabled&&document.querySelector('#world-status').textContent.includes('OUTCOME INVALID'));assert.equal(reviews.length,reviewed);s=await read();assert.equal(s.day,9);const invalidPlans=plans.length;
  mode='stale';incompleteOnce=true;await step(10);assert.equal(plans.length,invalidPlans);assert.match(authorPrompts.at(-1),/smaller complete outcome/);s=await read();assert.equal(s.agents[0].food,14);assert.equal(s.openWorld.processes[0].nextReviewDay,11);
  assert.ok(reviews.every(f=>f.before.tiles.length===48&&f.after.day===f.before.day+1&&f.after.agents[0].food===f.before.agents[0].food-1&&f.before.agents[0].evidenceRecords&&f.dueProcesses[0].id==='deprivation'));
  mode='hold';await page.click('#step-btn');await page.waitForFunction(()=>document.querySelector('#step-btn').disabled&&document.querySelector('#world-status').textContent.includes('REFEREE IS RESOLVING'));page.once('dialog',d=>d.accept());await page.click('#new-game-btn');await page.waitForFunction(()=>document.querySelector('#day-count').textContent==='01');releaseHold?.();await page.waitForTimeout(100);s=await read();assert.equal(s.day,1);assert.equal(s.openWorld.processes.length,0);assert.equal(s.openWorld.pendingIntentions,undefined);assert.deepEqual(errors,[]);
  console.log('Adjudication browser checks passed: exact stale review date, automatic repair, veto revision, preserved plans after reload, complete evidence, incomplete output recovery and reset cancellation.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
