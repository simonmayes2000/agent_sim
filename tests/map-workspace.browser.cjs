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
    await page.goto(url);
    await page.waitForSelector('#terrain-canvas');
    await page.evaluate(()=>{
      const key='first-world-v1',world=JSON.parse(localStorage.getItem(key));
      world.openWorld={enabled:false,entities:[],laws:[],history:[]};world.tiles[16].food=5;world.tiles[17].water=12;world.explored=world.tiles.map((_,i)=>i);world.exploration.waypoints={'16:food':{tile:16,resource:'food',amount:5,day:1,observer:1,revision:1}};world.agents[0].exploration.waypoints=JSON.parse(JSON.stringify(world.exploration.waypoints));
      world.day=18;
      world.tiles.forEach((tile,i)=>tile.visits=i%3===0?12:i%2===0?5:2);
      world.tiles[16].structures=[
        {kind:'shelter',name:'Leaf shelter',builder:'Adam',day:8},
        {kind:'fire',name:'Hearth',builder:'Eve',day:12},
        {kind:'strong-shelter',name:'Timber shelter',builder:'Adam',day:17}
      ];
      world.tiles[17].structures=[{kind:'vessel',name:'Clay vessel',builder:'Eve',day:15}];
      localStorage.setItem(key,JSON.stringify(world));
    });
    await page.reload();
    await page.waitForSelector('.map-building');
    assert.ok(await page.locator('.map-building').count()>=4);
    assert.match(await page.locator('#visual-status').innerText(),/VISUAL REFEREE/);
    assert.ok(await page.locator('.sighting-forecast').count()>=1);
    assert.ok(await page.locator('.hotspot-entry.forecast-stale').count()>=1);
    assert.equal(await page.locator('.map-camera-controls').count(),1);
    assert.ok((await page.locator('#terrain-canvas').evaluate(canvas=>canvas.toDataURL().length))>1000);
    const before=await page.locator('#map-scene').evaluate(el=>el.style.transform);
    await page.click('#map-zoom-in');
    const after=await page.locator('#map-scene').evaluate(el=>el.style.transform);
    assert.notEqual(after,before);
    await page.locator('[data-tile="18"]').click({position:{x:145,y:145}});
    assert.match(await page.locator('#place-inspector').innerText(),/PLACE 3, 3/);
    await page.click('#development-btn');
    assert.equal(await page.locator('#development-record').count(),1);
    await page.click('#close-modal');
    assert.equal(await page.locator('#development-record').count(),0);
    assert.ok(await page.locator('#modal-overlay').evaluate(element=>element.classList.contains('hidden')));
    await page.screenshot({path:'work/satellite-desktop.png',fullPage:false});
    await page.click('[data-panel="resources"]');
    assert.equal(await page.locator('.hotspots-card').isVisible(),true);
    await page.locator('.hotspots-card').screenshot({path:'work/forecast-panel.png'});
    await page.click('[data-panel="people"]');
    assert.equal(await page.locator('.people-card').isVisible(),true);
    await page.click('[data-panel="chronicle"]');
    assert.equal(await page.locator('.activity-card').isVisible(),true);
    await page.click('[data-panel="stories"]');
    await page.fill('#atlas-search','Timber');
    assert.match(await page.locator('#atlas-results').innerText(),/Timber shelter/);
    await page.locator('#atlas-results button').first().click();
    assert.equal(await page.locator('#place-inspector').isVisible(),true);
    await page.click('.place-close');
    assert.equal(await page.locator('#place-inspector').isVisible(),false);
    await page.click('[data-basemap="terrain"]');
    assert.equal(await page.locator('[data-basemap="terrain"]').evaluate(e=>e.classList.contains('active')),true);
    await page.click('[data-basemap="satellite"]');
    await page.click('.atlas-collapse');
    assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('atlas-collapsed')),true);
    await page.click('.atlas-collapse');
    await page.click('#map-fit');
    await page.screenshot({path:'work/satellite-desktop.png'});
    await page.setViewportSize({width:390,height:844});
    await page.click('#map-fit');
    await page.screenshot({path:'work/satellite-mobile.png',fullPage:false});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('Map workspace browser checks passed: navigation, terrain modes, search, selection, panels, mobile and no runtime errors.');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1});
