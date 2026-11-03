'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const C=require('../../lib/creative-ai/runtime/composed-text');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': image-only dispatch has no typography directive or guide; old requests remain pinned',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'clean-source-audit-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const record={conceptId:'c',route:'continuity',placementId:'clean',exactCopy:{fields:[]},artDirection:{typography:'No embedded typography. Native ad text remains separate.',logo:{assetIds:[]}},attachmentManifest:[]};
 const doc={brandId:brand,canvas:{width:1200,height:628},objects:[],fonts:[]};let request,guides=0;
 t.mock.method(require('../../lib/creative-ai/runtime/composed-type-guide'),'create',async()=>{guides++;return {assetId:'composed-type-guide'};});
 let intake={brandId:brand,composedQualityVersion:14,composedPromptVersion:2};
 const runtime={store:{dir:()=>dir,read:async()=>({intake}),save:async(id,name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value))},provider:{generate:async req=>{request=req;throw Error('Offline dispatch capture');}}};
 await assert.rejects(()=>C.prepare(runtime,'fixture','continuity-clean',record,doc,{}),/Offline dispatch capture/);
 assert.equal(guides,0,'An empty text plan must not send a typography guide');
 assert.match(request.prompt,/No embedded typography/);
 assert.match(request.prompt,/ZERO campaign text/);
 assert.doesNotMatch(request.prompt,/INCLUDING the exact campaign text|render the exact campaign words|authoritative exact campaign typography block|LAST reference/);
 const legacy=C.prompt(record,doc,14);assert.match(legacy,/INCLUDING the exact campaign text/);
 assert.equal(C.prompt(record,doc,14),legacy,'Historical checkpoint bytes stay unchanged');
});
test('new prompt policy rejects a copy/document mismatch before any provider call',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'copy-source-audit-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));let calls=0;
 const record={exactCopy:{fields:[{id:'h',text:'Required words',delivery:'embedded'}]},attachmentManifest:[],artDirection:{}};
 const runtime={store:{dir:()=>dir,read:async()=>({intake:{composedPromptVersion:2}}),save:async(id,name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value))},provider:{generate:async()=>{calls++;throw Error('Unexpected dispatch');}}};
 await assert.rejects(()=>C.prepare(runtime,'fixture','unit',record,{canvas:{width:800,height:400},objects:[],fonts:[]},{}),/copy|wording/i);
 assert.equal(calls,0);
});
test('new jobs pin the clean-image prompt policy without changing older job files',async t=>{
 let intake;t.mock.method(require('../../lib/creative-ai/runtime/approved-identity'),'snapshot',async(r,value)=>{intake=value;throw Error('Captured admission');});
 const runtime={config:{maxReasoningCalls:40,estimatedSpend:{maxUsd:100,reasoningUsd:2,imageUsd:3}}};
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype.createRequest.call(runtime,{brief:'Offline fixture',composedTextVersion:1,placementIds:['merchant-primary']}),/Captured admission/);
 assert.equal(intake.composedPromptVersion,2);assert.equal(intake.composedLogoDetectionVersion,2);assert.equal(intake.approvedLogoOverlayVersion,1);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a repair review proposing unapplied changes cannot approve the unchanged candidate',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'repair-verdict-audit-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.writeFile(path.join(dir,'source.png'),'source');
 const E=require('../../lib/creative-ai/runtime/editable'),Q=require('../../lib/creative-ai/runtime/editable-quality');
 t.mock.method(E,'render',async()=>({data:'data:image/png;base64,YQ==',issues:[],measurements:[]}));
 t.mock.method(Q,'compositionChecks',()=>({imageHash:'rendered',issues:[]}));
 t.mock.method(require('../../lib/creative-ai/runtime/wording-agreement'),'verifyCanvas',()=>{});
 t.mock.method(Q,'reviewOnce',async()=>({status:'complete',review:{observations:['readability','copy-fit','logo','subject-occlusion','photograph'].map(check=>({check,status:'pass',evidence:'Synthetic observed pixels'})),corrections:[{id:'headline',fontSize:60}],protectedRegions:[],unresolvedOverlapIds:[]}}));
 const doc={brandId:brand,canvas:{width:800,height:400},objects:[{id:'photo',role:'photograph',assetId:'photo'}],assets:[{id:'photo',url:'/source.png'}],fonts:[]};
 const runtime={store:{dir:()=>dir,save:async(id,name,v)=>fs.writeFile(path.join(dir,name),Buffer.isBuffer(v)?v:JSON.stringify(v))},provider:{}};
 const out=await require('../../lib/creative-ai/runtime/component-repair-tools').build(runtime,'fixture',{k:'continuity-clean',record:{route:'continuity',placementId:'clean',exactCopy:{fields:[]}},planned:doc,dir,state:{document:doc}},['transport'],'repair',{});
 assert.equal(out.readiness.ready,false,'Proposed changes have not been applied or rechecked');
 assert.match(out.summary.correctionError,/unapplied|not applied/i);
 assert.equal(out.summary.proposedCorrections.length,1);
});
