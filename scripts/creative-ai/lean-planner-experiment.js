#!/usr/bin/env node
'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),flow=require('../../lib/creative-ai/experiments/lean-planner');
const {finishRun}=require('../../lib/creative-ai/experiments/lean-planner/finishing');
const {correctRun}=require('../../lib/creative-ai/experiments/lean-planner/correction');
const port=Number(process.env.LEAN_EXPERIMENT_PORT||1863);let active=null;
function launch(run,options){active=run.id;flow.execute(root,run,options).then(r=>console.log(JSON.stringify({id:r.id,status:r.status,error:r.error,models:r.models,planner:r.planner}))).catch(e=>console.error(e.message)).finally(()=>active=null);}
function launchReview(id){active=id;finishRun(root,id).then(result=>console.log(JSON.stringify({reviewRun:id,status:result.status,errors:result.errors,reviews:result.reviews.map(r=>({artifact:r.artifact,status:r.status,counts:r.report?.counts,error:r.error})),corrections:result.corrections.map(r=>({model:r.model,pageId:r.pageId,status:r.status,error:r.error}))}))).catch(e=>console.error(e.message)).finally(()=>active=null);}
function launchCorrection(id){active=id;correctRun(root,id).then(rows=>console.log(JSON.stringify({correctionRun:id,corrections:rows.map(r=>({model:r.model,pageId:r.pageId,status:r.status,error:r.error,pixelProof:r.pixelProof}))}))).catch(e=>console.error(e.message)).finally(()=>active=null);}
async function main(){
 let recovering=false;const recover=async()=>{if(active||recovering)return;recovering=true;try{await require('../../lib/creative-ai/experiments/lean-planner/planner-recovery').recoverPending(root,{apiKey:require('../../lib/creative-ai/runtime/config').loadConfig(root).apiKey});}catch(e){console.error('Planning recovery: '+e.message);}finally{recovering=false;}};
 setInterval(recover,15000).unref();

 const server=http.createServer(async(req,res)=>{try{
  if(req.headers.host!=='127.0.0.1:'+port){res.writeHead(403);res.end();return;}
  const url=new URL(req.url,'http://127.0.0.1:'+port);
  const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  if(req.method==='GET'&&url.pathname==='/runs'){return json(200,{active:active||(recovering?'recovering':null),formats:flow.formats(),runs:await flow.list(root)});}
  if(req.method==='POST'&&url.pathname==='/runs'){
   if(req.headers.origin!=='http://127.0.0.1:'+port)return json(403,{error:'Same-origin requests only'});
   if(active||recovering)return json(409,{error:'A comparison is already running. Saved results remain available.'});
   active='preparing';try{let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>24000)throw Error('Brief is too large');}
    const {brief,requestId,formatId}=JSON.parse(body);if(typeof brief!=='string'||!brief.trim()||brief.length>5000)throw Error('Enter a brief under 5,000 characters.');
    const run=await flow.create(root,brief,requestId,formatId);if(run.status==='queued')launch(run);else active=null;return json(200,{id:run.id});
   }catch(e){active=null;throw e;}
  }
  const reviewRoute=/^\/runs\/(lean-[a-z0-9-]+)\/reviews$/.exec(url.pathname);
  if(req.method==='POST'&&reviewRoute){
   if(req.headers.origin!=='http://127.0.0.1:'+port)return json(403,{error:'Same-origin requests only'});
   if(active||recovering)return json(409,{error:'A comparison or visual check is already running.'});
   active='preparing';try{const saved=(await flow.list(root)).find(r=>r.id===reviewRoute[1]);if(!saved||saved.version!==2||!['completed','partial'].includes(saved.status))throw Error('A finished v2 comparison is required');launchReview(saved.id);return json(202,{id:saved.id});}catch(e){active=null;throw e;}
  }
  const correctionRoute=/^\/runs\/(lean-[a-z0-9-]+)\/corrections$/.exec(url.pathname);
  if(req.method==='POST'&&correctionRoute){
   if(req.headers.origin!=='http://127.0.0.1:'+port)return json(403,{error:'Same-origin requests only'});
   if(active||recovering)return json(409,{error:'A comparison or correction is already running.'});
   active='preparing';try{const saved=(await flow.list(root)).find(r=>r.id===correctionRoute[1]);if(!saved||saved.version!==2||!['completed','partial'].includes(saved.status))throw Error('A finished v2 comparison is required');launchCorrection(saved.id);return json(202,{id:saved.id});}catch(e){active=null;throw e;}
  }
  if(req.method!=='GET')return json(405,{error:'Method not supported'});
  let file,type;
  if(url.pathname==='/'){file=path.join(root,'lib/creative-ai/experiments/lean-planner/index.html');type='text/html';}
  else {const m=/^\/files\/(lean-[a-z0-9-]+)\/(gpt-image-2(?:\.6-sunburst)?(?:-page-[1-5](?:-v[0-9]+)?)?\.png|correction-gpt-image-2(?:\.6-sunburst)?-page-[1-5](?:-candidate\.png|\.txt|\.json)|plan\.json|planner-input\.json|image-prompt(?:-page-[1-5](?:-v[0-9]+)?)?\.txt|provenance\.json)$/.exec(url.pathname);if(!m)return json(404,{error:'Not found'});file=path.join(flow.outputRoot(root),m[1],m[2]);type=m[2].endsWith('.png')?'image/png':m[2].endsWith('.json')?'application/json':'text/plain';}
  const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(bytes);
 }catch(e){if(!res.headersSent){res.writeHead(e.code==='ENOENT'?404:400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}else res.end();}});
 server.on('error',e=>{console.error('Experiment server unavailable: '+e.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',async()=>{console.log('Lean planner experiment: http://127.0.0.1:'+port);const correctionId=process.argv.find(x=>x.startsWith('--correct='))?.slice(10);if(correctionId){launchCorrection(correctionId);return;}const reviewId=process.argv.find(x=>x.startsWith('--review='))?.slice(9);if(reviewId){launchReview(reviewId);return;}const retryId=process.argv.find(x=>x.startsWith('--retry-local-size='))?.split('=')[1];if(retryId){active=retryId;flow.retryLocalSize(root,retryId).then(r=>console.log(JSON.stringify({id:r.id,status:r.status,models:r.models}))).catch(e=>console.error(e.message)).finally(()=>active=null);return;}const resumeId=process.argv.find(x=>x.startsWith('--resume-plan='))?.split('=')[1];if(resumeId){const saved=(await flow.list(root)).find(r=>r.id===resumeId);if(!saved)throw Error('Saved run not found');launch(saved,{resumePlan:true});}else if(process.argv.includes('--run')){const queued=(await flow.list(root)).find(r=>r.status==='queued'&&r.brief===flow.defaultBrief);const run=queued||await flow.create(root,flow.defaultBrief,crypto.randomUUID());launch(run);console.log('New experiment: http://127.0.0.1:'+port+'/?run='+run.id);}});
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
