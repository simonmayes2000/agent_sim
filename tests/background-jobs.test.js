const test=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../dist/background-jobs.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('jobs do not block the caller and coalesce each lane to the newest waiting task',async()=>{
 const jobs=create(),calls=[];let release;
 jobs.schedule('development',async()=>{calls.push(1);await new Promise(r=>release=r);});
 jobs.schedule('development',async()=>calls.push(2));jobs.schedule('development',async()=>calls.push(3));
 jobs.schedule('visual',async()=>calls.push('visual'));assert.deepEqual(calls,[1,'visual']);
 release();await tick();assert.deepEqual(calls,[1,'visual',3]);assert.deepEqual(jobs.status(),[]);
});
test('reset aborts old-world requests and prevents old results or pending work from applying',async()=>{
 const jobs=create(),applied=[];let release,signal;
 jobs.schedule('visual',async token=>{signal=token.signal;await new Promise(r=>release=r);if(token.current())applied.push('old');});
 jobs.schedule('visual',async()=>applied.push('old pending'));jobs.reset();assert.equal(signal.aborted,true);
 jobs.schedule('visual',async()=>applied.push('new'));release();await tick();assert.deepEqual(applied,['new']);assert.deepEqual(jobs.status(),[]);
});
