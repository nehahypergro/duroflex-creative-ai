'use strict';
// Regressions from the 19 Nov 2026 live recheck (docs/qa-live-20261119.md), all failing before the fix:
// 1. The Duroflex PMax set was named "Memory Foam · Campaign": its three sizes (landscape, square, portrait) have
//    different names, so they were read as three formats. The Projects list showed "PMax landscape image + 2 formats",
//    "RCS card 1 + 2 formats" and "Basic A+ page · Header image + 5 formats" for one format each.
// 2. A failed project said "Use Retry to try again" next to a button called "Review recovery options".
// 3. The A+ page still said "Left out for now: … (a later option)" (Neha, 18 Nov 2026: nothing says "coming soon").
// 4. The product-page pack's spend check described "the full 12-image PDP pair" and reserved 24 images, although new
//    jobs make one design per format; the lean brief told the planner "Produce two model-rendered options".
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../../public/creative-ai/studio-model.js');
const brands=[['Duroflex','brand-1923d633-e03e-44cc-84b2-bbfb5c152710','Memory Foam Topper','Memory Foam'],['Sleepyhead','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','Original - 3 Layered BodyIQ Orthopedic Memory Foam Mattress - Grey','Original']];
// Slot names and set tags exactly as the hosted Studio returned them for saved jobs on 19 Nov 2026.
const pmax=['landscape','square','portrait'].map((slot,i)=>({id:'custom_studio-pmax-'+slot,name:'PMax '+slot+' image',assetSet:{id:'pmax-images',name:'PMax image set',slot,index:i+1,count:3}}));
const rcs=[1,2,3].map(n=>({id:'custom_rcs-image-carousel-medium-medium-0'+n,name:'RCS card '+n}));
const basic=['Header image','Overlay image','Three images · 1','Three images · 2','Three images · 3','Highlights image'].map((name,i)=>({id:'custom_recipe-marketplace-module-amazon-aplus-basic-0'+(i+1),name:'Basic A+ page · '+name}));
const story=['Background · desktop','Background · mobile','Story card 1','Story card 2','Story card 3'].map((name,i)=>({id:'custom_recipe-marketplace-module-amazon-aplus-brand-story-0'+(i+1),name:'Brand Story · '+name}));
const at='2026-11-19T10:22:54.294Z';

for(const [brand,brandId,product,short] of brands)test(brand+': a set of sizes or numbered slots names one format',()=>{
 const p=placements=>({brandId,productSummary:{name:product},placements,createdAt:at});
 assert.equal(M.projectTitle(p(pmax),{automatic:true}),short+' · PMax image set · 19 Nov');
 assert.equal(M.projectFormatLabel(p(pmax)),'PMax image set');
 assert.equal(M.projectFormatLabel(p(rcs)),'RCS card');
 assert.equal(M.projectFormatLabel(p(basic)),'Basic A+ page');
 assert.equal(M.projectFormatLabel(p(story)),'Brand Story');
 assert.equal(M.projectFormatLabel(p([...pmax,{id:'web-push',name:'Web Push'}])),'PMax image set + 1 format','different formats are still counted');
 assert.equal(M.projectFormatLabel(p([{name:'Story · vertical'},{name:'WhatsApp status'},{name:'Web Push'}])),'Story + 2 formats');
 assert.equal(M.projectFormatLabel({...p([]),outputs:[{featureId:6}]}),M.features.find(f=>f.id===6).name,'drafts keep their chosen card');
});

test('a failed project never points to a Retry button it does not have, both brands',()=>{
 const context={window:{},TextEncoder};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../public/creative-ai/canvas-model.js'),'utf8'),context);
 for(const [brand] of brands){const text=context.window.CreativeCanvasModel.clientError({message:brand+' Agent output failed validated contract after one schema repair',status:502},'generation');
  assert.equal(text,'We couldn’t use part of the generated response. Your brief is saved. You can try again.');assert.doesNotMatch(text,/Use Retry/);}
});

for(const [brand,brandId] of brands)test(brand+': the A+ page never says a part is left out for later',()=>{
 for(const type of ['premium','basic','brand-story'])assert.doesNotMatch(M.aplusModuleRows(type).join('\n'),/left out|later option/i,type);
 const saved={aplus:{notes:['This product\'s official page has no technology evidence, so the technology panel was replaced with a supported-benefit panel.','Left out for now: Comparison chart: it needs other products from the same brand, so it is left out for now (a later option).']}};
 assert.deepEqual(M.aplusNotes(saved),[saved.aplus.notes[0]],'saved notes stay saved; the page just does not show the left-out line');
 assert.equal(saved.aplus.notes.length,2,'the saved record is unchanged');
 const deck=require('../../lib/creative-ai/runtime/aplus').deckFromRecord({id:'creative-x',intake:{brandId},selection:[],aplus:saved.aplus},{plan:{pages:[]},input:{aplus:{type:'basic',name:'Basic',tier:'basic',imageCount:6,pages:[],modules:[]}}});
 assert.ok(!deck.notes.some(n=>/left out|later option/i.test(n)),'the copy deck leaves it out too');
});

test('the product-page pack reserves and describes 12 images for one-design jobs; two-option jobs keep 24',()=>{
 const pdp=require('../../lib/creative-ai/runtime/pdp'),formats=require('../../lib/creative-ai/runtime/output-formats');
 const config={maxReasoningCalls:40,estimatedSpend:{maxUsd:100,imageUsd:3,reasoningUsd:2}};
 assert.throws(()=>pdp.admission(config,{options:1}),e=>e.code==='PDP_BUDGET_REQUIRED'&&e.minimumReservation.images===12&&/12-image product-page pack/.test(e.message)&&!/pair/i.test(e.message));
 assert.throws(()=>pdp.admission(config),e=>e.minimumReservation.images===24,'jobs without the option count keep the old conservative reservation');
 const enough={...config,estimatedSpend:{...config.estimatedSpend,maxUsd:12*3+76*2}};
 assert.equal(pdp.admission(enough,{options:1}).maxReasoningCalls,160);
 assert.equal(formats.admission(enough,{placementIds:['custom:studio-pdp-pack'],leanWorkflowVersion:1}).maxReasoningCalls,160,'a new one-design job fits a 12-image allowance');
 assert.throws(()=>formats.admission(enough,{placementIds:['custom:studio-pdp-pack']}),e=>e.minimumReservation.images===24,'earlier two-option jobs keep 24');
});

for(const [brand,brandId] of brands)test(brand+': a new job\'s brief asks for one design, not two model-rendered options',()=>{
 const input=require('../../lib/creative-ai/runtime/campaign-input');
 for(const ending of [' Produce two model-rendered options of the complete ordered asset set. Each option must include every listed item in order.',' Produce two distinct options for this one Web Push (1440 × 720).']){
  const out=input.normalize({brandId,leanWorkflowVersion:1,brief:'Launch the product.\nAudience is defined by this brief, not verified consumer research.'+ending});
  assert.doesNotMatch(out.brief,/two model-rendered options|two distinct options/,ending);assert.match(out.brief,/Produce one design/);
 }
});
