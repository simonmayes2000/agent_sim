import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createLocalAgentApi} from '../scripts/local-agent-api.mjs';
import {findCodex} from '../scripts/model-source-council.mjs';

test('Codex launcher finds a user-local install when PATH omits it',()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'codex-path-test-'));
  try{
    const bin=path.join(home,'.local','bin');fs.mkdirSync(bin,{recursive:true});
    const executable=path.join(bin,process.platform==='win32'?'codex.cmd':'codex');
    fs.writeFileSync(executable,'#!/bin/sh\n');fs.chmodSync(executable,0o755);
    assert.equal(findCodex({HOME:home,PATH:''}),executable);
  }finally{fs.rmSync(home,{recursive:true,force:true})}
});

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

test('development reviews preserve structured advice through local Codex fallback',async()=>{
  const advice={status:'suggestion',evidence:'Food remains but Adam is hungry.',change:'Investigate food access.',validation:'Compare resource access over equal-seed runs.'};
  let prompt;
  const handle=createLocalAgentApi({root:'/tmp/game',mode:'codex',remoteFetch:async()=>{throw Error('network unavailable')},callAgent:async value=>{prompt=value;return advice}});
  const result=await handle('agent',{prompt:'Review game development as the Space referee.',purpose:'development'});
  assert.deepEqual(JSON.parse(result.text),advice);
  assert.equal(prompt,'Review game development as the Space referee.');
});

test('visual referee plans preserve structured scene direction through local Codex fallback',async()=>{
  const direction={title:'Rain-darkened settlement',palette:{ground:'#445544'},regions:[],marks:[]};
  let prompt;
  const handle=createLocalAgentApi({root:'/tmp/game',mode:'codex',remoteFetch:async()=>{throw Error('network unavailable')},callAgent:async value=>{prompt=value;return direction}});
  const result=await handle('agent',{prompt:'Direct the satellite appearance.',purpose:'visual'});
  assert.deepEqual(JSON.parse(result.text),direction);
  assert.equal(prompt,'Direct the satellite appearance.');
});
