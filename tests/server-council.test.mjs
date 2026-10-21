import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));

test('one browser request collects ten separate model referee votes',async()=>{
  let calls=0;const requests=[];
  const upstream=http.createServer((req,res)=>{
    let body='';req.on('data',part=>body+=part);req.on('end',()=>{
      calls++;
      const request=JSON.parse(body);requests.push(request);const prompt=request.input;
      const approve=!prompt.includes('You are the Social referee');
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify({output_text:JSON.stringify({approve,reason:approve?'Feasible':'Social concern'})}));
    });
  });
  const upstreamPort=await listen(upstream);
  const probe=http.createServer(),port=await listen(probe);await new Promise(resolve=>probe.close(resolve));
  const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),OPENAI_API_URL:`http://127.0.0.1:${upstreamPort}`,OPENAI_API_KEY:'test-key',AGENT_MODEL:'test-model'},stdio:'ignore'});
  try{
    let ready=false;
    for(let i=0;i<30;i++){
      try{const r=await fetch(`http://127.0.0.1:${port}/health`);if(r.ok){ready=true;break}}catch{}
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    assert.equal(ready,true,'proxy started');
    const response=await fetch(`http://127.0.0.1:${port}/api/council`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({facts:{kind:'birth',day:3,people:[]}})});
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(calls,10);
    assert.equal(data.votes.length,10);
    assert.equal(data.votes.find(v=>v.name==='Social').approve,false);
    const outcome=await fetch(`http://127.0.0.1:${port}/api/council`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({facts:{kind:'edict',mode:'open-world',day:3,proposal:{summary:'An unfamiliar morsel nourishes but causes discomfort.'}}})});
    assert.equal(outcome.status,200);assert.ok(requests.slice(-10).every(r=>r.input.includes('PROPOSED ACTUAL OUTCOME')));
    const largeFacts={kind:'edict',mode:'open-world',proposal:{summary:'A day with full evidence.'},before:{tiles:Array.from({length:80},(_,i)=>({i,type:'ground',description:'Evidence '+i+' '+('x'.repeat(1000))}))},after:{day:4},observerRequest:null};
    const complete=await fetch(`http://127.0.0.1:${port}/api/council`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({facts:largeFacts})});assert.equal(complete.status,200);assert.ok(requests.slice(-10).every(r=>r.input.includes('Evidence 0 ')&&r.input.includes('Evidence 79 ')));
    const author=await fetch(`http://127.0.0.1:${port}/api/agent`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({purpose:'world-resolution',prompt:'Author a compact open-world outcome.',max_output_tokens:5000})});
    assert.equal(author.status,200);assert.equal(requests.at(-1).max_output_tokens,5000);
  }finally{
    child.kill();
    await new Promise(resolve=>upstream.close(resolve));
  }
});
