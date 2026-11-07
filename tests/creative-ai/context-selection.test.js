'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{select}=require('../../lib/creative-ai/runtime/context-selection');
for(const brandId of ['brand-duroflex','brand-sleepyhead'])test('five reductions preserve mandatory evidence: '+brandId,()=>{
 const input={brandId,placements:[{id:'card'}],requiredSkuAssetIds:['sku-product-image-exact'],strategy:{selection:{directionId:'chosen'},alternatives:[{id:'chosen',text:'Approved direction'},{id:'unused',text:'Other direction'}]},guardian:{requirements:[{id:'mandatory',text:'Exact wording with Queen-only qualifier'}]},copy:[{placementId:'card',text:'Locked copy'},{placementId:'other',text:'Unrelated copy'}],assets:[{id:'sku-product-image-exact',kind:'product'},{id:'sku-product-image-other',kind:'product'},{id:'optional',optional:true,applicability:{stages:['strategy']}},{id:'mandatory-ref',mandatory:true,optional:true,applicability:{stages:['strategy']}},{id:'unknown'}],carouselPlan:{sets:[{slides:[{placementId:'other',purpose:'Opening establishes the sequence'}]}]}};
 const before=structuredClone(input),images=input.assets.map(a=>({id:a.id,imageData:'data:image/png;base64,YQ=='})),out=select('art',input,{images});
 assert.deepEqual(input,before);assert.equal(out.input.strategy.alternatives,undefined);assert.equal(out.input.strategy.selectedAlternative.id,'chosen');assert.equal(out.input.copy.length,1);
 assert.deepEqual(out.input.assets.map(a=>a.id),['sku-product-image-exact','mandatory-ref','unknown']);assert.deepEqual(out.images.map(a=>a.id),out.input.assets.map(a=>a.id));assert.deepEqual(out.input.guardian,input.guardian);assert.deepEqual(out.input.carouselPlan,input.carouselPlan);
});
test('correction scope drops unrelated decks and retains exact requested unit',()=>{
 const rows=[{placementId:'card',conceptId:'one',text:'Exact qualifier'},{placementId:'card',conceptId:'two',text:'Other'},{placementId:'other',conceptId:'one',text:'Other'}];
 const input={affectedUnit:{placementId:'card',conceptId:'one'},artInput:{copy:rows,placements:[{id:'card'},{id:'other'}],directorOutput:{concepts:[{conceptId:'one'},{conceptId:'two'}]}},correctionPlan:{reason:'Fix the cushion'},mandatory:['Retain logo'],unknowns:['Missing evidence']};
 const out=select('art',input).input;assert.deepEqual(out.artInput.copy,[rows[0]]);assert.equal(out.artInput.placements.length,1);assert.equal(out.artInput.directorOutput.concepts.length,1);assert.deepEqual(out.correctionPlan,input.correctionPlan);assert.deepEqual(out.unknowns,input.unknowns);
});
test('unknown scope, selected references and unselected strategy are not guessed',()=>{
 const input={strategy:{selection:{directionId:'missing'},alternatives:[{id:'a'}]},assets:[{id:'chosen',optional:true,applicability:{stages:['strategy']}},{id:'unknown',kind:'product'}]};
 const out=select('art',input,{selectedReferenceIds:['chosen']}).input;assert.deepEqual(out,input);
});
test('selected-reference loading skips unrelated missing raster blobs',async()=>{
 const fs=require('fs/promises'),os=require('os'),path=require('path'),apply=require('../../lib/creative-ai/runtime/selected-references').apply;
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'selected-context-')),dir=path.join(root,'jobs','creative-test'),brandId='brand-duroflex';
 try{await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'job.json'),JSON.stringify({intake:{brandId},artifacts:{}}));
 await fs.writeFile(path.join(dir,'research-product-evidence.json'),JSON.stringify({dossier:{assets:[{id:'chosen',imageData:'data:image/png;base64,YQ=='},{id:'unused',imageData:{$studioRaster:{version:1,brandId,sha256:'a'.repeat(64),prefix:'data:image/png;base64,',bytes:1}}}]}}));
 const request={contextKind:'art',images:[]},context={dir,scope:{brandId},selectedReferenceIds:['chosen']};assert.equal((await apply(request,context,{version:2})).images[0].id,'chosen');
 await assert.rejects(()=>apply(request,context,{version:0}),/ENOENT/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('v2 provider sends scoped input and preserves validator authority',async()=>{
 const {OpenAIProvider}=require('../../lib/creative-ai/runtime/provider'),old=global.fetch,bodies=[],receipts=[];
 global.fetch=async(url,opts)=>{bodies.push(JSON.parse(opts.body));return {ok:true,json:async()=>({id:'scoped-fixture',status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]})};};
 const input={requiredSkuAssetIds:['sku-product-image-exact'],assets:[{id:'sku-product-image-exact',kind:'product'},{id:'sku-product-image-other',kind:'product'}],affectedUnit:{placementId:'card',conceptId:'one'},existingDecks:[{placementId:'card',conceptId:'one',text:'locked qualifier'},{placementId:'unrelated',conceptId:'one',text:'other'}]},before=structuredClone(input);
 const p=new OpenAIProvider({reasoningModel:'gpt-6-luna',reasoningTimeoutMs:1000,maxOutputTokens:100,maxRecoveryOutputTokens:100,inputContextPreflight:false});
 try{await p.reason({contextKind:'art',input,instructions:'Test',images:input.assets.map(a=>({id:a.id,imageData:'data:image/png;base64,YQ=='})),schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false},validate:()=>assert.deepEqual(input,before)},{stageContext:async()=>({version:2,brandId:'brand-duroflex'}),reserve:async()=>{},receipt:async r=>receipts.push(r)});
 const content=bodies[0].input.flatMap(x=>x.content),wire=JSON.parse(content[0].text.replace('Return JSON matching this contract. ',''));assert.equal(wire.input.existingDecks.length,1);assert.equal(content.filter(c=>c.type==='input_image').length,1);assert.equal(receipts[0].optimisation.stageContext.selection.version,2);
 }finally{global.fetch=old;}
});

test('provider selects applicable references before enforcing the attachment cap',async()=>{
 const {OpenAIProvider}=require('../../lib/creative-ai/runtime/provider');let sent=0;
 const p=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:1000,maxOutputTokens:100,maxRecoveryOutputTokens:100,inputContextPreflight:false});
 p.sendReasoning=async body=>{sent++;assert.equal(body.input.flatMap(m=>m.content).filter(c=>c.type==='input_image').length,1);return {ok:true,json:async()=>({id:'resp_scoped_fixture',status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]})};};
 const assets=[{id:'sku',kind:'product'},...Array.from({length:9},(_,i)=>({id:'optional-'+i,optional:true,applicability:{stages:['strategy']}}))];
 const input={requiredSkuAssetIds:['sku'],assets},request={contextKind:'art',input,instructions:'Fixture',images:assets.map(a=>({id:a.id,imageData:'data:image/png;base64,YQ=='})),schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}};
 const budget={stageContext:async()=>({version:3,brandId:'fixture'}),reserve:async()=>{},receipt:async()=>{}};
 assert.deepEqual(await p.reason(request,budget),{ok:true});assert.equal(sent,1);
 await assert.rejects(p.reason({...request,images:[...request.images,{id:'optional-0',imageData:'conflicting'}]},budget),{code:'REFERENCE_ID_CONFLICT'});assert.equal(sent,1);
});
