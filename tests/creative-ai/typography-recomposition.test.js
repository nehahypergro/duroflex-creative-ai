'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const repairs=require('../../lib/creative-ai/runtime/component-repair');
const type=require('../../lib/creative-ai/runtime/typography-repair');
const blocked='Typography repair has no clear space at readable size. A different composition is required; no image request was dispatched.';
test('a diagnosed spatial failure can continue its unused image allowance, without another correction cycle',()=>{
 const entry={status:'needs-attention',actions:['typography'],error:blocked,imageCalls:0,maxImageCalls:1,calls:1,maxCalls:5,reservedUsd:2,maximumUsd:11,requestKeys:[{kind:'reasoning',key:'localization'}],candidateAvailable:false};
 assert.equal(repairs.canResumeComposition(entry),true);
 for(const change of [{imageCalls:1},{calls:4},{candidateAvailable:true},{recompositionVersion:1},{error:'Missing approved font'},{requestKeys:[{kind:'image',key:'pending'}]}])assert.equal(repairs.canResumeComposition({...entry,...change}),false);
});
for(const brandId of ['Duroflex','Sleepyhead'])test(brandId+': spatial fallback generates only the revised scene then verifies exact editable copy',async t=>{
 const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'recomposition-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const photo=await sharp({create:{width:1200,height:627,channels:3,background:'#eeeeee'}}).png().toBuffer();
 await fs.writeFile(path.join(dir,'composed-source-unit.png'),photo);
 const planned={brandId,canvas:{width:1200,height:627},safeMargin:0,compositionPolicy:{version:1,productRequired:true,reading:{width:320,headlineCssPx:24}},protectedRegions:[{id:'sku',kind:'product',left:200,top:330,width:800,height:270}],assets:[{id:'photo',kind:'photograph'}],fonts:[],objects:[{id:'photo',assetId:'photo',role:'photograph',type:'image',left:0,top:0,width:1200,height:627},{id:'headline',fieldId:'h',role:'headline',type:'text',text:'Exact approved copy',fontId:'approved',fontSize:90,left:36,top:44,width:1100,height:107}]};
 const original=structuredClone(planned),saved={},calls=[];
 const record={assignmentId:'id',route:'continuity',placementId:'post',conceptId:'one',productReference:{policyVersion:2},artDirection:{scene:'The selected scene',composition:'Keep the product below copy',product:{assetIds:['sku']},logo:{assetIds:['brand-logo']}},exactCopy:{fields:[{id:'h',delivery:'embedded',text:'Exact approved copy'}]},attachmentManifest:[{assetId:'sku',roles:['product'],imageData:'data:image/png;base64,'+photo.toString('base64')},{assetId:'brand-logo',roles:['logo'],imageData:'not-for-generation'}]};
 const editable=require('../../lib/creative-ai/runtime/editable'),quality=require('../../lib/creative-ai/runtime/editable-quality');
 t.mock.method(require('../../lib/creative-ai/runtime/editable-composition'),'documentFor',()=>structuredClone(planned));
 t.mock.method(require('../../lib/creative-ai/runtime/review'),'ocr',async()=>({status:'measured',rows:[]}));
 t.mock.method(require('../../lib/creative-ai/runtime/source-region-recovery'),'selectWithRecovery',async(r,id,k,source,doc)=>({document:{...doc,protectedRegions:[{id:'observed',kind:'product',left:0,top:0,width:1200,height:627}]},selected:{issues:[],matches:[{fieldId:'h'}]}}));
 t.mock.method(editable,'render',async(r,id,doc)=>({data:'data:image/png;base64,'+photo.toString('base64'),issues:[],measurements:doc.objects.map(o=>({...o,textHeight:102}))}));
 t.mock.method(quality,'geometry',()=>[]);t.mock.method(quality,'compositionChecks',()=>({issues:[]}));
 t.mock.method(quality,'reviewOnce',async(r,id,k,doc)=>{calls.push('review');assert.equal(doc.objects.find(o=>o.fieldId==='h').fontSize,90);assert.equal(doc.compositionPolicy.reviewChecksVersion,2);return {status:'complete',review:{observations:[],corrections:[]}};});
 t.mock.method(require('../../lib/creative-ai/runtime/editable-readiness'),'assess',()=>({ready:true}));
 const runtime={store:{dir:()=>dir,save:async(id,name,value)=>{saved[name]=value;}},provider:{generate:async request=>{calls.push('image');assert.equal(request.mask,undefined);assert.deepEqual(request.attachments.map(a=>a.assetId),['sku']);assert.match(request.prompt,/Generate ONLY the visual layer/);assert.match(request.prompt,/TARGETED COMPOSITION CORRECTION/);return {imageData:'data:image/png;base64,'+photo.toString('base64')};}}};
 const result=await require('../../lib/creative-ai/runtime/component-repair-tools').build(runtime,'id',{k:'unit',record,planned,dir,layout:{},job:{intake:{composedQualityVersion:14,canvasAssets:{}}}},['typography'],'key',{recomposing:async()=>calls.push('fallback')});
 assert.deepEqual(calls,['fallback','image','review']);assert.equal(result.readiness.ready,true);assert.deepEqual(planned,original);assert.deepEqual(await fs.readFile(path.join(dir,'composed-source-unit.png')),photo);
 assert.equal(result.summary.requiresManualReview,false);
 assert.equal(saved['candidate-review.json'].status,'complete','evidence status must not be overwritten by delivery readiness');
 assert.equal(saved['typography-recomposition-plan.json'].document.objects.find(o=>o.fieldId==='h').text,'Exact approved copy');
});
for(const brandId of ['Duroflex','Sleepyhead'])test(brandId+': observed product conflict returns a typed recomposition request instead of treating it as a spent image repair',async()=>{
 const doc={brandId,canvas:{width:1200,height:627},safeMargin:0,objects:[{id:'headline',fieldId:'h',role:'headline',type:'text',text:'Required words',fontId:'approved',fontSize:90,left:36,top:44,width:1128,height:107}],protectedRegions:[{left:0,top:0,width:1200,height:627}]};
 await assert.rejects(type.reflow(doc,async()=>({measurements:[{id:'headline',width:1128,textHeight:102}]})),e=>e.code==='TYPOGRAPHY_COMPOSITION_REQUIRED');
});
test('recomposition jointly resolves logo and copy space before dispatch, preserving the original plan',async t=>{
 const editable=require('../../lib/creative-ai/runtime/editable'),quality=require('../../lib/creative-ai/runtime/editable-quality');
 const planned={canvas:{width:1200,height:627},safeMargin:0,compositionPolicy:{productRequired:true},assets:[],objects:[{id:'logo',role:'logo',left:948,top:40,width:204,height:38},{id:'h',fieldId:'h',role:'headline',type:'text',text:'Exact copy',fontSize:90,left:36,top:44,width:1128,height:103},{id:'b',fieldId:'b',role:'body',type:'text',text:'Exact supporting copy',fontSize:60,left:36,top:162,width:1128,height:69},{id:'c',fieldId:'c',role:'cta',type:'text',text:'Explore',fontSize:60,left:36,top:246,width:600,height:69}],protectedRegions:[{kind:'product',left:144,top:339,width:912,height:276}]};
 const original=structuredClone(planned),record={productReference:{policyVersion:2},attachmentManifest:[{assetId:'sku',roles:['product']}],exactCopy:{fields:planned.objects.filter(o=>o.fieldId).map(o=>({id:o.fieldId,text:o.text,delivery:'embedded'}))}};
 t.mock.method(editable,'render',async(r,id,doc)=>({measurements:doc.objects.map(o=>({...o,textHeight:(o.role==='headline'?102:68)*Math.ceil(planned.objects.find(p=>p.id===o.id).width/o.width)}))}));
 t.mock.method(editable,'photoPrompt',()=> 'Clean scene');t.mock.method(quality,'geometry',()=>[]);
 const result=await require('../../lib/creative-ai/runtime/typography-recomposition').prepare({},'id',record,planned);
 assert.equal(result.reflow.layoutAttempts,2);assert.equal(result.document.objects[0].top,0);
 assert.deepEqual(planned,original);assert.deepEqual(result.document.protectedRegions,original.protectedRegions);
 assert.deepEqual(result.document.objects.filter(o=>o.fieldId).map(o=>o.text),['Exact copy','Exact supporting copy','Explore']);
});
