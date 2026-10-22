'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),sharp=require('sharp');
const overlay=require('../../lib/creative-ai/runtime/logo-overlay');
const root=path.resolve(__dirname,'../..');
for(const brandId of ['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'])test('approved logo overlay '+brandId+': source identity, geometry, export proof and tamper rejection',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'logo-overlay-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const runtime={brands:{dir:id=>path.join(root,'output/creative-ai/brands',id),read:async id=>JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/brands',id,'brand.json')))},store:{dir:()=>dir,save:async(id,name,value)=>fs.writeFile(path.join(dir,name),Buffer.isBuffer(value)?value:JSON.stringify(value))}};
 const policy=await overlay.snapshot(runtime,{brandId});assert.equal(policy.variants.length,2);
 const record={packageHash:'bound-package',canvas:{width:1080,height:1080},outputFormat:'png',artDirection:{logo:{assetIds:['logo'],treatment:'Top right'},composition:'Text upper-left, logo upper-right',text:[]},placementContext:{context:{placements:[{rules:[]}]}},prompt:'Generate ONE COMPLETE static artwork. No separate composition layers.\nLogo treatment: draw logo\nAttachment roles: []\nExact embedded text: Bubbles · Canyon Rose',attachmentManifest:[{assetId:'logo',roles:['logo']},{assetId:'sku',roles:['product']}]};
 const job={intake:{brandId,logoOverlayPolicy:policy},selection:[]};runtime.store.read=async()=>job;
 const plan=await overlay.prepare(runtime,'job',record,{route:'continuity',placementId:'square'},0);assert.ok(plan);
 const req=overlay.request(record,plan);assert.deepEqual(req.attachments.map(a=>a.assetId),['sku']);assert.match(req.prompt,/NO added campaign logo/);assert.match(req.prompt,/Bubbles · Canyon Rose/);assert.doesNotMatch(req.prompt,/No separate composition layers|Logo treatment: draw/);
 const photo=await sharp({create:{width:1080,height:1080,channels:3,background:'#eeeeee'}}).png().toBuffer(),out=await overlay.compose(runtime,'job',record,plan,'data:image/png;base64,'+photo.toString('base64'));
 await runtime.store.save('job','export-proof-continuity-square-0.json',out.proof);
 const verified=await overlay.verify(runtime,'job',record,out.imageData,'static-continuity-square-0.png');assert.ok(overlay.isVerified(verified,record,out.proof.exportHash));assert.equal(overlay.isVerified(JSON.parse(JSON.stringify(verified)),record,out.proof.exportHash),false);
 assert.equal(out.proof.logoOverlay.asset.brandId,brandId);assert.equal(out.proof.logoOverlay.packageHash,record.packageHash);
 const box=out.proof.logoOverlay.box;assert.ok(box.left>=0&&box.top>=0&&box.left+box.width<=1080&&box.top+box.height<=1080);
 const wrong=await sharp(photo).negate().png().toBuffer();await assert.rejects(overlay.verify(runtime,'job',record,'data:image/png;base64,'+wrong.toString('base64'),'static-continuity-square-0.png'),/match|changed/);
 await assert.rejects(overlay.prepare(runtime,'job',{...record,canvas:{width:NaN,height:100}}, {route:'continuity',placementId:'square'},0),/canvas/i);
 await assert.rejects(overlay.prepare({...runtime,store:{...runtime.store,read:async()=>({...job,intake:{...job.intake,brandId:'wrong'}})}},'job',record,{route:'continuity',placementId:'square'},0),/brand/i);
});
test('legacy jobs and explicit no-logo placements keep their saved path',async()=>{
 const runtime={store:{read:async()=>({intake:{}})}};assert.equal(await overlay.prepare(runtime,'j',{}, {},0),null);
 runtime.store.read=async()=>({intake:{logoOverlayPolicy:{version:1},editableCanvas:true}});assert.equal(await overlay.prepare(runtime,'j',{}, {},0),null);
 runtime.store.read=async()=>({intake:{brandId:'one',logoOverlayPolicy:{version:1,brandId:'one'},logoTreatmentByPlacement:{square:'omit'}},selection:[{id:'square',description:{formatId:'square'}}]});assert.equal(await overlay.prepare(runtime,'j',{placementId:'square'}, {},0),null);
});
test('removing campaign-logo attachments retains genuine product reference markings',()=>{
 const r={canvas:{width:1080,height:1080},prompt:'Copy stays unchanged',artDirection:{logo:{assetIds:['campaign-logo']}},attachmentManifest:[{assetId:'campaign-logo',roles:['logo']},{assetId:'sku',roles:['product','logo']}]},before=JSON.stringify(r);
 const request=overlay.request(r,{box:{left:10,top:10,width:100,height:20}});assert.deepEqual(request.attachments.map(a=>a.assetId),['sku']);assert.deepEqual(request.attachments[0].roles,['product']);assert.equal(JSON.stringify(r),before);
});
for(const [brandId,jobId,attempt] of [['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','creative-b421f4a4-3a63-48ec-b573-361048edabbe',0],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','creative-e9f8c2ce-6138-4120-9043-68d4de847c6f',1]])test('saved '+brandId+' package through mocked generation, review and separate editable logo',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'logo-pipeline-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const disk=require('../../lib/creative-ai/runtime/artifact-fs'),savedDir=path.join(root,'output/creative-ai/jobs',jobId),suffix='continuity-custom_studio-social-square-'+attempt,read=async n=>JSON.parse(await disk.readFile(path.join(savedDir,n)));
 const record=await read('package-'+suffix+'.json'),saved=(await read('review-recovery-'+suffix+'.json')).outcome,brand=JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/brands',brandId,'brand.json')));
 const runtime={brands:{dir:id=>path.join(root,'output/creative-ai/brands',id),read:async()=>brand},store:{dir:()=>dir,save:async(id,name,value)=>fs.writeFile(path.join(dir,name),Buffer.isBuffer(value)?value:JSON.stringify(value))},beginTask:async()=>{},finishTask:async()=>{},artifact:async()=>({id:'test-artifact'}),log:async()=>{}};
 const policy=await overlay.snapshot(runtime,{brandId}),job={id:jobId,intake:{brandId,logoOverlayPolicy:policy},selection:[],results:[]};runtime.store.read=async()=>job;
 const imageData='data:image/png;base64,'+(await sharp({create:{width:1080,height:1080,channels:3,background:'#efefef'}}).png().toBuffer()).toString('base64');let imageCalls=0;
 runtime.provider={generate:async req=>{imageCalls++;assert.match(req.prompt,/NO added campaign logo/);assert.ok(req.attachments.every(a=>!a.roles.includes('logo')));return {imageData};}};
 const generate=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype.generateImage,scope={route:record.route,placementId:record.placementId,conceptId:record.conceptId};
 const image=await generate.call(runtime,jobId,record,{},scope,attempt);await generate.call(runtime,jobId,record,{},scope,attempt);assert.equal(imageCalls,1,'Saved composed image must not dispatch again');
 const token=await overlay.verify(runtime,jobId,record,image.imageData,image.name);await fs.copyFile(path.join(savedDir,'placement-catalog.json'),path.join(dir,'placement-catalog.json'));let reviews=0;
 const provider={reason:async req=>{reviews++;assert.equal(req.wire.schema.properties.critical.properties['logo-identity'],undefined,'No identity-recognition task sent to reviewer');assert.match(req.instructions,/Do NOT recognise/);
  const v={...structuredClone(saved.input.evidence),logoPresentation:overlay.presentationCriteria.map(criterion=>({criterion,status:'pass',confidence:1,observation:'Mocked presentation check for pipeline wiring; not actual artwork approval.'})),copyObservations:saved.copyObservations,readabilityObservations:saved.readabilityObservations,productObservations:saved.productObservations};
  for(const [name,key] of Object.entries({logoPresentation:'criterion',critical:'criterion',quality:'criterion',copyObservations:'fieldId',readabilityObservations:'fieldId',productObservations:'criterion',placementObservations:'ruleId'}))if(req.wire.schema.properties[name]?.type==='object'){const props=req.wire.schema.properties[name].properties;v[name]=Object.fromEntries((v[name]||[]).filter(x=>props[x[key]]).map(x=>[x[key],x]));}else if(!req.wire.schema.properties[name])delete v[name];
  v.findings=v.findings.filter(x=>x.criterion!=='logo-identity');const decoded=req.wire.decode(v);await req.validate(decoded);return decoded;}};
 const reviewed=await require('../../lib/creative-ai/runtime/review').review(record,image.imageData,{provider,budget:{},dir,attempt:'mock',logoOverlay:token});assert.equal(reviews,1);const identityCheck=reviewed.report.criticalChecks.find(c=>c.criterion==='logo-identity');assert.equal(identityCheck.status,'pass');assert.match(identityCheck.evidence.observation,/CODE-VERIFIED SOURCE/);const bad=overlay.presentationCriteria.map(criterion=>({criterion,status:criterion==='contrast'?'fail':'pass',confidence:1,observation:'Mock low contrast'}));assert.equal(overlay.check(token,bad).status,'fail','Exact source identity must not override poor contrast');
 // These are pipeline tests with a blank mocked image, never artwork approvals.
 await runtime.store.save(jobId,'package-'+suffix+'.json',record);job.results=[{...scope,imageUrl:'/creative-ai/api/jobs/'+jobId+'/files/'+image.name}];runtime.editable={read:async()=>{const e=Error('Not created');e.code='ENOENT';throw e;}};
 const state=await require('../../lib/creative-ai/runtime/editor-ocr').convert(runtime,jobId,record.route,record.placementId,{imageUrl:job.results[0].imageUrl});assert.equal(state.ocr.logoSeparated,true);assert.equal(state.document.objects.filter(o=>o.role==='logo').length,1);assert.equal(state.ocr.maskedPixels,0,'Logo removal must reuse background, not inpaint');
 const photo=state.document.assets.find(a=>a.kind==='photograph');assert.deepEqual(await fs.readFile(path.join(dir,photo.url.split('/').pop())),token.background);assert.equal(imageCalls,1);assert.equal(reviews,1);
 // Export resolves every saved asset, not only its browser URL.
 await require('../../lib/creative-ai/runtime/editable').resolved(runtime,jobId,state.document);
 const legacy=structuredClone(state.document),logo=legacy.assets.find(a=>a.kind==='logo');assert.equal(logo.scope,'job');delete logo.scope;
 await require('../../lib/creative-ai/runtime/editable').resolved(runtime,jobId,legacy);
 logo.url=logo.url.replace(jobId,'creative-other-job');await assert.rejects(()=>require('../../lib/creative-ai/runtime/editable').resolved(runtime,jobId,legacy),/another creative/);
});
