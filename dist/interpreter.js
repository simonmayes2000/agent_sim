/* Local, inspectable interpretation of freeform overseer descriptions. */
(function(root){
'use strict';
const resources=['food','water','wood','stone','fibre'];
function interpret(state,description,tileIndex){
 const text=String(description||'').trim().slice(0,600), lower=text.toLowerCase();
 if(!text)throw Error('Describe what should happen.');
 const idx=Number(tileIndex);
 if(!Number.isInteger(idx)||idx<0||idx>=state.tiles.length)throw Error('Select a valid place on the map.');
 const scope=/\b(everywhere|whole world|entire world|all tiles|across the world)\b/.test(lower)?'world':'tile';
 const number=lower.match(/\b(\d{1,5})\b/),quantity=/\b(all|every)\b/.test(lower)&&/\b(remove|take|erase|destroy|vanish|disappear)\b/.test(lower)?99999:Math.min(99999,Math.max(1,number?Number(number[1]):1));
 let effect,perception;
 const remove=/\b(remove|take away|erase|destroy|drain|deplete|vanish|disappear)\b/.test(lower);
 const resource=resources.find(k=>new RegExp(`\\b${k}\\b`).test(lower))||(/\b(apple|apples|berry|berries|fruit|meal|bread)\b/.test(lower)?'food':/\b(river|lake|rainwater)\b/.test(lower)?'water':/\b(tree|trees|log|logs)\b/.test(lower)?'wood':/\b(rocks|pebbles)\b/.test(lower)?'stone':null);
 if(remove&&resource){effect={kind:'remove',category:resource,quantity,scope,tileIndex:idx};perception=`There is less ${resource} here than before.`;}
 else if(/\b(weather|rain|storm|wind|sunshine|clear skies|sunny)\b/.test(lower)&&/\b(make|change|bring|start|stop|end|turn|become|set|weather)\b/.test(lower)){
  const weather=/\b(stop|end|clear|sunny|sunshine)\b/.test(lower)?'clear':/\b(wind)\b/.test(lower)?'wind':'rain';effect={kind:'weather',weather,duration:Math.min(999,Math.max(1,number?Number(number[1]):3)),tileIndex:idx};perception=weather==='rain'?'Water is falling from above.':weather==='wind'?'The air is moving strongly.':'The sky has cleared.';
 }else if(/\b(terrain|ground|land|forest|grassland|fruit grove|stone field|lake|river)\b/.test(lower)&&/\b(turn|change|transform|become|make|create|into|replace)\b/.test(lower)){
  const terrain=/\b(forest|trees)\b/.test(lower)?'forest':/\b(berry|fruit grove)\b/.test(lower)?'berry':/\b(water|lake|river)\b/.test(lower)?'water':/\b(rock|stone field)\b/.test(lower)?'rock':'grass';effect={kind:'terrain',terrain,scope,tileIndex:idx};perception=`The ground ${scope==='world'?'everywhere':'here'} has become ${terrain==='berry'?'a fruit grove':terrain==='rock'?'stony':terrain==='grass'?'open grassland':terrain==='water'?'water':'wooded'}.`;
 }else if(/\b(heal|cure|restore|injure|hurt|wound|kill)\b/.test(lower)&&state.agents.some(a=>new RegExp(`\\b${a.name.toLowerCase().replace(/[^a-z]/g,'')}\\b`).test(lower))){
  const target=state.agents.find(a=>new RegExp(`\\b${a.name.toLowerCase().replace(/[^a-z]/g,'')}\\b`).test(lower));const mode=/\b(kill)\b/.test(lower)?'kill':/\b(injure|hurt|wound)\b/.test(lower)?'hurt':'heal';effect={kind:'person',targetId:target.id,mode,quantity:Math.min(100,number?Number(number[1]):25),tileIndex:idx};perception=mode==='heal'?`${target.name} seems stronger than before.`:mode==='kill'?`${target.name} has suddenly fallen still.`:`${target.name} has been hurt.`;
 }else{
  const raw=text.replace(/^(please\s+)?(add|put|place|create|spawn|summon|introduce|make|let there be)\s+/i,'').replace(/^\d{1,5}\s+/,'').replace(/\s+(here|on this tile|everywhere|across the world)$/i,'').replace(/\s+(appears?|arrives?|emerges?)\b.*$/i,'').replace(/[.!?]+$/,'').trim();
  const name=(raw||'unfamiliar presence').slice(0,80),category=/\b(apples?|berr(?:y|ies)|fruit|bread|meals?|food)\b/.test(lower)?'food':/\b(water)\b/.test(lower)?'water':/\b(wood|logs?|branches?)\b/.test(lower)?'wood':/\b(stones?|rocks?|pebbles?)\b/.test(lower)?'stone':/\b(fibre|fiber|grass|rope)\b/.test(lower)?'fibre':/\b(poison|fire|lava|acid|danger|hazard)\b/.test(lower)?'hazard':'mystery';
  effect={kind:'add',name,appearance:category==='mystery'?'an unfamiliar presence':category==='hazard'?'something that seems dangerous':`something resembling ${category}`,category,quantity,scope,tileIndex:idx};perception=effect.appearance[0].toUpperCase()+effect.appearance.slice(1)+` has appeared ${scope==='world'?'in many places':'here'}.`;
 }
 return {description:text,effect,perception,scope:effect.scope||'tile',tileIndex:idx,interpretation:effect.kind==='person'?`${effect.mode} ${state.agents.find(a=>a.id===effect.targetId)?.name}`:effect.kind==='add'?`Place ${effect.quantity} × ${effect.name} (${effect.category}) ${scope==='world'?'across the world':'here'}`:effect.kind==='remove'?`Remove up to ${effect.quantity} ${effect.category} from ${effect.scope==='world'?'the world':'this tile'}`:effect.kind==='terrain'?`Change ${scope==='world'?'all terrain':'this tile'} to ${effect.terrain}`:`Set ${effect.weather} weather for ${effect.duration} days`};
}
root.WorldInterpreter={interpret};if(typeof module!=='undefined')module.exports=root.WorldInterpreter;
})(typeof window!=='undefined'?window:globalThis);
