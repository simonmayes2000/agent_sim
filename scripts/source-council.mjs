#!/usr/bin/env node
/* Run locally: serve the game, let ten referees amend source, test, and commit. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {propose,review,unanimous,parseSource,amendSource} from './source-governance-core.mjs';
import {runModelCouncil} from './model-source-council.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist'),ruleFile=path.join(dist,'realism-rules.js'),auditFile=path.join(root,'work','source-council.jsonl');
const args=process.argv.slice(2),port=Number(args[args.indexOf('--port')+1])||8000,push=args.includes('--push'),mode=args[args.indexOf('--agents')+1]==='codex'?'codex':'procedural';let lastReviewedDay=0;
function git(...a){return spawnSync('git',a,{cwd:root,encoding:'utf8',timeout:30000})}
function record(entry){fs.mkdirSync(path.dirname(auditFile),{recursive:true});fs.appendFileSync(auditFile,JSON.stringify(entry)+'\n')}
function outcome(world){
 if(!world||!Array.isArray(world.agents)||!Array.isArray(world.tiles)||world.tiles.length>256||world.agents.length>500||!Number.isInteger(world.day))throw Error('The world snapshot is invalid.');
 const original=fs.readFileSync(ruleFile,'utf8'),rules=parseSource(original);
 if(world.day<=lastReviewedDay)return {status:'already-reviewed',rules};lastReviewedDay=world.day;
 const proposal=propose(world,rules);if(!proposal)return {status:'no-evidence',rules};
 const votes=review(world,rules,proposal),entry={day:world.day,at:new Date().toISOString(),proposal,votes,consensus:unanimous(votes)};
 if(!entry.consensus){entry.status='rejected';record(entry);return {status:entry.status,proposal,votes,rules}}
 if(git('status','--porcelain','--untracked-files=no').stdout.trim()){entry.status='deferred';entry.reason='The tracked source tree has uncommitted changes.';record(entry);return {status:entry.status,proposal,votes,rules,reason:entry.reason}}
 const changed=amendSource(original,proposal);fs.writeFileSync(ruleFile,changed);
 const tests=fs.readdirSync(path.join(root,'tests')).filter(n=>/\.test\.(js|mjs)$/.test(n)).map(n=>path.join('tests',n));
 const check=spawnSync(process.execPath,['--test',...tests],{cwd:root,encoding:'utf8',timeout:30000,env:{...process.env,OPENAI_API_KEY:''},maxBuffer:1024*1024});
 if(check.status!==0){fs.writeFileSync(ruleFile,original);entry.status='rejected-by-tests';entry.reason=(check.stderr||check.stdout||'Tests failed').slice(-2000);record(entry);return {status:entry.status,proposal,votes,rules,reason:entry.reason}}
 const commit=git('-c','user.name=Source Council','-c','user.email=source-council@localhost','add','--','dist/realism-rules.js');
 const saved=commit.status===0?git('-c','user.name=Source Council','-c','user.email=source-council@localhost','commit','-m',`Source council: ${proposal.kind}`):commit;
 if(saved.status!==0){fs.writeFileSync(ruleFile,original);git('reset','--','dist/realism-rules.js');entry.status='commit-failed';entry.reason=saved.stderr.slice(-1000);record(entry);return {status:entry.status,proposal,votes,rules,reason:entry.reason}}
 entry.status='committed';entry.commit=git('rev-parse','HEAD').stdout.trim();if(push){const pushed=git('push','origin','HEAD:main');entry.pushStatus=pushed.status===0?'pushed':'push-failed';if(pushed.status!==0)entry.pushError=pushed.stderr.slice(-1000)}record(entry);
 return {status:entry.status,proposal,votes,rules:parseSource(changed),commit:entry.commit,pushStatus:entry.pushStatus};
}
async function reviewWorld(world){if(mode==='procedural')return outcome(world);if(!world||!Array.isArray(world.agents)||!Array.isArray(world.tiles)||world.tiles.length>256||world.agents.length>500||!Number.isInteger(world.day))throw Error('The world snapshot is invalid.');if(world.day<=lastReviewedDay)return {status:'already-reviewed',mode};lastReviewedDay=world.day;let result;try{result=await runModelCouncil(world,root)}catch(e){result={status:'model-unavailable',mode,reason:e.message}}if(result.status==='committed'&&push){const pushed=git('push','origin','HEAD:main');result.pushStatus=pushed.status===0?'pushed':'push-failed'}record({at:new Date().toISOString(),day:world.day,...result});return result}
function json(res,code,value){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
function recent(){try{return fs.readFileSync(auditFile,'utf8').trim().split('\n').slice(-20).filter(Boolean).map(JSON.parse).reverse().map(({day,at,status,reason,proposal,commit,votes})=>({day,at,status,reason,proposal:proposal&&{key:proposal.key,evidence:proposal.evidence,rationale:proposal.rationale},commit,votes}))}catch{return []}}
function serve(req,res){let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://local').pathname)}catch{return json(res,400,{error:'Invalid path'})}
 if(pathname==='/__source-council/status'&&req.method==='GET')return json(res,200,{connected:true,mode,rules:parseSource(fs.readFileSync(ruleFile,'utf8')),history:recent()});
 if(pathname==='/__source-council/observe'&&req.method==='POST'){
  const expected=`http://127.0.0.1:${port}`;if(req.headers.origin&&req.headers.origin!==expected)return json(res,403,{error:'Only the local game may submit a world.'});
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'A JSON world is required.'});
  let bytes=0,body='';req.on('data',part=>{bytes+=part.length;if(bytes>2_000_000)req.destroy();else body+=part});req.on('end',async()=>{try{json(res,200,await reviewWorld(JSON.parse(body)))}catch(e){json(res,400,{error:e.message})}});return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed'});
 const file=path.resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(dist+path.sep))return json(res,403,{error:'Forbidden'});
 try{const stat=fs.statSync(file);if(!stat.isFile())throw Error('Not a file');const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res)}catch{json(res,404,{error:'Not found'})}
}
if(args.includes('--once')){const file=args[args.indexOf('--once')+1];if(!file)throw Error('Pass an exported world JSON path after --once.');console.log(JSON.stringify(await reviewWorld(JSON.parse(fs.readFileSync(file,'utf8'))),null,2))}
else http.createServer(serve).listen(port,'127.0.0.1',()=>console.log(`Source council game: http://127.0.0.1:${port}`));
