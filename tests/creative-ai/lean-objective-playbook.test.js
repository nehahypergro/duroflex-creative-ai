'use strict';
// Objective playbook v1 (8 Nov 2026). Before: the planner received the brief's objective
// as a bare word ("Purchase"), so purchase stories, awareness posters and education
// carousels were planned with the same copy volume and call-to-action strength.
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../../lib/creative-ai/lean/objective-playbook'),policy=require('../../lib/creative-ai/runtime/lean-policy'),ctx=require('../../lib/creative-ai/runtime/lean-context'),planning=require('../../lib/creative-ai/lean/planning'),review=require('../../lib/creative-ai/lean/visual-review'),providerConfig=require('../../lib/creative-ai/runtime/provider-config');

function context(brand,{objective='Purchase',name='Instagram Story',pin=true,options}={}){
 const brandId='brand-'+brand.toLowerCase(),data='data:image/png;base64,iVBORw0KGgo=';
 const intake={brandId,brandUrl:'https://'+brand.toLowerCase()+'.test/',brief:'Sell this exact SKU.',objective,productName:brand+' Product',productPageUrl:'https://'+brand.toLowerCase()+'.test/products/exact',productVariantId:'queen',originalArtworkVersion:1,leanWorkflowVersion:1,approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:'sku-photo',referenceAssetIds:['sku-photo'],variant:{id:'queen',sku:'EXACT-Q',name:'Queen'}}};
 const selection=[{id:'page-1',description:{name,formatId:name.toLowerCase().replace(/\W+/g,'-'),dimensions:{width:1080,height:1920}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}}];
 const runtimeConfig=policy.configure({maxConcurrentUnits:2},intake);if(!pin)delete runtimeConfig.objectivePlaybookVersion;if(options)runtimeConfig.leanImageOptions=options;
 return {job:{id:'job-x',runtimeConfig,selection},intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{sources:[{id:'source-product-page',kind:'product',reference:intake.productPageUrl,status:'available'}],assets:[{id:'sku-photo',kind:'product',sourceIds:['source-product-page'],imageData:data},{id:'approved-logo',kind:'logo',sourceIds:['source-product-page'],imageData:data}]},productBriefEvidence:{productProfileId:'product-exact',assetIds:['sku-photo'],evidence:[{factId:'fact-1'}]},facts:[{id:'fact-1',status:'supported',text:'Supported feature',sourceIds:[]}]},guardian:{requirements:[{id:'identity',text:'Preserve exact product identity'}],preferences:[],visualRules:[]}};
}

test('objective names and funnel stages resolve; unknown objectives add no rule',()=>{
 assert.equal(P.objective('purchase'),'Purchase');assert.equal(P.objective('','BOFU'),'Purchase');assert.equal(P.objective('','tofu'),'Awareness');
 assert.equal(P.objective('Sales spike'),null);assert.equal(P.rule({objective:''},[{description:{name:'Instagram Post'}}]),null);
});

test('every Studio format family maps to a viewing context',()=>{
 const expected={'Instagram Story':'story','WhatsApp Status':'story','Instagram Carousel':'carousel','Google PMax Set':'banner','Website Banner':'banner','Amazon A+ Content':'marketplace','Product Page Images':'marketplace','WhatsApp Image':'messaging','Email Banner':'messaging','Web Push':'notification','Shelf Wobbler':'at-shelf','Price / Offer Board':'at-shelf','Standee':'distance','Poster / Flyer':'distance','Brochure':'close-read','Sales One-pager':'close-read','Instagram Post':'feed','LinkedIn Post':'feed'};
 for(const [name,cls] of Object.entries(expected))assert.equal(P.formatClass({description:{name}}),cls,name);
 assert.equal(P.formatClass({description:{name:'Custom',dimensions:{width:1080,height:1920}}}),'story');
 for(const o of P.OBJECTIVES)for(const [cls] of P.CLASSES)assert(P.cells[o][cls],o+' x '+cls);
});

test('rules differ by objective and by format, and never license invented offers',()=>{
 const story=[{description:{name:'Instagram Story'}}],poster=[{description:{name:'Poster / Flyer'}}];
 const buy=P.rule({objective:'Purchase'},story),aware=P.rule({objective:'Awareness'},story),buyPoster=P.rule({objective:'Purchase'},poster);
 assert.match(buy.text,/strong.*call to action/i);assert.match(buy.text,/only with a real end date/);assert.match(buy.text,/safe area/);
 assert.match(aware.text,/minimal words/);assert.doesNotMatch(aware.text,/Shop now/);
 assert.match(buyPoster.text,/distance/);assert.notEqual(buy.text,buyPoster.text);
 for(const r of [buy,aware,buyPoster])assert.match(r.text,/never invent offers, prices, deadlines or claims/);
});

test('new lean jobs pin the playbook and the pin survives the provider snapshot',()=>{
 const config=policy.configure({},{leanWorkflowVersion:1});assert.equal(config.objectivePlaybookVersion,2,'new jobs pin playbook v2 (9 Nov 2026)');
 assert.equal(policy.configure({},{}).objectivePlaybookVersion,undefined);
 const snap=providerConfig.snapshot?providerConfig.snapshot(config):null;if(snap)assert.equal(snap.objectivePlaybookVersion,2);
});

for(const brand of ['Duroflex','Sleepyhead'])test(brand+': pinned planning packet carries the objective x format rule as a planning-only decision',()=>{
 const c=context(brand),input=ctx.packet(c,c.job.selection).input,r=input.format.guidance.mandatory.find(x=>x.id==='objective-playbook');
 assert(r,'playbook rule missing');assert.match(r.text,/PURCHASE/);assert.match(r.text,/vertical story/);
 assert.deepEqual(input.format.guidance.rulePlacements['objective-playbook'],['page-1']);
 /* Planner must account for it like any mandatory rule */
 const plan={message:'m',audience:'a',objective:'Purchase',insight:{text:'i',basis:'hypothesis'},desiredAction:'Buy',concept:'c',guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].filter(x=>x.id!=='objective-playbook').map(x=>({id:x.id,decision:'apply',reason:'Applies'})),pages:[{id:'page-1',purpose:'Sell',copy:[{role:'headline',text:brand+' Product',factIds:['product-exact']}],artDirection:'Product hero',hierarchy:'Product then CTA',palette:'Brand',typography:input.brand.fonts[0].family+' Bold 700',spatial:Object.fromEntries(planning.spatialFields.map(k=>[k,'Clear region'])),formatConstraints:['Safe area']}],omitted:[]};
 // 10 Nov 2026 live batch (Sofa Drip Pro brochure): a missing playbook note no longer fails the job; it is filled as
 // "apply" with a reason that says the planner wrote no note. The planner's own note is kept when it writes one.
 const missing=structuredClone(plan);assert.doesNotThrow(()=>planning.validatePlan(missing,input));assert.match(missing.guidanceDecisions.find(d=>d.id==='objective-playbook').reason,/^Applied automatically: the planner did not write a note/);
 plan.guidanceDecisions.push({id:'objective-playbook',decision:'apply',reason:'Purchase story'});assert.doesNotThrow(()=>planning.validatePlan(plan,input));assert.equal(plan.guidanceDecisions.find(d=>d.id==='objective-playbook').reason,'Purchase story');
 /* The visual review checks the plan's outcome, not the playbook wording itself */
 const contract=review.contract(input,plan,'page-1');assert(!contract.requirements.some(x=>/objective-playbook/.test(x.id)));
 assert.doesNotMatch(planning.imagePrompt(plan,input),/OBJECTIVE PLAYBOOK/);
 /* One design per format: the planner is no longer told two models render the plan */
 assert.doesNotMatch(input.renderingContract,/two image models/);assert.doesNotMatch(input.format.guidance.mandatory.find(x=>x.id==='scope-and-delivery')?.text||'',/two complete/);
});

test('historical jobs without the pin keep their packet unchanged',()=>{
 const c=context('Duroflex',{pin:false}),input=ctx.packet(c,c.job.selection).input;
 assert(!input.format.guidance.mandatory.some(x=>x.id==='objective-playbook'));assert.match(input.renderingContract,/two image models/);
 const none=context('Sleepyhead',{objective:'Sales spike'}),noRule=ctx.packet(none,none.job.selection).input;assert(!noRule.format.guidance.mandatory.some(x=>x.id==='objective-playbook'));
});

test('a pinned job that still renders two options says so',()=>{
 const c=context('Duroflex',{options:policy.jobOptions({runtimeConfig:{}})}),input=ctx.packet(c,c.job.selection).input;assert.match(input.renderingContract,/two image models/);
});

// Live run 9 Nov 2026 (Posture Perfect, Purchase): the Studio stores the chosen objective in
// intake.objective as its internal value ('action'), with the label on job.submittedBrief, so the
// playbook was silently skipped. The label wins; internal values map back; 'other' stays unknown.
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': the playbook reads the Studio objective as it is actually saved',()=>{
 assert.equal(P.objective('action'),'Purchase');assert.equal(P.objective('awareness'),'Awareness');assert.equal(P.objective('consideration'),'Consideration');assert.equal(P.objective('other'),null);
 const c=context(brand);c.intake.objective='action';c.job.submittedBrief={objective:'Purchase'};
 let r=ctx.packet(c,c.job.selection).input.format.guidance.mandatory.find(x=>x.id==='objective-playbook');assert(r,'playbook applies to a saved Studio job');assert.match(r.text,/PURCHASE/);
 c.intake.objective='other';c.job.submittedBrief={objective:'Education'};
 r=ctx.packet(c,c.job.selection).input.format.guidance.mandatory.find(x=>x.id==='objective-playbook');assert.match(r.text,/EDUCATION/,'the submitted label tells Education apart from Engagement');
 delete c.job.submittedBrief;c.intake.objective='action';
 r=ctx.packet(c,c.job.selection).input.format.guidance.mandatory.find(x=>x.id==='objective-playbook');assert.match(r.text,/PURCHASE/,'internal value alone still maps');
});

// Live run 9 Nov 2026: Purchase ads came back with feature-label headlines ("Pocket springs +
// memory foam.", "3-zoned pocket spring layer") and only a "Shop now" button. Playbook v2 (new
// jobs) asks for a direct, buyer-focused headline; v1 jobs keep their saved wording.
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': Purchase playbook v2 asks for persuasive, buyer-focused copy for new jobs only',()=>{
 assert.equal(policy.configure({},{leanWorkflowVersion:1}).objectivePlaybookVersion,2);
 const c=context(brand),input=ctx.packet(c,c.job.selection).input,r=input.format.guidance.mandatory.find(x=>x.id==='objective-playbook');
 assert.match(r.text,/OBJECTIVE PLAYBOOK v2/);assert.match(r.text,/not a feature label/i);assert.match(r.text,/second person|you\b/i);assert.match(r.text,/trial|warranty|delivery/i);assert.match(r.text,/never invent offers, prices, deadlines or claims/);
 const old=context(brand);old.job.runtimeConfig.objectivePlaybookVersion=1;const v1=ctx.packet(old,old.job.selection).input.format.guidance.mandatory.find(x=>x.id==='objective-playbook');
 assert.match(v1.text,/OBJECTIVE PLAYBOOK v1/);assert.doesNotMatch(v1.text,/not a feature label/i);
 const aware=context(brand,{objective:'Awareness'}),a=ctx.packet(aware,aware.job.selection).input.format.guidance.mandatory.find(x=>x.id==='objective-playbook');assert.match(a.text,/AWARENESS/);
});

// Live run 9 Nov 2026 (A+ Premium, Purchase): the planner marked objective-playbook "adapt"
// because Amazon A+ forbids on-image CTAs; validation required "apply" and planning failed twice.
// The playbook may be adapted with a reason (never skipped), and says where buttons don't belong.
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': the objective playbook can be adapted with a reason, never skipped',()=>{
 const c=context(brand),input=ctx.packet(c,c.job.selection).input,r=input.format.guidance.mandatory.find(x=>x.id==='objective-playbook');
 assert.match(r.text,/Amazon A\+|no on-image (button|call to action)/i);
 const plan={message:'m',audience:'a',objective:'Purchase',insight:{text:'i',basis:'hypothesis'},desiredAction:'Buy',concept:'c',guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(x=>({id:x.id,decision:'apply',reason:'Applies'})),pages:[{id:'page-1',purpose:'Sell',copy:[{role:'headline',text:brand+' Product',factIds:['product-exact']}],artDirection:'Product hero',hierarchy:'Product then CTA',palette:'Brand',typography:input.brand.fonts[0].family+' Bold 700',spatial:Object.fromEntries(planning.spatialFields.map(k=>[k,'Clear region'])),formatConstraints:['Safe area']}],omitted:[]};
 const d=plan.guidanceDecisions.find(x=>x.id==='objective-playbook');
 d.decision='adapt';d.reason='A+ forbids on-image CTAs; purchase intent shapes product prominence instead.';assert.doesNotThrow(()=>planning.validatePlan(plan,input));
 d.decision='not-applicable';assert.throws(()=>planning.validatePlan(plan,input),/objective-playbook/);
 d.decision='adapt';d.reason=' ';assert.throws(()=>planning.validatePlan(plan,input),/objective-playbook|reason/,'an adaptation needs a real reason');
 const other=plan.guidanceDecisions.find(x=>x.id!=='objective-playbook'&&input.format.guidance.mandatory.some(m=>m.id===x.id));if(other){d.decision='apply';d.reason='ok';other.decision='adapt';other.reason='Fits this format';
  // 10 Nov 2026 live batch: "adapt" on another mandatory rule is recorded as "apply" with the planner's note (never downgraded).
  assert.doesNotThrow(()=>planning.validatePlan(plan,input));assert.equal(other.decision,'apply');assert.match(other.reason,/^Adapted by the planner: Fits this format/);
  other.decision='not-applicable';assert.throws(()=>planning.validatePlan(plan,input),/Mandatory rule cannot be omitted/);}
});
