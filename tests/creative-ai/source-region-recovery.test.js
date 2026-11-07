const test=require('node:test'),assert=require('node:assert/strict'),R=require('../../lib/creative-ai/runtime/source-region-recovery'),select=require('../../lib/creative-ai/runtime/saved-copy-layout').select;
for(const brandId of ['Duroflex','Sleepyhead'])test(brandId+': observed subject frees misplaced CTA only after localization',async()=>{
 const doc={brandId,canvas:{width:1000,height:2000},objects:[{fieldId:'cta',type:'text',left:80,top:540,width:400,height:100}],protectedRegions:[{id:'planned',kind:'product',left:80,top:720,width:840,height:900}]},fields=[{id:'cta',role:'cta',text:'Explore Kiki',delivery:'embedded'}],rows=[{text:'Explore Kiki',box:{x:.08,y:.374,width:.35,height:.03}}];
 assert.equal(select(rows,fields,doc).matches.length,0);
 const runtime={provider:{reason:async req=>{const out={complete:true,regions:[{id:'actual',kind:'product',left:50,top:1150,width:900,height:500,evidence:'Actual full sofa'}]};req.validate(out);return out;}},store:{save:async()=>{}}};
 const result=await R.recover(runtime,'id','k',Buffer.from('source'),doc,rows,fields,{});assert.equal(result.selected.matches[0].text,'Explore Kiki');assert.equal(doc.protectedRegions[0].top,720);
 runtime.provider.reason=async()=>({complete:true,regions:[{id:'actual',kind:'product',left:50,top:700,width:900,height:500,evidence:'CTA really overlaps product'}]});assert.equal(await R.recover(runtime,'id','k',Buffer.from('source'),doc,rows,fields,{}),null);
});
test('uncertain or invalid subject localization cannot authorize removal',()=>{assert.throws(()=>R.validate({complete:false,regions:[]},{width:100,height:100}));assert.throws(()=>R.validate({complete:true,regions:[{kind:'product',left:0,top:0,width:101,height:90,evidence:'outside'}]},{width:100,height:100}));});
for(const brandId of ['Duroflex','Sleepyhead'])test(brandId+': typography reflow requires actual boundaries even when original text matches',async()=>{
 const source=Buffer.from('source'),doc={brandId,canvas:{width:1200,height:627},objects:[{fieldId:'cta',type:'text',left:60,top:400,width:300,height:60}],protectedRegions:[{id:'planned',kind:'product',left:672,top:156,width:504,height:438}]},fields=[{id:'cta',role:'cta',text:'Explore Kiki',delivery:'embedded'}],rows=[{text:'Explore Kiki',box:{x:.05,y:.64,width:.25,height:.06}}];
 const actual={id:'actual',kind:'product',left:475,top:256,width:690,height:282,evidence:'Full visible sofa is wider than planned'};
 let calls=0;const runtime={provider:{reason:async()=>{calls++;return {complete:true,regions:[actual]};}},store:{save:async()=>{}}};
 assert.equal(select(rows,fields,doc).issues.length,0);
 const result=await R.selectWithRecovery(runtime,'id','k',source,doc,rows,fields,{}, {requireObserved:true});
 assert.equal(calls,1);assert.deepEqual(result.document.protectedRegions,[actual]);assert.equal(doc.protectedRegions[0].left,672);
 runtime.provider.reason=async()=>({complete:true,regions:[{...actual,left:50,width:1100}]});
 await assert.rejects(()=>R.selectWithRecovery(runtime,'id','k',source,doc,rows,fields,{}, {requireObserved:true}),/Actual source.*ambiguous/);
});
for(const brandId of ['Duroflex','Sleepyhead'])test(brandId+': shared selection records source identity and avoids paid localization for valid matches',async()=>{
 const source=Buffer.from('exact source'),doc={brandId,canvas:{width:1000,height:2000},objects:[{fieldId:'cta',type:'text',left:80,top:540,width:400,height:100}],protectedRegions:[{id:'planned',kind:'product',left:80,top:720,width:840,height:900}]},fields=[{id:'cta',role:'cta',text:'Explore Kiki',delivery:'embedded'}],rows=[{text:'Explore Kiki',box:{x:.08,y:.374,width:.35,height:.03}}];
 let calls=0,saved;const budget={identity:'original'},runtime={provider:{reason:async(req,b)=>{calls++;assert.equal(b,budget);assert.equal(req.images[0].imageData,'data:image/png;base64,'+source.toString('base64'));return {complete:true,regions:[{id:'observed',kind:'product',left:50,top:1150,width:900,height:500,evidence:'visible sofa'}]};}},store:{save:async(id,name,data)=>{saved=data;}}};
 const resolved=await R.selectWithRecovery(runtime,'id','k',source,doc,rows,fields,budget);assert.equal(resolved.selected.issues.length,0);assert.equal(saved.sourceSha256,require('crypto').createHash('sha256').update(source).digest('hex'));assert.equal(doc.protectedRegions[0].top,720);
 await R.selectWithRecovery(runtime,'id','k',source,resolved.document,rows,fields,budget);assert.equal(calls,1);
});
