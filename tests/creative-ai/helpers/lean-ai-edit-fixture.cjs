'use strict';
// Shared offline fixture for the lean AI edit tests (design-page image editor, 8 Nov 2026).
// The provider is a fake that records calls and receipts; no paid request is ever sent.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto'),sharp=require('sharp');
const policy=require('../../../lib/creative-ai/runtime/lean-policy'),{fingerprint}=require('../../../lib/creative-ai/art-director');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function fixture(t,brandName,{original:originalBytes,output}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lean-ai-edit-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 // Dated FX rate copied into the temp root so INR estimates can be checked (read-only source).
 await fs.mkdir(path.join(root,'output/cost-tracking'),{recursive:true});await fs.copyFile(path.join(__dirname,'../../../output/cost-tracking/currency.json'),path.join(root,'output/cost-tracking/currency.json'));
 const calls=[],png=(w,h,c)=>sharp({create:{width:w,height:h,channels:3,background:c}}).png().toBuffer();
 const generated=await png(1024,1280,'#2a6fdb');
 const provider={checkAccess:async()=>({}),reason:async()=>{throw Error('AI edits must not make reasoning calls');},generate:async(req,budget)=>{calls.push(req);await budget.reserve('image',req.requestKey);await budget.receipt({kind:'image',model:'gpt-image-2',requestKey:req.requestKey,usage:{input_tokens:1500,output_tokens:6000,input_tokens_details:{text_tokens:500,image_tokens:1000}}});const image=output?await output(req):generated;return {imageData:'data:image/png;base64,'+image.toString('base64')};}};
 const handler=require('../../../lib/creative-ai/runtime/http').createHandler({root,provider}),runtime=handler.runtime;
 const server=http.createServer(async(req,res)=>{try{await handler.handle(req,res,new URL(req.url,'http://local').pathname,async r=>{let s='';for await(const c of r)s+=c;return JSON.parse(s||'{}');});}catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const origin='http://127.0.0.1:'+server.address().port,api=async(p,body)=>{const r=await fetch(origin+p,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});return {status:r.status,body:await r.json()};};
 async function brand(name){const b=await runtime.brands.create({name,brandUrl:name==='Duroflex'?'https://example.com/':'https://example.org/'}),scope=await require('../../../lib/creative-ai/runtime/brand-isolation').snapshot({brandId:b.id,brandUrl:b.brandUrl},runtime.brands),research=await runtime.researchSessions.store.create({brandId:b.id,brandUrl:b.brandUrl,brandKnowledge:scope},{...runtime.config,jobTimeoutMs:60000},[]);await runtime.researchSessions.store.update(research.id,j=>{j.status='finished';return j;});await runtime.brands.researchCompleted(b.id,research.id,scope.revision);return {b,scope,research};}
 const own=await brand(brandName),other=await brand(brandName==='Duroflex'?'Sleepyhead':'Duroflex');
 const sku=await png(64,64,brandName==='Duroflex'?'#7a1f2b':'#1f5a7a'),skuData='data:image/png;base64,'+sku.toString('base64');
 const intake={brandId:own.b.id,brandUrl:own.b.brandUrl,brandKnowledge:own.scope,brief:'Introduce this exact SKU.',productName:brandName+' Product',leanWorkflowVersion:1,conceptRoutes:['continuity']};
 const selection=[{id:'square',description:{id:'square',name:'Instagram portrait',dimensions:{width:1080,height:1350}}}];
 const job=await runtime.store.create(intake,{...policy.configure({...runtime.config,jobTimeoutMs:3600000},intake)},selection),route='continuity',placementId='square';
 const conceptId=require('../../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route);
 const body={leanWorkflowVersion:1,leanConformanceVersion:1,assignmentId:job.id,brandId:own.b.id,conceptId,route,placementId,canvas:{width:1080,height:1350},option:policy.jobOptions(await runtime.store.read(job.id)).find(o=>o.route===route),plan:{pages:[{id:placementId,copy:[{role:'headline',text:'Sleep better tonight'}]}]},prompt:'Saved plan prompt',attachments:[{assetId:'sku-photo',roles:['product'],imageData:skuData}]};
 const record={...body,packageHash:fingerprint(body)},file='image-queue-'+'a'.repeat(24)+'.json';
 await runtime.store.save(job.id,file,record);
 await runtime.store.save(job.id,'image-queue.json',{jobId:job.id,brandId:own.b.id,units:[{route,placementId,conceptId,file,hash:sha(JSON.stringify(record))}]});
 await runtime.store.save(job.id,'research.json',{brandKnowledge:own.scope,dossier:{version:1,sources:[],assets:[{id:'sku-photo',kind:'product',label:'Exact SKU photo',sourceIds:[],imageData:skuData}],findings:[]}});
 const original=originalBytes||await png(1080,1350,'#f3edf8'),key=fingerprint([route,placementId]).slice(0,24),name='static-lean-'+key+'.png';await runtime.store.save(job.id,name,original);
 await runtime.store.update(job.id,j=>{j.status='finished';j.results=[{conceptId,route,placementId,imageUrl:'/creative-ai/api/jobs/'+job.id+'/files/'+name,width:1080,height:1350,sha256:sha(original),originalArtwork:true,editable:false,status:'available',ready:true,qualityVerified:true,imageModel:'gpt-image-2',leanWorkflowVersion:1,leanConformanceVersion:1,visualReview:{status:'completed',conclusion:'no_mismatch'}}];return j;});
 const done=async id=>{for(let i=0;i<200;i++){const r=await runtime.leanEdits.read(job.id,id);if(!['queued','running','preparing'].includes(r.status))return r;await new Promise(r=>setTimeout(r,20));}throw Error('edit did not settle');};
 return {root,origin,runtime,api,calls,job,own,other,route,placementId,original,name,generated,done,unit:{route,placementId,brandId:own.b.id}};
}
module.exports={fixture,sha};
