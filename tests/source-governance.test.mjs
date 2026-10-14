import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {propose,review,unanimous,parseSource,amendSource} from '../scripts/source-governance-core.mjs';
const source=fs.readFileSync(new URL('../dist/realism-rules.js',import.meta.url),'utf8').replace(/"shelterRequiresPhysicalSite": (true|false)/,'"shelterRequiresPhysicalSite": false');
function world(){return {day:12,width:2,height:1,weather:'rain',tiles:[{type:'grass',structures:[],water:8,food:3,items:[]},{type:'forest',structures:[],water:0,food:1,items:[]}],agents:[{id:1,name:'Adam',alive:true,x:0,y:0,food:4,water:4,knowledge:['shelter:1']}],tech:{nodes:[{id:'shelter:1',effect:'shelter'}]}}}
test('evidence can produce a source amendment proposal after ten unanimous votes',()=>{const rules=parseSource(source),w=world(),p=propose(w,rules);assert.equal(p.key,'shelterRequiresPhysicalSite');const votes=review(w,rules,p);assert.equal(votes.length,10);assert.equal(unanimous(votes),true);const changed=amendSource(source,p);assert.equal(parseSource(changed).shelterRequiresPhysicalSite,true);assert.equal(parseSource(source).shelterRequiresPhysicalSite,false)});
test('no evidence means no self-modification',()=>{const w=world();w.weather='clear';assert.equal(propose(w,parseSource(source)),null)});
test('invalid or stale amendments are vetoed',()=>{const rules=parseSource(source),w=world(),p={key:'lowWaterThreshold',from:9,to:10,evidence:'test',kind:'anticipatory-water'};assert.equal(unanimous(review(w,rules,p)),false);assert.throws(()=>amendSource(source,p))});
