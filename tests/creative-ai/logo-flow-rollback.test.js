'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
for(const brandId of ['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'])test('new '+brandId+' requests retain original model-rendered logo flow',async t=>{
 const brand=JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/brands',brandId,'brand.json')));brand.latestResearchId=require('./helpers/pinned-research-fixture').ids[brandId];let intake;
 const runtime={config:{maxReasoningCalls:40},brands:{read:async()=>brand,dir:id=>path.join(root,'output/creative-ai/brands',id)},researchSessions:{prepare:async i=>{intake=i;throw Error('Captured before dispatch');}}};
 await assert.rejects(()=>CreativeRuntime.prototype.createRequest.call(runtime,{brandId,brandUrl:brand.brandUrl,researchId:brand.latestResearchId,brief:'Same brief',placementIds:['custom:studio-social-square'],logoOverlayPolicy:{version:1,brandId,variants:brand.canvasAssets.logos}}),/Captured before dispatch/);
 assert.ok(intake.approvedLogoReference,'Approved reference remains pinned');assert.equal(intake.logoOverlayPolicy,undefined,'New jobs must not opt into the rejected overlay experiment');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'original-logo-flow-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const record={canvas:{width:1080,height:1080},outputFormat:'png',prompt:'Use the supplied approved logo within the complete artwork. Exact copy: Bubbles · Canyon Rose',attachmentManifest:[{assetId:'approved-logo',roles:['logo']},{assetId:'sku',roles:['product']}],placementContext:{context:{placements:[{rules:[]}]}}};let calls=0;
 const imageData='data:image/png;base64,'+(await sharp({create:{width:1080,height:1080,channels:3,background:'#f1f1f1'}}).png().toBuffer()).toString('base64');
 Object.assign(runtime,{activity:{project:async()=>({tasks:{}})},store:{dir:()=>dir,read:async()=>({intake}),save:async(id,n,v)=>fs.writeFile(path.join(dir,n),Buffer.isBuffer(v)?v:JSON.stringify(v))},beginTask:async()=>{},finishTask:async()=>{},artifact:async()=>{},log:async()=>{},provider:{generate:async r=>{calls++;assert.ok(r.prompt.startsWith(record.prompt));assert.doesNotMatch(r.prompt,/COMPOSITING OVERRIDE|Reserve this exact empty/);assert.deepEqual(r.attachments,record.attachmentManifest);return {imageData};}}});
 await CreativeRuntime.prototype.generateImage.call(runtime,'job',record,{}, {route:'continuity',placementId:'square'},0);
 const proof=JSON.parse(await fs.readFile(path.join(dir,'export-proof-continuity-square-0.json')));assert.equal(proof.logoOverlay,undefined);assert.equal(calls,1);
});
