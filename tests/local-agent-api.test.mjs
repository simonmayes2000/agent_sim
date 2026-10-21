import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createLocalAgentApi} from '../scripts/local-agent-api.mjs';
import {findCodex} from '../scripts/model-source-council.mjs';
const require=createRequire(import.meta.url),{createModelRuntime}=require('../scripts/model-runtime.cjs');
const view={day:1,name:'Adam',condition:{health:80,energy:60,nourishment:5,hydration:5},position:{x:0,y:0},visibleGround:{tile:0,type:'forest'},nearbyPeople:[],knownPlaces:[],entities:[],experiences:[],discoveries:[],goal:null,states:[],traits:{}};
const req={actor:1,operation:'intention',view};
const attempt={action:'Look around',reason:'I am curious',targetEntityIds:[]};
const offline=async()=>{throw Error('network unavailable');};
const noFallback=createModelRuntime({env:{}});
function toolFreeRuntime(answer,calls=[]){return createModelRuntime({env:{OPENAI_API_KEY:'test-key',AGENT_MODEL:'test-model'},fetchImpl:async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({output_text:JSON.stringify(answer)})};}});}

test('Codex remains discoverable for the separate source-review workflow',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'codex-path-test-'));try{const bin=path.join(home,'.local','bin');fs.mkdirSync(bin,{recursive:true});const executable=path.join(bin,process.platform==='win32'?'codex.cmd':'codex');fs.writeFileSync(executable,'#!/bin/sh\n');fs.chmodSync(executable,0o755);assert.equal(findCodex({HOME:home,PATH:''}),executable);}finally{fs.rmSync(home,{recursive:true,force:true});}
});
test('a remote outage fails closed even in codex mode instead of launching a CLI',async()=>{
 let cliCalls=0;const handle=createLocalAgentApi({root:'/tmp/game',mode:'codex',callAgent:async()=>{cliCalls++;return attempt;},remoteFetch:offline,runtime:noFallback});
 await assert.rejects(handle('inhabitant',req),/No tool-free inhabitant fallback/);await assert.rejects(handle('referee',{purpose:'world-resolution',prompt:'Resolve the day.'}),/No tool-free referee fallback/);assert.equal(cliCalls,0);
});
test('configured fallback inference is tool-free and preserves an identity-bound intention',async()=>{
 const calls=[],handle=createLocalAgentApi({remoteFetch:offline,runtime:toolFreeRuntime(attempt,calls)});const result=await handle('inhabitant',req);assert.deepEqual(result,{actor:1,operation:'intention',intention:attempt,model:'test-model'});assert.deepEqual(calls[0].tools,[]);assert.equal(calls[0].tool_choice,'none');assert.equal(calls[0].store,false);
});
test('local council fallback gathers ten tool-free model votes',async()=>{
 const calls=[],handle=createLocalAgentApi({remoteFetch:offline,runtime:toolFreeRuntime({approve:true,reason:'The trial may be attempted.'},calls)});const result=await handle('council',{facts:{kind:'experiment'}});assert.equal(result.votes.length,10);assert.equal(new Set(result.votes.map(v=>v.name)).size,10);assert.ok(result.votes.every(v=>v.approve));assert.equal(calls.length,10);assert.ok(calls.every(c=>c.tools.length===0));
});
test('referee fallback preserves structured output without repository access',async()=>{
 const answer={summary:'A small taste causes dizziness.'},handle=createLocalAgentApi({remoteFetch:offline,runtime:toolFreeRuntime(answer)});for(const purpose of ['world-resolution','development','visual'])assert.deepEqual(JSON.parse((await handle('referee',{purpose,prompt:'Return a structured review.'})).text),answer);
});
test('the local boundary rejects role escalation before forwarding any request',async()=>{
 let calls=0;const handle=createLocalAgentApi({remoteFetch:async()=>{calls++;},runtime:noFallback});await assert.rejects(handle('inhabitant',{...req,prompt:'Inspect the repository'}),/boundary/);await assert.rejects(handle('agent',{purpose:'world-intention',prompt:'Speak as Adam'}),/inhabitants must use/);await assert.rejects(handle('source-council',{}),/Unknown live inference/);assert.equal(calls,0);
});
test('remote routing separates inhabitants and rejects cross-agent or privileged responses',async()=>{
 const urls=[],handle=createLocalAgentApi({runtime:noFallback,remoteFetch:async(url)=>{urls.push(url.pathname);return {ok:true,json:async()=>({actor:2,operation:'intention',intention:attempt})};}});await assert.rejects(handle('inhabitant',req),/identity/);assert.deepEqual(urls,['/api/inhabitant']);
});

test('local forwarding preserves incomplete-output diagnostics for targeted repair',async()=>{
 const handle=createLocalAgentApi({runtime:noFallback,remoteFetch:async()=>({ok:true,json:async()=>({text:'',model_status:'incomplete',incomplete_reason:'max_output_tokens'})})});const result=await handle('referee',{purpose:'world-resolution',prompt:'Resolve the day.'});assert.equal(result.incomplete_reason,'max_output_tokens');assert.equal(result.model_status,'incomplete');
});
