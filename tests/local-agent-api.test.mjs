import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalAgentApi} from '../scripts/local-agent-api.mjs';

test('local game uses Codex when the remote dialogue API cannot load',async()=>{
  let calls=0;
  const handle=createLocalAgentApi({root:'/tmp/game',mode:'codex',remoteFetch:async()=>{throw Error('network unavailable')},callAgent:async()=>{calls++;return {text:'I see trees nearby.'}}});
  assert.deepEqual(await handle('agent',{prompt:'Speak as Adam'}),{text:'I see trees nearby.'});
  assert.equal(calls,1);
});

test('local council fallback gathers ten independent votes',async()=>{
  const roles=[];
  const handle=createLocalAgentApi({root:'/tmp/game',mode:'codex',remoteFetch:async()=>{throw Error('network unavailable')},callAgent:async prompt=>{roles.push(prompt.match(/You are the (.+?) referee/)[1]);return {approve:true,reason:'The trial may be attempted.'}}});
  const result=await handle('council',{facts:{kind:'experiment',proposal:{method:'taste',materials:['berry']}}});
  assert.equal(result.votes.length,10);
  assert.equal(new Set(roles).size,10);
  assert.ok(result.votes.every(v=>v.approve));
});

test('procedural local service reports remote failure instead of inventing agent dialogue',async()=>{
  const handle=createLocalAgentApi({root:'/tmp/game',mode:'procedural',remoteFetch:async()=>{throw Error('network unavailable')}});
  await assert.rejects(handle('agent',{prompt:'Speak as Adam'}),/network unavailable/);
});
