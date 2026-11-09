'use strict';
// Technology visual v1 (user scope addition, 9 Nov 2026): "Technology visual should always have the
// technology mentioned for the SKU, preferably taking the image of the tech from the SKU's images."
// One shared engine rule for every format (lib/creative-ai/runtime/technology-visual.js). Offline only.
// Symptom before: a Technology brief for an Instagram post could be planned with a generic benefit and
// no technology picture; nothing attached the SKU's official technology artwork outside A+.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp'),crypto=require('node:crypto');
const M=require('../../public/creative-ai/studio-model'),flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy'),planning=require('../../lib/creative-ai/lean/planning');
const tv=require('../../lib/creative-ai/runtime/technology-visual'),{JobStore}=require('../../lib/creative-ai/runtime/store');
const brands=['Duroflex','Sleepyhead'];

function planFor(input,{generic=false}={}){
 const t=input.technologyVisual,font=input.brand.fonts[0].family;
 return {message:'Know what is inside',audience:'Shoppers',objective:'Education',insight:{text:'People want to know why',basis:'hypothesis'},desiredAction:'Explore',concept:'The technology inside',
  guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applies'})),
  pages:input.format.pages.map(p=>({id:p.id,purpose:'Technology visual',copy:[{role:'product name',text:input.product.name,factIds:[input.product.id]},generic||!t?.factIds?.length?{role:'headline',text:'Sleep better every night',factIds:[]}:{role:'technology',text:'5 Zone Orthopedic Support',factIds:[t.factIds[0]]}],artDirection:'Exact product, clear technology view',hierarchy:'Technology name first',palette:'Brand colours',typography:font+' Bold 700',spatial:Object.fromEntries(planning.spatialFields.map(k=>[k,'Clear regions'])),formatConstraints:['Flat artwork']})),omitted:[]};
}
async function fixture(t,{brand='Duroflex',messageType='Technology',techFacts=true,picture=true,pinned=true,pin=null,pageName='Instagram post'}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tech-visual-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase(),pageUrl='https://'+brand.toLowerCase()+'.test/products/exact';
 const bytes=await sharp({create:{width:1024,height:1024,channels:3,background:'#345678'}}).png().toBuffer(),data='data:image/png;base64,'+bytes.toString('base64');
 const techBytes=await sharp({create:{width:1200,height:400,channels:3,background:'#aa3322'}}).jpeg().toBuffer(),techHash=crypto.createHash('sha256').update(techBytes).digest('hex');
 const technologyImage=pin||{productId:'product-exact',brandId,url:'https://'+brand.toLowerCase()+'.test/tech.jpg',sha256:techHash,label:'Zone support layers',group:'a-plus-content'};
 const intake={brandId,brandUrl:'https://'+brand.toLowerCase()+'.test/',brief:'Explain the technology inside this mattress.',productName:brand+' Ortho Mattress',productPageUrl:pageUrl,productVariantId:'queen',originalArtworkVersion:1,leanWorkflowVersion:1,conceptRoutes:['continuity','exploration'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:'sku-photo',referenceAssetIds:['sku-photo'],variant:{id:'queen',sku:'EXACT-Q',name:'Queen'}},...(messageType?{messageType}:{}),...(picture?{technologyImage}:{})};
 const selection=[{id:'instagram-post',description:{name:pageName,formatId:'social-square',dimensions:{width:1080,height:1080}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}}];
 const base=policy.configure({maxConcurrentUnits:2,maxReasoningCalls:100,jobTimeoutMs:3600000},intake),config=pinned?base:(({technologyVisualVersion,...rest})=>rest)(base),job=await store.create(intake,config,selection);
 const facts=techFacts?[{id:'fact-tech',status:'supported',text:'5 Zone Orthopedic Support: targeted support layers',sourceIds:[]},{id:'fact-cover',status:'supported',text:'Washable cover',sourceIds:[]},{id:'fact-warranty',status:'supported',text:'15-Years Warranty on the foam core',sourceIds:[]}]:[{id:'fact-cover',status:'supported',text:'Washable cover that is easy to clean',sourceIds:[]}];
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{version:1,sources:[{id:'source-product-page',kind:'product',label:'Official product page',reference:pageUrl,status:'available'}],assets:[{id:'sku-photo',kind:'product',label:'Exact SKU photo',sourceIds:['source-product-page'],imageData:data},{id:'approved-logo',kind:'logo',label:'Approved logo',sourceIds:['source-product-page'],imageData:data}],findings:[]},productBriefEvidence:{productProfileId:'product-exact',assetIds:['sku-photo'],evidence:facts.map(f=>({factId:f.id}))},facts},guardian:{requirements:[{id:'identity',text:'Preserve exact product identity'}],preferences:[],visualRules:[]}};
 const calls=[];
 const library={read:async(b,id)=>({id,brandId:b,pageUrl:id==='product-exact'?pageUrl:'https://'+brand.toLowerCase()+'.test/products/other'}),savedImage:async()=>({bytes:techBytes})};
 const runtime={store,config,readCarouselPlan:async()=>null,brands:{products:library},provider:{reason:async request=>{calls.push({kind:request.contextKind,input:request.input,images:request.images});const out=request.contextKind==='lean-planning'?planFor(request.input):{checks:request.input.requirements.map(r=>({id:r.id,result:'no_mismatch',evidence:'Observed',location:'Whole image'}))};if(request.validate)request.validate(out);return out;},generate:async request=>{calls.push({kind:'image',...request});return {imageData:data};}}};
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});
 let records=[];try{const manifest=JSON.parse(await fs.readFile(path.join(store.dir(job.id),'image-queue.json')));records=await Promise.all(manifest.units.map(u=>fs.readFile(path.join(store.dir(job.id),u.file),'utf8').then(JSON.parse)));}catch{}
 return {store,job,records,calls,runtime};
}

for(const brand of brands)test(brand+': an Instagram post with message type Technology names the SKU technology and attaches its official picture',async t=>{
 const f=await fixture(t,{brand}),r=f.records[0];
 assert.equal(r.input.technologyVisual.status,'available');assert.deepEqual(r.input.technologyVisual.factIds,['fact-tech'],'warranty is never technology');
 assert.ok(r.plan.pages[0].copy.some(c=>c.text==='5 Zone Orthopedic Support'&&c.factIds.includes('fact-tech')));
 assert.ok(r.attachments.some(a=>a.roles.includes('technology')),'official technology picture attached');assert.match(r.prompt,/official technology picture/);
 assert.ok(f.calls.find(c=>c.kind==='lean-planning').images.some(i=>i.id==='technology-image'),'the planner sees it too');
 assert.ok(!r.prompt.includes('TECHNOLOGY VISUAL v1'),'planning rule stays out of the image prompt');
 assert.throws(()=>planning.validatePlan(planFor(r.input,{generic:true}),r.input),/not a generic benefit/);
 const j=await f.store.read(f.job.id);assert.equal(j.technologyVisual.status,'available');assert.deepEqual(j.technologyVisual.pages,['instagram-post']);
});

for(const brand of brands)test(brand+': technology fallbacks are noted: no fact uses the strongest benefit; a fact without a picture uses the fact text only',async t=>{
 const none=await fixture(t,{brand,techFacts:false}),r=none.records[0];
 assert.equal(r.input.technologyVisual.status,'missing');assert.ok(!r.attachments.some(a=>a.roles.includes('technology')));assert.match(r.input.format.guidance.mandatory.find(x=>x.id==='technology-visual-v1').text,/strongest supported benefit/);
 assert.match((await none.store.read(none.job.id)).technologyVisual.notes.join(' '),/no technology fact/);assert.match(M.resultNotes(await none.store.read(none.job.id)).join(' '),/strongest supported benefit/);
 const factsOnly=await fixture(t,{brand,picture:false}),q=factsOnly.records[0];
 assert.equal(q.input.technologyVisual.status,'facts-only');assert.ok(!q.attachments.some(a=>a.roles.includes('technology')));assert.match(q.prompt,/Do not draw layers, cutaways or diagrams/);
 assert.match((await factsOnly.store.read(factsOnly.job.id)).technologyVisual.notes.join(' '),/no official technology picture/);
});

for(const brand of brands)test(brand+': another brand\'s or another SKU\'s technology picture is rejected; nothing is attached',async t=>{
 const other=brand==='Duroflex'?'brand-sleepyhead':'brand-duroflex';
 const foreign=await fixture(t,{brand,pin:{productId:'product-exact',brandId:other,url:'https://x.test/a.jpg',sha256:'0'.repeat(64),label:'x'}});
 assert.equal(foreign.records[0].input.technologyVisual.status,'facts-only');assert.ok(!foreign.records[0].attachments.some(a=>a.roles.includes('technology')));
 assert.match((await foreign.store.read(foreign.job.id)).technologyVisual.pictureError,/another brand/);
 const sku=await fixture(t,{brand,pin:{productId:'product-other',brandId:'brand-'+brand.toLowerCase(),url:'https://x.test/a.jpg',sha256:'0'.repeat(64),label:'x'}});
 assert.match((await sku.store.read(sku.job.id)).technologyVisual.pictureError,/another product or brand/);
 const changed=await fixture(t,{brand,pin:{productId:'product-exact',brandId:'brand-'+brand.toLowerCase(),url:'https://x.test/a.jpg',sha256:'0'.repeat(64),label:'x'}});
 assert.match((await changed.store.read(changed.job.id)).technologyVisual.pictureError,/changed/);
});

for(const brand of brands)test(brand+': non-technology briefs and historical jobs are unchanged',async t=>{
 const benefit=await fixture(t,{brand,messageType:'Benefit'});assert.equal(benefit.records[0].input.technologyVisual,undefined);assert.ok(!benefit.records[0].attachments.some(a=>a.roles.includes('technology')));assert.equal((await benefit.store.read(benefit.job.id)).technologyVisual,undefined);
 const explainer=await fixture(t,{brand,messageType:'Benefit',pageName:'Technology explainer card'});assert.equal(explainer.records[0].input.technologyVisual.status,'available','a feature-explainer page follows the rule without the message type');
 const old=await fixture(t,{brand,pinned:false});assert.equal(old.records[0].input.technologyVisual,undefined);assert.ok(!old.records[0].attachments.some(a=>a.roles.includes('technology')));
 assert.equal(policy.configure({},{leanWorkflowVersion:1}).technologyVisualVersion,1);assert.equal(policy.configure({},{}).technologyVisualVersion,undefined);
});

for(const brand of brands)test(brand+': the brief form and brief reader suggest the SKU technology when the message type is Technology',()=>{
 const brandId='brand-'+brand.toLowerCase(),product={id:'product-aaaaaaaaaaaaaaaaaaaa',brandId,name:brand+' Ortho',category:'Mattress',variants:[{id:'1',name:'Queen 72 x 60'}],features:['5 Zone Orthopedic Support: targeted support','15-Years Warranty','Doctor Recommended']};
 assert.deepEqual(M.technologyFeatures(product),['5 Zone Orthopedic Support: targeted support']);
 const d=M.startDraft(brandId,'quick',1);M.selectBriefProduct(d,product,'1');assert.equal(d.selectedRtbs.length,3,'other message types keep every feature');
 M.applyMessageType(d,'Technology');M.applyTechnologyDefault(d,product);assert.deepEqual(d.selectedRtbs,['5 Zone Orthopedic Support: targeted support']);
 assert.equal(M.applyTechnologyDefault({...d,productId:'x'},product).selectedRtbs.length,1,'a different product is ignored');
 const foreign={...product,brandId:'brand-other'},e=M.startDraft(brandId,'quick',1);e.productId=product.id;e.messageType='Technology';M.applyTechnologyDefault(e,foreign);assert.equal(e.technologyDefault,undefined,'another brand\'s product is never used');
 const reader=require('../../lib/creative-ai/runtime/brief-reader'),base={ask:'Explain the technology',product:{productId:product.id,candidateIds:[],variantId:'1',briefName:'',evidence:''},assets:[{cardId:'instagram-post',source:'brief',reason:'Post'}],messageType:{value:'Technology',source:'brief'},objective:{value:'Education',source:'suggested',reason:'x'},language:{value:'English',source:'suggested'},audience:{value:'',source:'none'},tone:{value:'',source:'none'},keyMessage:{value:'',source:'none'},features:[],offer:{wording:'',terms:'',startDate:'',endDate:''},exactWording:[],occasion:{value:'',source:'none'},cta:{value:'',source:'none'},contactDetails:false,logoRequested:false,otherBrandMentioned:'',assumptions:[],questions:[]};
 const r=reader.finish(base,{products:[product]});assert.deepEqual(r.features,['5 Zone Orthopedic Support: targeted support']);assert.match(r.assumptions.join(' '),/Technology taken from the product page/);
 assert.deepEqual(reader.finish({...base,messageType:{value:'Benefit',source:'brief'}},{products:[product]}).features,[]);
});
