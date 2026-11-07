'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {OpenAIProvider}=require('../../lib/creative-ai/runtime/provider');
const {expand}=require('../../lib/creative-ai/runtime/role-packets');
const schema={type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false};
function fixture(brandId='duroflex'){
 const photo={id:'sku-product-image-1',kind:'product',brandId,sourceIds:['product'],imageData:'data:image/png;base64,YQ=='};
 return {assignment:{productName:'Exact sofa',variantId:'queen',brief:'Use “Rest well” exactly.',goal:'Use “Rest well” exactly.',audience:'New homeowners',objective:'consideration',customerInsight:'A working hypothesis',desiredAction:'Explore',formats:[{id:'linkedin',dimensions:{width:1200,height:627},constraints:['No campaign logo']}]},facts:[{id:'sku',kind:'product',text:'3-year warranty on frame only.',status:'supported',sourceIds:['product']},{id:'conflict',kind:'brand',text:'Draft palette conflicts with approved logo.',status:'conflicted',sourceIds:['guide']}],guardian:{requirements:[{id:'locked',text:'Use “Rest well” exactly.',sourceIds:['brief']}],preferences:[{id:'calm',text:'Calm is a suggestion.',sourceIds:['guide']}]},conflicts:[{text:'Preserve unresolved uncertainty',sourceIds:['guide']}],additionalSources:[{id:'brief',kind:'user',status:'available'}],research:{brandName:brandId,sources:[{id:'product',kind:'product',status:'available',reference:'https://example.com/product?variant=queen'},{id:'guide',kind:'guideline',status:'partial',authority:'draft',note:'Not approved'},{id:'unused',kind:'site',status:'available'}],findings:[{id:'visual',section:'creative',text:'Optional bedroom scene',sourceIds:['guide']},{id:'uncertain',section:'conflicts',text:'Draft is not mandatory',sourceIds:['guide']}],assets:[photo,{id:'bedroom',kind:'reference',brandId,sourceIds:['guide'],imageData:'data:image/png;base64,Yg=='}]}};
}
async function capture(stage,pinned=true,selectedReferenceIds=[],mutate=()=>{}){
 const si=fixture(),context={assignmentId:'assignment',strategyInput:si,strategy:{brief:{primaryProposition:{text:'Chosen message',factIds:['sku']}},assumptions:[{text:'Hypothesis, not established insight'}],alternatives:[{id:'old',text:'Unused direction'}],requirementChecks:[{text:'Old analysis'}]},referenceCreativeIds:['bedroom'],userPreferences:[]};
 const input=stage==='strategy'?{assignment:si,boundaryAudit:{eligibleFacts:si.facts,sources:si.research.sources,missingEssential:['conflict']}}:{context,eligibleProofFactIds:['sku'],outputUnits:[{key:'continuity',route:'continuity'}]};
 mutate(input,si);
 const request={contextKind:stage,planningBaseInstructions:'OLD INHERITED ANALYSIS',instructions:'OLD INHERITED ANALYSIS\nRetain dynamic correction and brand boundary.',input,schema,images:si.research.assets};
 const prior=structuredClone(request);let body,receipt,validations=0;
 const p=new OpenAIProvider({reasoningModel:'gpt-6-luna',reasoningTimeoutMs:1000,maxOutputTokens:100,maxRecoveryOutputTokens:100,inputContextPreflight:false});
 p.sendReasoning=async b=>{body=b;return {ok:true,json:async()=>({id:'resp_packet',status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]})};};
 request.validate=()=>validations++;
 await p.reason(request,{stageContext:async()=>({version:3,planningPacketVersion:pinned?1:0,brandId:'duroflex',selectedReferenceIds}),reserve:async()=>{},receipt:async r=>receipt=r});
 assert.deepEqual({...request,validate:undefined},{...prior,validate:undefined});assert.equal(validations,1);
 const user=body.input.find(m=>m.role==='user'),json=JSON.parse(user.content[0].text.replace('Return JSON matching this contract. ',''));
 return {body,input:expand(json.input,json.input.sharedText||{}),receipt,images:user.content.filter(c=>c.type==='input_image')};
}
test('strategy sends a decision packet, not repeated analyses; retains source wording and reasoning effort',async()=>{
 const r=await capture('strategy');assert.equal(r.input.planningPacketVersion,1);assert.equal(r.input.assignment.variantId,'queen');assert.equal(r.input.assignment.brief,'Use “Rest well” exactly.');assert.equal(r.input.assignment.goal,undefined);
 assert.equal(r.input.facts[0].text,'3-year warranty on frame only.');assert.equal(r.input.facts[1].status,'conflicted');assert.equal(r.input.guardian.requirements[0].id,'locked');assert.equal(r.input.boundaryAudit.sources,undefined);assert.deepEqual(r.input.boundaryAudit.missingEssential,['conflict']);assert.equal(r.images.length,0);assert.equal(r.body.reasoning.effort,'medium');assert.ok(!r.body.instructions.includes('OLD INHERITED ANALYSIS'));assert.ok(r.body.instructions.includes('Retain dynamic correction'));assert.ok(!r.input.sources.some(s=>s.id==='unused'));
});
for(const brandId of ['duroflex','sleepyhead'])test(brandId+': strategy can distinguish saved execution assets from absent visual attachments',()=>{
 const packets=require('../../lib/creative-ai/runtime/planning-packets'),si=fixture(brandId);si.research.assets.push({id:'approved-logo-one',kind:'logo',brandId,imageData:'data:image/png;base64,YQ==',sourceIds:['guide']},{id:'missing-product',kind:'product',status:'missing',brandId,sourceIds:['product']});
 const out=packets.prepare('strategy',{assignment:si},{brandId});assert.equal(out.images.length,0);assert.equal(out.input.assets.find(a=>a.id==='sku-product-image-1').availability,'available-for-downstream');assert.equal(out.input.assets.find(a=>a.id==='approved-logo-one').visualInspection,'not-attached-to-strategy');assert.equal(out.input.assets.find(a=>a.id==='missing-product').availability,'missing');assert.ok(!out.input.assets.some(a=>a.id==='bedroom'));assert.doesNotMatch(JSON.stringify(out.input),/data:image/);assert.match(packets.instructions('strategy'),/targeted researchRequests entry/);assert.match(packets.instructions('strategy'),/nonessential when a general action/);
});
test('concepts receive selected strategy and useful pixels without automatic bedroom inspiration',async()=>{
 const r=await capture('concepts');assert.equal(r.input.context,undefined);assert.equal(r.input.selectedStrategy.brief.primaryProposition.text,'Chosen message');assert.equal(r.input.selectedStrategy.alternatives,undefined);assert.equal(r.input.selectedStrategy.requirementChecks,undefined);assert.equal(r.images.length,1);assert.equal(r.input.assets[0].id,'sku-product-image-1');assert.equal(r.input.assignment.formats[0].constraints[0],'No campaign logo');assert.equal(r.body.reasoning.effort,'medium');
 const chosen=await capture('concepts',true,['bedroom']);assert.equal(chosen.images.length,2);assert.ok(chosen.input.assets.some(a=>a.id==='bedroom'));
});
test('historical jobs retain their existing context and instruction contract',async()=>{
 const r=await capture('concepts',false);assert.ok(r.input.context.strategyInput);assert.ok(r.body.instructions.includes('OLD INHERITED ANALYSIS'));assert.equal(r.images.length,2);assert.equal(r.receipt.optimisation.planningPacket,undefined);
});
test('compact brand instructions retain isolation while omitting unused manifest IDs',async()=>{
 const {BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation'),scope={brandId:'brand-one',brandName:'Fixture',brandUrl:'https://example.com',revision:'r1',assetIds:['unused-library-asset'],documentIds:['unused-library-document'],visualGuidance:'website-observations-only'};
 const p=new BrandScopedProvider({reason:async r=>r},{}),budget={brandContext:async()=>({intake:{brandId:scope.brandId,brandUrl:scope.brandUrl,brandKnowledge:scope}}),stageContext:async()=>({planningPacketVersion:1})};
 const request={contextKind:'strategy',instructions:'Stage instructions',input:{}};
 const next=await p.reason(request,budget);assert.match(next.instructions,/Never inherit another brand/);assert.ok(!next.instructions.includes('unused-library-asset'));assert.deepEqual(next.input.brandKnowledge,scope);
 const old=await p.reason(request,{...budget,stageContext:async()=>({})});assert.ok(old.instructions.includes('unused-library-asset'));
 await assert.rejects(()=>p.reason({...request,input:{brandId:'foreign'}},budget),{code:'BRAND_ISOLATION'});
});
test('selected missing pixels, cross-brand references and excessive required images fail before dispatch',async()=>{
 await assert.rejects(()=>capture('concepts',true,['absent']),{code:'PLANNING_REFERENCE_MISSING'});
 await assert.rejects(()=>capture('concepts',true,[],(_,si)=>si.research.assets[1].brandId='sleepyhead'),/another brand/);
 await assert.rejects(()=>capture('concepts',true,[],(_,si)=>si.research.assets.push(...Array.from({length:8},(_,i)=>({id:'required-'+i,kind:'reference',mandatory:true,imageData:'data:image/png;base64,YQ=='})))),{code:'REFERENCE_CAPACITY'});
});
test('explicitly applicable inspiration is attached; mandatory guidance, corrections and qualifiers survive',async()=>{
 const r=await capture('concepts',true,[],(input,si)=>{
  si.research.assets[1].applicability={stages:['concepts'],placementIds:['linkedin']};
  input.revision={affectedConceptId:'one',correctionPlan:{exactWording:'Rest well',scope:'typography'}};
 });
 assert.equal(r.images.length,2);assert.equal(r.input.revision.correctionPlan.exactWording,'Rest well');assert.equal(r.input.facts[0].text,'3-year warranty on frame only.');
 const strategy=await capture('strategy',true,[],(_,si)=>si.research.findings[0].mandatory=true);assert.ok(strategy.input.brandGuidance.findings.some(f=>f.id==='visual'));
});
test('helpful inspiration is bounded without evicting selected or required pixels',async()=>{
 const r=await capture('concepts',true,['bedroom'],(_,si)=>si.research.assets.push(...Array.from({length:12},(_,i)=>({id:'optional-'+i,kind:'reference',applicability:{stages:['concepts']},imageData:'data:image/png;base64,YQ=='}))));
 assert.equal(r.images.length,4);assert.ok(r.input.assets.some(a=>a.id==='bedroom'));assert.ok(r.input.assets.some(a=>a.id==='sku-product-image-1'));
});
test('new job pins packet contract; reusing or resuming an old job does not migrate it',async()=>{
 const fs=require('fs/promises'),os=require('os'),path=require('path'),{JobStore}=require('../../lib/creative-ai/runtime/store');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'planning-pin-')),store=new JobStore(path.join(root,'jobs')),config={jobTimeoutMs:10000,maxReasoningCalls:3};
 try {const old=await store.create({brandId:'brand-duroflex',requestKey:'prior-contract'},config,[]);assert.equal((await store.budget(old.id).stageContext()).planningPacketVersion,0);
 const resumed=await store.create(old.intake,{...config,planningPacketVersion:1},[]);assert.equal(resumed.planningPacketVersion,undefined);
 const next=await store.create({brandId:'brand-sleepyhead'},{...config,planningPacketVersion:1},[]);assert.equal((await store.budget(next.id).stageContext()).planningPacketVersion,1);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
for(const brandId of ['brand-duroflex','brand-sleepyhead'])test('full concept schema and upstream validation work with compact packets: '+brandId,async()=>{
 const fixture=require('../../lib/creative-ai/creative-director/examples/synthetic'),agents=require('../../lib/creative-ai/runtime/agents'),director=require('../../lib/creative-ai/creative-director');
 const input=fixture.inputExample();
 // This is an explicitly selected synthetic reference, not an inferred default.
 const ref=input.strategyInput.research.assets.find(a=>a.id==='art');ref.brandId=brandId;for(const a of input.strategyInput.research.assets)a.imageData='data:image/png;base64,YQ==';
 const out=fixture.coreExample(input);out.concepts=Object.fromEntries(out.concepts.map(c=>{const key=c.route;delete c.strategyLinkage;delete c.brandLinkage.preservedRequirementIds;delete c.evidence.assumptionIds;delete c.conceptId;delete c.route;return [key,c];}));
 let calls=0;
 const p=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:1000,maxOutputTokens:10000,maxRecoveryOutputTokens:20000,inputContextPreflight:false});
 p.sendReasoning=async body=>{calls++;assert.equal(body.reasoning.effort,'medium');assert.ok(!body.instructions.includes('MODEL CORE OUTPUT SCHEMA'));return {ok:true,json:async()=>({id:'resp_concepts_fixture',status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(out)}]}]})};};
 const result=await agents.concepts(input,p,{stageContext:async()=>({version:3,planningPacketVersion:1,brandId,selectedReferenceIds:['art']}),reserve:async()=>{},receipt:async()=>{}});
 assert.equal(calls,1);assert.equal(director.validateOutput(result,input).ok,true);assert.deepEqual(result.concepts[0].strategyLinkage.primaryProposition,input.strategy.brief.primaryProposition);
 await assert.rejects(()=>agents.concepts(input,p,{stageContext:async()=>({version:3,planningPacketVersion:1,brandId,selectedReferenceIds:[]}),reserve:async()=>{},receipt:async()=>{}}),{code:'REASONING_CONTRACT_INVALID'});
});
for(const brandId of ['brand-duroflex','brand-sleepyhead'])test('strategy compact packet restores exact claims through the full validator: '+brandId,async()=>{
 const fixture=require('../../lib/creative-ai/marketing-strategist/examples/synthetic'),agents=require('../../lib/creative-ai/runtime/agents'),input=await fixture.inputExample();
 const out=fixture.outputExample({includeStrategyChecks:true});
 for(const key of ['audience','buyingSituation'])for(const field of ['basis','sourceIds','factIds'])delete out.brief[key][field];
 for(const key of ['customerBarrier','customerRelevance'])delete out.strategyChecks[key].basis;
 delete out.getWhoToBy;delete out.sourceIds;delete out.brief.positioningFactIds;delete out.strategyChecks.destination.expectedAction;
 out.brief.supportingClaims=out.brief.supportingClaims.map(c=>c.factId);
 const raw=require('../../lib/creative-ai/runtime/strategy-choice').fromRecorded(out);raw.unusedBrandFacts=null;raw.strategyChecks.destination.url=null;for(const c of [...raw.alternatives,raw.directionDecision.chosen])c.optionalScore=null;let calls=0;
 const p=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:1000,maxOutputTokens:10000,maxRecoveryOutputTokens:20000,inputContextPreflight:false});
 p.sendReasoning=async body=>{calls++;assert.equal(body.reasoning.effort,'medium');return {ok:true,json:async()=>({id:'resp_strategy_fixture',status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(raw)}]}]})};};
 const result=await agents.strategist(input,p,{stageContext:async()=>({version:3,planningPacketVersion:1,brandId}),reserve:async()=>{},receipt:async()=>{}});
 assert.equal(calls,1);assert.equal(result.status,'ready');assert.equal(result.brief.supportingClaims[0].text,input.facts[0].text);assert.equal(result.brief.primaryProposition.basis,'inference');
});
