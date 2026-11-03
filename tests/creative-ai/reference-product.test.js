'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path'),sharp=require('sharp');
const product=require('../../lib/creative-ai/runtime/reference-product'),graphic=require('../../lib/creative-ai/graphic-designer'),art=require('../../lib/creative-ai/art-director'),{hash}=require('../../lib/creative-ai/runtime/product-identity');
async function fixture(){
 const source=await sharp({create:{width:120,height:100,channels:3,background:'#ae1234'}}).png().toBuffer();
 const identity={id:'identity-test',brandId:'brand-test',productId:'product-test',productName:'Exact Test Sofa',assetId:'sku-reference-test',reference:{rasterHash:hash(source),angle:'Original front view'},variant:{id:'v1',sku:'SOFA-1',dimensions:{status:'unknown'}},imageData:'data:image/png;base64,'+source.toString('base64')};
 const input=await require('../../lib/creative-ai/graphic-designer/examples/synthetic').inputExample();
 input.artInput.assets.push({id:identity.assetId,label:'Exact synthetic SKU source',sourceIds:['sample'],ownership:'brand-supplied',brandName:'Sample Brand',provenance:'Synthetic test only',synthetic:true,locator:{kind:'embedded',value:identity.imageData}});
 const ctx=await art.assembleContext(input.artInput),core=require('../../lib/creative-ai/art-director/examples/synthetic').coreExample(ctx);
 for(const s of core.specifications){s.product.assetIds=[identity.assetId];s.references.push({assetId:identity.assetId,roles:['product'],instruction:'Use this exact SKU as a visual reference; angle may change.'});}
 input.artOutput=art.finalizeOutput(core,ctx);const policy=product.contract(identity);
 for(const job of input.jobs){job.productReference=policy;job.productAssetRequired=true;}
 const context=await graphic.assembleContext(input),output=graphic.buildGenerationPackages(context);return {identity,policy,input,context,output};
}
test('reference-led packages retain source attachments, permit new angles and contain no compositing contract',async()=>{
 const f=await fixture();assert.equal(graphic.validateOutput(f.output,f.context).valid,true);
 for(const r of f.output.records){assert.equal(r.productionMode,'whole-static-image-with-embedded-text');assert.equal(r.protectedProduct,undefined);assert.ok(r.attachmentManifest.some(a=>a.roles.includes('product')&&a.assetId===f.identity.assetId));assert.match(r.prompt,/Angle, perspective, lighting, framing and scene may change/);assert.doesNotMatch(r.prompt,/PROTECTED SKU COMPOSITION CONTRACT|Reserve the right half/);}
 f.output.records[0].productReference.sku='another';assert.equal(graphic.validateOutput(f.output,f.context).valid,false);
});
test('dedicated renderer sends exact SKU bytes to provider and exports complete generated image without pasting the photo',async t=>{
 const f=await fixture(),root=await fs.mkdtemp(path.join(os.tmpdir(),'reference-sku-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),runtime=Object.create(CreativeRuntime.prototype);let calls=0;
 runtime.productProtectionRequired=true;runtime.store={dir:()=>root,read:async()=>({intake:{productPageUrl:'https://www.duroflexworld.com/products/test',productHandlingMode:'reference-led',productProtection:f.identity},productReferencePolicy:f.policy}),save:async(_,name,v)=>fs.writeFile(path.join(root,name),Buffer.isBuffer(v)?v:JSON.stringify(v))};runtime.activity={project:async()=>({tasks:{}})};runtime.beginTask=runtime.finishTask=runtime.log=async()=>{};runtime.artifact=async(_,name)=>name;
 runtime.provider={generate:async req=>{calls++;assert.ok(req.attachments.some(a=>a.assetId===f.identity.assetId&&a.imageData===f.identity.imageData));return {imageData:'data:image/png;base64,'+(await sharp({create:{width:400,height:500,channels:3,background:'#168c4d'}}).png().toBuffer()).toString('base64')};}};
 const r=f.output.records[0],scope={route:r.route,placementId:r.placementId};const generated=await runtime.generateImage('test',r,{},scope,0),proof=JSON.parse(await fs.readFile(path.join(root,'export-proof-'+scope.route+'-'+scope.placementId+'-0.json')));assert.notEqual(proof.operation,'scene-with-protected-product-layer');assert.equal(proof.protectedPixelVerification,undefined);
 const stats=await sharp(Buffer.from(generated.imageData.split(',')[1],'base64')).stats();assert.ok(stats.channels.every(c=>c.min===c.max));assert.equal(stats.channels[0].min,22);assert.equal(calls,1);
 const bad=structuredClone(r);bad.productReference.brandId='foreign';await assert.rejects(runtime.generateImage('test',bad,{},scope,1),/saved identity and policy/);const missing=structuredClone(r);missing.attachmentManifest=missing.attachmentManifest.filter(a=>a.assetId!==f.identity.assetId);await assert.rejects(runtime.generateImage('test',missing,{},scope,1),/missing or changed/);assert.equal(calls,1);
 const jpeg={...r,outputFormat:'jpeg'},jpg=await runtime.generateImage('test',jpeg,{},scope,1);assert.match(jpg.imageData,/^data:image\/jpeg/);assert.equal(calls,2);
});
function observation(criterion,status='pass'){return {criterion,status,confidence:0.95,evidence:{method:'vision-attestation',observation:'Compared actual product to source: '+criterion,expected:'Exact SKU reference policy',location:'product and complete scene',sourceIds:['review-policy'],ruleIds:[]},applicabilityReason:'Exact product shown',tolerance:'Semantic; angle and lighting may change',correction:status==='fail'?'Remove the observed defect and preserve unaffected product features.':'None required'};}
function evidence(){return {critical:['product-identity','supported-claims'].map(criterion=>({...observation(criterion),criterion})),findings:[]};}
test('branding, technology, major SKU mismatches and duplicate scene products override aggregate pass and route correction',()=>{
 const record={productReference:{sku:'SOFA-1'}};
 for(const failed of ['product-branding','product-technology','sku-recognisability','scene-integrity']){
  const e=evidence(),obs=['product-branding','product-technology','sku-recognisability','scene-integrity'].map(c=>observation(c,c===failed?'fail':'pass'));product.applyChecks(record,e,obs);
  assert.equal(e.critical.find(c=>c.criterion===(failed==='product-technology'?'supported-claims':'product-identity')).status,'fail');assert.equal(e.findings.length,1);
  const routed=require('../../lib/creative-ai/creative-reviewer/routing').routeFinding(e.findings[0]);assert.equal(routed.status,'targeted-correction');assert.equal(routed.owner,'graphic-designer');assert.match(routed.correction,/observed defect/);
 }
});
test('allowed scene/angle differences pass; missing and uncertain checks never pass; no depicted technology may be not applicable',()=>{
 const record={productReference:{sku:'SOFA-1'}},obs=['product-branding','product-technology','sku-recognisability','scene-integrity'].map(c=>observation(c));obs[1].status='not-applicable';const e=evidence();product.applyChecks(record,e,obs);assert.ok(e.critical.every(c=>c.status==='pass'));assert.equal(e.findings.length,0);
 assert.throws(()=>product.applyChecks(record,e,obs.slice(1)),/four SKU checks/);const uncertain=structuredClone(obs);uncertain[0].confidence=0.3;const u=evidence();product.applyChecks(record,u,uncertain);assert.equal(u.critical[0].status,'unknown');
 const bad=structuredClone(obs);bad[2].status='not-applicable';assert.throws(()=>product.applyChecks(record,evidence(),bad),/Only undepicted technology or absent physical branding/);
});
test('SKU facts in reference policy are bound to exact product evidence rather than unrelated research facts',()=>{
 const id={id:'i',brandId:'b',productId:'p',productName:'Exact',assetId:'source',reference:{rasterHash:'hash'},variant:{id:'v',sku:'SKU',dimensions:{status:'specified',length:152,width:77,height:80,unit:'cm',source:'official exact SKU'}}};const p=product.contract(id,{facts:[{id:'other-product',status:'supported'}],productBriefEvidence:{assetIds:['exact-photo'],evidence:[{factId:'exact-fact'}]}});assert.deepEqual(p.evidenceFactIds,['exact-fact']);assert.deepEqual(p.referenceAssetIds,['source','exact-photo']);assert.match(p.dimensionReference,/152/);
});
test('stubbed production review requests all SKU observations and a missed duplicate overrides aggregate ready evidence',async t=>{
 const f=await fixture(),record=structuredClone(f.output.records[0]),reviewer=require('../../lib/creative-ai/creative-reviewer');
 record.assignmentDemo=false;record.upstreamContext.strategyInput.research.demo=false;record.upstreamContext.strategyInput.research.findings=record.upstreamContext.strategyInput.research.findings.filter(f=>f.basis!=='sample');
 record.conceptHash=require('../../lib/creative-ai/creative-director').conceptFingerprint({assignmentId:record.assignmentId,strategy:record.upstreamContext.strategy,strategyInput:record.upstreamContext.strategyInput},record.upstreamContext.concept);
 const {packageHash,...body}=record;record.packageHash=art.fingerprint(body);
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'reference-review-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.writeFile(path.join(dir,'placement-catalog.json'),JSON.stringify(require('../../lib/creative-ai/placement-knowledge').loadCatalog()));
 let calls=0;const provider={reason:async req=>{
  calls++;assert.ok(req.schema.required.includes('productObservations'));assert.equal(req.images[2].id,record.productReference.sourceAssetId);
  const critical=reviewer.policy.criticalCriteria.map(c=>{const o=observation(c);delete o.correction;if(c==='mandatory-brand-rules')o.evidence.ruleIds=record.lockedRules.map(r=>r.id);return o;});
  const e={lockedRuleObservations:require('./locked-rule-fixture.cjs')(record),mode:'runtime-attestation',packageHash:record.packageHash,artifactHash:req.input.artifactHash,critical,quality:Object.keys(reviewer.policy.weights).map(criterion=>({criterion,score:95,confidence:0.95,evidence:observation(criterion).evidence})),findings:[],copyObservations:require('../../lib/creative-ai/runtime/copy-checks').requiredFields(record).map(f=>({fieldId:f.id,observedText:f.text,decoration:'none',confidence:0.95,observation:'Stub visual transcription only'})),productObservations:['product-branding','product-technology','sku-recognisability','scene-integrity'].map(c=>({...observation(c,c==='scene-integrity'?'fail':'pass'),comparison:{assessment:c==='scene-integrity'?'mismatch':'match',sourceAssetIds:[record.productReference.sourceAssetId],referenceObservation:'One selected product in the source',outputObservation:c==='scene-integrity'?'An extra duplicate product is visibly present':'The visible region matches the source',limitation:''}}))};
  const errors=require('../../lib/creative-ai/marketing-strategist/schema-validator').check(req.schema,e);assert.deepEqual(errors,[]);await req.validate(e);return e;
 }};
 const pixels=await sharp({create:{width:record.canvas.width,height:record.canvas.height,channels:3,background:'white'}}).png().toBuffer();
 const out=await require('../../lib/creative-ai/runtime/review').review(record,'data:image/png;base64,'+pixels.toString('base64'),{provider,budget:{},dir,attempt:'stub'});
 assert.equal(calls,1);assert.equal(out.productObservations.length,4);assert.equal(out.report.decision,'revise');assert.equal(out.report.criticalChecks.find(c=>c.criterion==='product-identity').status,'fail');assert.ok(out.report.routing.some(r=>r.owner==='graphic-designer'));
});

test('long product identity fits dossier display label without mutating the identity',()=>{
 const identity={productName:'Original - 3 Layered BodyIQ Orthopedic Memory Foam Mattress - Grey',variant:{name:'Queen / 78 X 60 (198 cm x 152 cm) / 6 (15.2cm)'},reference:{angle:'Website photograph as supplied; camera view not independently classified'}};
 const before=structuredClone(identity),label=require('../../lib/creative-ai/runtime/reference-product').assetLabel(identity);
 assert.ok(label.length<=180);assert.match(label,/Queen/);assert.deepEqual(identity,before);
 identity.productName='Long title '.repeat(20);assert.equal(require('../../lib/creative-ai/runtime/reference-product').assetLabel(identity).length,180);
});
test('mandatory identity attachment is bound by code even when art selects only an approved gallery view',async()=>{
 const f=await fixture(),ctx=f.context,source=ctx.artContext.references.find(a=>a.assetId===f.identity.assetId);
 ctx.artContext.references.push({...source,assetId:'gallery-view'});
 for(const s of ctx.input.artOutput.specifications){s.product.assetIds=['gallery-view'];s.references=s.references.filter(r=>r.assetId!==f.identity.assetId);s.references.push({assetId:'gallery-view',roles:['product'],instruction:'Selected alternate view'});}
 for(const j of ctx.input.jobs)j.productReference.referenceAssetIds.push('gallery-view');
 const before=art.fingerprint(ctx.input.artOutput),records=graphic.buildGenerationPackages(ctx).records;
 assert.ok(records.every(r=>r.status==='request-ready'));assert.ok(records.every(r=>r.attachmentManifest.filter(a=>a.assetId===f.identity.assetId&&a.roles.includes('product')).length===1));assert.equal(art.fingerprint(ctx.input.artOutput),before,'mechanical identity attachment must not rewrite saved art decisions');
 source.sha256='incorrect';assert.ok(graphic.buildGenerationPackages(ctx).records.every(r=>r.status==='blocked'));
});
