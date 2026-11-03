'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {BrandStore}=require('../../lib/creative-ai/runtime/brands'),{JobStore}=require('../../lib/creative-ai/runtime/store'),{BrandScopedProvider,snapshot}=require('../../lib/creative-ai/runtime/brand-isolation');
for(const name of ['Duroflex','Sleepyhead'])test(name+': layout guide is derived only from this job’s pinned plan; altered bytes, geometry and scope cannot dispatch',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'layout-guide-'));try{
 const brands=new BrandStore(root),store=new JobStore(path.join(root,'jobs')),brand=await brands.create({name,brandUrl:'https://example.com/'}),intake={brandId:brand.id,brandUrl:brand.brandUrl};intake.brandKnowledge=await snapshot(intake,brands);
 const job=await store.create(intake,{jobTimeoutMs:60000,maxReasoningCalls:3},[]),runtime={store,brands},scope={route:'continuity',placementId:'feed',conceptId:'concept-one'},record={...scope,canvas:{width:1200,height:627},artDirection:{scene:'Own scene'}};
 const plan={contractVersion:2,text:[{fieldId:'h',role:'headline',x:.05,y:.1,width:.4,height:.3,colour:'#111111'}],logo:null,protectedRegions:[{id:'subject',kind:'product',x:.5,y:.3,width:.45,height:.6}]};
 const saved={version:1,brandId:brand.id,artHash:require('../../lib/creative-ai/art-director').fingerprint(record.artDirection),layout:plan},k='continuity-feed';
 await store.save(job.id,'composition-overlay-'+k+'.json',saved);await store.save(job.id,'editable-source-package-'+k+'.json',record);
 const doc={brandId:brand.id,canvas:record.canvas,objects:[{type:'text',role:'headline',fieldId:'h',left:60,top:62.7,width:480,height:188.1,fill:'#111111'}],protectedRegions:[{id:'subject',kind:'product',left:600,top:188.1,width:540,height:376.2}]};
 const guide=require('../../lib/creative-ai/runtime/photo-layout-guide'),asset=await guide.create(runtime,job.id,record,doc);assert.equal(asset.brandId,brand.id);assert.equal((await require('sharp')(Buffer.from(asset.imageData.split(',')[1],'base64')).metadata()).width,1392);
 let calls=0;const provider=new BrandScopedProvider({generate:async()=>{calls++;return {ok:true};}},brands),req={scope,attachments:[asset],prompt:'Clean visual'};
 assert.equal((await provider.generate(req,store.budget(job.id))).ok,true);assert.equal(calls,1);
 await assert.rejects(()=>provider.generate({...req,scope:{...scope,conceptId:'different'}},store.budget(job.id)),/layout guide/i);
 await assert.rejects(()=>provider.generate({...req,attachments:[{...asset,imageData:'data:image/png;base64,QQ=='}]},store.budget(job.id)),/layout guide/i);
 await assert.rejects(()=>provider.generate({...req,attachments:[{...asset,brandId:'foreign'}]},store.budget(job.id)),/brand workspace/);
 plan.text[0].x=.07;await store.save(job.id,'composition-overlay-'+k+'.json',{...saved,layout:plan});await assert.rejects(()=>provider.generate(req,store.budget(job.id)),/layout guide/i);assert.equal(calls,1);
 await assert.rejects(()=>guide.create(runtime,job.id,record,doc),/layout guide/i);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('clean photograph identifies each supplied reference without passing campaign copy',()=>{
 const editable=require('../../lib/creative-ai/runtime/editable'),record={artDirection:{logo:{assetIds:['logo']}},attachmentManifest:[{assetId:'product',roles:['product'],label:'Exact SKU'},{assetId:'logo',roles:['logo'],label:'Approved logo'},{assetId:'mood',roles:['mood','setting'],label:'Reference page with a wordmark'}]},doc={canvas:{width:1200,height:627},objects:[],protectedRegions:[],assets:[]};
 const prompt=editable.photoPrompt(record,doc);assert.match(prompt,/REFERENCE ROLES/);assert.match(prompt,/Image 1.*Exact SKU/);assert.match(prompt,/Image 2.*Reference page/);assert.match(prompt,/Do not copy.*wordmarks/);assert.ok(!prompt.includes('Approved logo'));
});
