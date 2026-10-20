/* Map workspace presentation and navigation; simulation remains authoritative. */
(function(root){
  'use strict';
  let ready=false,callbacks,mode='satellite';
  const $=s=>document.querySelector(s);
  function init(actions){
    if(ready)return;ready=true;callbacks=actions;document.body.classList.add('atlas');
    const rail=$('.observer-rail'),ledger=$('.world-ledger');
    const navigation=document.createElement('div');navigation.className='atlas-navigation';
    navigation.innerHTML='<div class="atlas-search"><span aria-hidden="true">⌕</span><input id="atlas-search" aria-label="Find a person or map coordinates" placeholder="Find a person or place…" autocomplete="off"><button id="atlas-home" title="Fit the world" aria-label="Fit the world">⌂</button></div><div id="atlas-results" hidden></div><div class="atlas-tabs" role="tablist" aria-label="World information"><button role="tab" aria-selected="true" data-panel="stories">Overview</button><button role="tab" aria-selected="false" data-panel="people">People</button><button role="tab" aria-selected="false" data-panel="resources">Resources</button><button role="tab" aria-selected="false" data-panel="chronicle">Chronicle</button></div><div class="atlas-context"><span id="atlas-day"></span><span id="atlas-weather"></span></div>';
    rail.prepend(navigation);rail.append(ledger);rail.dataset.panel='stories';
    navigation.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>{rail.dataset.panel=b.dataset.panel;navigation.querySelectorAll('[data-panel]').forEach(t=>t.setAttribute('aria-selected',String(t===b)));});
    $('#atlas-home').onclick=()=>callbacks.fit();
    $('#atlas-search').oninput=()=>search($('#atlas-search').value);
    $('#atlas-search').onkeydown=e=>{if(e.key==='Escape'){$('#atlas-results').hidden=true;$('#atlas-search').value='';}if(e.key==='Enter')$('#atlas-results button')?.click();};
    const layers=document.createElement('div');layers.className='atlas-layers';layers.innerHTML='<button class="atlas-layer active" data-basemap="satellite"><span class="layer-swatch satellite"></span>Satellite</button><button class="atlas-layer" data-basemap="terrain"><span class="layer-swatch terrain"></span>Terrain</button><div class="atlas-overlays"><label><input type="checkbox" data-layer="labels" checked> Labels</label><label><input type="checkbox" data-layer="resources"> Resources</label><label><input type="checkbox" data-layer="activity" checked> Activity</label></div>';
    $('#map-area').append(layers);layers.querySelectorAll('[data-basemap]').forEach(b=>b.onclick=()=>{mode=b.dataset.basemap;layers.querySelectorAll('[data-basemap]').forEach(x=>x.classList.toggle('active',x===b));callbacks.render();});
    $('#map-area').classList.add('show-labels','show-activity');layers.querySelectorAll('[data-layer]').forEach(input=>input.onchange=()=>$('#map-area').classList.toggle('show-'+input.dataset.layer,input.checked));
    const collapse=document.createElement('button');collapse.className='atlas-collapse';collapse.textContent='‹';collapse.setAttribute('aria-label','Collapse information panel');collapse.onclick=()=>{const hidden=document.body.classList.toggle('atlas-collapsed');collapse.textContent=hidden?'›':'‹';collapse.setAttribute('aria-expanded',String(!hidden));setTimeout(()=>callbacks.fit(),200);};rail.append(collapse);
    $('#place-inspector').addEventListener('click',e=>{if(e.target.closest('.place-close'))callbacks.clearPlace();});
    const status=document.createElement('div');status.className='atlas-attribution';status.textContent='THE FIRST WORLD · SIMULATED AERIAL VIEW · DRAG TO EXPLORE';$('#map-area').append(status);
    $('#map-area').addEventListener('dblclick',e=>{if(!e.target.closest('button,input,label'))callbacks.zoom(e.clientX,e.clientY);});
    window.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select')||e.ctrlKey||e.metaKey||!$('#modal-overlay').classList.contains('hidden'))return;if(e.key===' '){e.preventDefault();callbacks.play();}if(e.key==='f'||e.key==='F')callbacks.fit();if(e.key==='Escape')callbacks.clearPlace();});
  }
  function search(value){const results=$('#atlas-results');results.replaceChildren();if(!value.trim()){results.hidden=true;return;}const matches=callbacks.search(value);results.hidden=false;if(!matches.length){results.textContent='No known place or person found. Try “Adam” or “2, 3”.';return;}for(const match of matches){const b=document.createElement('button');b.textContent=match.label;b.onclick=()=>{callbacks.select(match);results.hidden=true;$('#atlas-search').value=match.label;};results.append(b);}}
  function update(state,actions){init(actions);$('#atlas-day').textContent='Day '+state.day+' · '+state.agents.filter(a=>a.alive).length+' inhabitants';$('#atlas-weather').textContent=state.weather==='rain'?'Rain':state.weather==='wind'?'Wind':'Clear skies';$('#place-inspector').classList.toggle('is-selected',actions.selectedTile()!=null);}
  root.MapWorkspace={update,mode:()=>mode};
})(window);
