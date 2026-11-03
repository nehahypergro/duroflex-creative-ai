'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),eff=require('../../lib/creative-ai/runtime/token-efficiency');
const check=require('../../lib/creative-ai/marketing-strategist/schema-validator').check;
function expand(root){function walk(s){if(s.$ref){assert.match(s.$ref,/^#\/\$defs\//);return walk(root.$defs[s.$ref.slice(8)]);}if(Array.isArray(s))return s.map(walk);if(s&&typeof s==='object')return Object.fromEntries(Object.entries(s).filter(([k])=>k!=='$defs').map(([k,v])=>[k,typeof v==='object'&&v!==null?walk(v):v]));return s;}return walk(root);}
test('shared enum schemas preserve exact restrictions and reduce bytes',()=>{
 const item={type:'string',enum:Array.from({length:50},(_,i)=>'source-qualified-'+i)},schema={type:'object',properties:{a:item,b:structuredClone(item)},required:['a','b'],additionalProperties:false},before=structuredClone(schema),packed=eff.compactSchema(schema);
 assert(JSON.stringify(packed).length<JSON.stringify(schema).length);assert.deepEqual(expand(packed),schema);assert.deepEqual(schema,before);
 assert(check(expand(packed),{a:'foreign',b:item.enum[0]}).length);assert.deepEqual(check(expand(packed),{a:item.enum[0],b:item.enum[1]}),[]);
});
test('art prompts remove stale instructions without deleting copy restrictions',()=>{
 const text=require('fs').readFileSync(require('path').join(__dirname,'../../lib/creative-ai/art-director/instructions.md'),'utf8'),out=eff.instructions(text,'art');
 assert(!out.includes('BOTH continuity and exploration'));assert(!out.includes('not an implemented Copywriter'));assert(!out.includes('Keep both concepts'));assert(out.includes('never drop, paraphrase, truncate or hide qualifiers'));assert.equal(eff.instructions(text,'strategy'),text);
});
test('single-route concept wording matches the pinned selection',()=>{
 const text='The continuity key is the continuity premise; the exploration key is its contrasting exploration. Develop continuity first and keep every title, rationale, self-critique and public explanation under its own named key. Never describe the exploration concept as continuity or contrast continuity against itself. Produce the two creative premises';
 const out=eff.instructions(text,'concepts',['continuity']);assert(!out.includes('contrasting exploration'));assert(!out.includes('two creative'));assert(out.includes('only the selected continuity'));assert.equal(eff.instructions(text,'concepts',['continuity','exploration']),text);
});
test('strategy choices block ineligible exclusions and wrong-page proof upstream',async()=>{
 const si=await require('../../lib/creative-ai/marketing-strategist/examples/synthetic').inputExample();si.assignment.landingPageUrl='https://example.com/exact?variant=queen';si.guardian.requirements=[];si.guardian.establishedPositioningFactIds=[];si.conflicts=[];si.facts=[{id:'exact',kind:'destination',status:'supported',sourceIds:['exact-source']},{id:'other',kind:'destination',status:'supported',sourceIds:['other-source']}];si.additionalSources=[{id:'exact-source',reference:si.assignment.landingPageUrl},{id:'other-source',reference:'https://example.com/other'}];
 const destination={type:'object',properties:{status:{type:'string',enum:['verified','unverified']},factIds:{type:'array',items:{type:'string'}}}};
 const schema={type:'object',properties:{unusedBrandFacts:{type:'array',items:{type:'string'}},strategyChecks:{type:'object',properties:{destination}}}};
 let out=eff.strategyChoices(schema,{assignment:si});assert.equal(out.properties.unusedBrandFacts.maxItems,0);assert.deepEqual(out.properties.strategyChecks.properties.destination.properties.factIds.items.enum,['exact']);
 si.assignment.landingPageUrl+='-missing';out=eff.strategyChoices(schema,{assignment:si});assert.deepEqual(out.properties.strategyChecks.properties.destination.properties.status.enum,['unverified']);assert.equal(out.properties.strategyChecks.properties.destination.properties.factIds.maxItems,0);
});
test('review drops only uncited supported nonessential brand context',()=>{
 const input={criticalChecks:[{factIds:['cited']}],sourceFacts:[{id:'cited',kind:'brand',status:'supported',essential:false},{id:'unrelated',kind:'brand',status:'supported',essential:false},{id:'sku',kind:'product',status:'supported',essential:false},{id:'uncertain',kind:'brand',status:'unverified',essential:false},{id:'mandatory',kind:'brand',status:'supported',essential:true}],exactCopy:['Queen only']};
 assert.deepEqual(eff.review(input).sourceFacts.map(f=>f.id),['cited','sku','uncertain','mandatory']);assert.deepEqual(eff.review({...input,criticalChecks:[]}).sourceFacts,input.sourceFacts);assert.deepEqual(eff.review(input).exactCopy,input.exactCopy);
});
test('targeted repair cannot change unaffected fields or bypass full validation',()=>{
 const schema={type:'object',properties:{strategyChecks:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false},brief:{type:'string'}}},previous={strategyChecks:{ok:false},brief:'Exact brief'};
 const repair=eff.repair(schema,previous,Error('Verified destination proof must refer to the actual selected page, not a different page on the site'),'strategy');assert(repair);assert.deepEqual(repair.merge({strategyChecks:{ok:true}}),{strategyChecks:{ok:true},brief:'Exact brief'});assert.throws(()=>repair.merge({strategyChecks:{ok:true},brief:'changed'}),/unexpected/);assert.equal(eff.repair(schema,previous,Error('Unknown failure'),'strategy'),null);assert.equal(eff.repair(schema,previous,Error('Verified destination proof must refer to the actual selected page\nAnother failure'),'strategy'),null);
});
test('trial settings must be named and scoped to one recognized stage',()=>{assert.equal(eff.trial(null),null);assert.deepEqual(eff.trial({id:'trial-copy-low',stage:'copy',effort:'low'}),{id:'trial-copy-low',stage:'copy',effort:'low'});assert.throws(()=>eff.trial({id:'trial-all',stage:'all',effort:'low'}),/Invalid/);});
test('new jobs pin a trial while reused jobs preserve their original configuration',async()=>{
 const fs=require('fs/promises'),os=require('os'),path=require('path'),{JobStore}=require('../../lib/creative-ai/runtime/store'),root=await fs.mkdtemp(path.join(os.tmpdir(),'token-trial-'));
 try{const store=new JobStore(path.join(root,'jobs')),intake={brandId:'brand-sleepyhead',requestKey:'trial-job-creation'},config={stageContextVersion:3,reasoningTrial:{id:'trial-copy-low',stage:'copy',effort:'low'},jobTimeoutMs:1000,maxReasoningCalls:1};
 const job=await store.create(intake,config,[]);assert.deepEqual((await store.budget(job.id).stageContext()).reasoningTrial,config.reasoningTrial);
 const reused=await store.create(intake,{...config,reasoningTrial:{id:'trial-copy-medium',stage:'copy',effort:'medium'}},[]);assert.deepEqual(reused.reasoningTrial,config.reasoningTrial);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('v3 provider uses patch repair schema, merges locally and pins trial effort',async()=>{
 const {OpenAIProvider}=require('../../lib/creative-ai/runtime/provider'),old=global.fetch,bodies=[],receipts=[];
 const schema={type:'object',properties:{strategyChecks:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false},brief:{type:'string'}},required:['strategyChecks','brief'],additionalProperties:false};
 global.fetch=async(url,options)=>{bodies.push(JSON.parse(options.body));return {ok:true,json:async()=>({id:'efficiency-'+bodies.length,status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(bodies.length===1?{strategyChecks:{ok:false},brief:'Exact'}:{strategyChecks:{ok:true}})}]}]})};};
 const provider=new OpenAIProvider({reasoningModel:'gpt-6-luna',maxOutputTokens:100,maxRecoveryOutputTokens:100,reasoningTimeoutMs:1000,inputContextPreflight:false,roleModels:{strategy:{model:'gpt-6-luna',reasoningEffort:'medium'}}});
 try{const result=await provider.reason({contextKind:'strategy',instructions:'Test',input:{brief:'Exact'},schema,validate:out=>{assert.equal(out.brief,'Exact');if(!out.strategyChecks.ok)throw Error('Verified destination proof must refer to the actual selected page, not a different page on the site');}},{stageContext:async()=>({version:3,brandId:'brand-duroflex',reasoningTrial:{id:'trial-strategy-low',stage:'strategy',effort:'low'}}),reserve:async()=>{},receipt:async r=>receipts.push(r)});
 assert.equal(result.brief,'Exact');assert.equal(bodies.length,2);assert.deepEqual(Object.keys(bodies[1].text.format.schema.properties),['strategyChecks']);assert(bodies.every(b=>b.reasoning.effort==='low'));assert.equal(receipts[1].optimisation.repairField,'strategyChecks');
 }finally{global.fetch=old;}
});
module.exports={expand};
