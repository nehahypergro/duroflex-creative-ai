'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path');
const {loadConfig,publicConfig}=require('../../lib/creative-ai/runtime/config');
const {OpenAIProvider}=require('../../lib/creative-ai/runtime/provider');
const {estimate}=require('../../lib/cost-tracker');
test('wire schema types nested constants without mutating the saved semantic contract',()=>{
 const {typedWireSchema}=require('../../lib/creative-ai/runtime/provider'),source={type:'object',properties:{version:{const:1},target:{const:'copywriter'},flag:{enum:[true,false]},mixedNumber:{enum:[1,1.5]}}},wire=typedWireSchema(source);
 assert.equal(wire.properties.version.type,'integer');assert.equal(wire.properties.target.type,'string');assert.equal(wire.properties.flag.type,'boolean');assert.equal(wire.properties.mixedNumber.type,'number');assert.equal(source.properties.target.type,undefined);assert.equal(wire.properties.target.const,'copywriter');
});
test('Luna defaults route both brands through Responses, preserve effort, schema and image model',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'luna-config-')),prior=process.env.CREATIVE_AI_REASONING_MODEL,fetchBefore=global.fetch;
 delete process.env.CREATIVE_AI_REASONING_MODEL;
 try{
  const config=loadConfig(root);assert.equal(config.reasoningModel,'gpt-6-luna');assert.equal(config.imageModel,'gpt-image-2');assert.equal(publicConfig(config).reasoningModel,'gpt-6-luna');
  const seen=[];global.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);seen.push(body);return {ok:true,json:async()=>({id:'mock-luna-'+seen.length,status:'completed',usage:{input_tokens:100,output_tokens:10},output:[{content:[{type:'output_text',text:'{"approved":true}'}]}]})};};
  const provider=new OpenAIProvider({...config,apiKey:'offline-fixture'}),receipts=[];
  for(const brand of ['Duroflex','Sleepyhead'])await provider.reason({instructions:'Review '+brand,input:{brand},reasoningEffort:'low',schema:{type:'object',properties:{approved:{type:'boolean'}},required:['approved'],additionalProperties:false},validate:o=>assert.equal(o.approved,true)},{reserve:async()=>{},receipt:async r=>receipts.push(r)});
  assert.equal(seen.length,2);for(const body of seen){assert.equal(body.model,'gpt-6-luna');assert.equal(body.reasoning.effort,'low');assert.equal(body.text.format.type,'json_schema');assert.equal(body.store,false);}assert.ok(receipts.every(r=>r.model==='gpt-6-luna'));
  await fs.writeFile(path.join(root,'.env'),'CREATIVE_AI_REASONING_MODEL=explicit-local\n');assert.equal(loadConfig(root).reasoningModel,'explicit-local');process.env.CREATIVE_AI_REASONING_MODEL='explicit-environment';assert.equal(loadConfig(root).reasoningModel,'explicit-environment');
 }finally{global.fetch=fetchBefore;if(prior===undefined)delete process.env.CREATIVE_AI_REASONING_MODEL;else process.env.CREATIVE_AI_REASONING_MODEL=prior;await fs.rm(root,{recursive:true,force:true});}
});
test('Luna metering separates cache reads/writes and prices reasoning output once',()=>{
 const receipt={kind:'reasoning',model:'gpt-6-luna',usage:{input_tokens:1000,input_tokens_details:{cached_tokens:400,cache_write_tokens:200},output_tokens:100,output_tokens_details:{reasoning_tokens:80}}};
 assert.equal(estimate(receipt),0.000119);
 assert.equal(estimate({...receipt,usage:{...receipt.usage,input_tokens_details:{cached_tokens:400,cache_creation_tokens:200}}}),0.000119);
 for(const details of [{cached_tokens:900,cache_write_tokens:200},{cache_write_tokens:-1},{cached_tokens:'400'},{cache_write_tokens:Infinity}])assert.equal(estimate({...receipt,usage:{...receipt.usage,input_tokens_details:details}}),null);
 const long={...receipt,usage:{input_tokens:300000,input_tokens_details:{cached_tokens:100000,cache_write_tokens:50000},output_tokens:1000}};assert.equal(estimate(long),0.04525);
 assert.equal(estimate({...receipt,usage:{input_tokens:272000,output_tokens:1000}}),0.0277);
});
test('art handoff uses a strict complete two-route schema, including knowledge and guideline applications',async()=>{
 const agents=require('../../lib/creative-ai/runtime/agents'),pk=require('../../lib/creative-ai/placement-knowledge'),input=await require('../../lib/creative-ai/graphic-designer/examples/synthetic').inputExample(),placement=input.artInput.placements[0];
 let request;await agents.artDraft({concepts:input.artInput.directorOutput.concepts,placements:[placement],guardian:{requirements:[],visualRules:[]},brandResearch:{sources:[]},assets:[{id:'actual-logo',kind:'logo',imageData:'data:image/png;base64,fixture'}],requiredSkuAssetIds:[]},{reason:async r=>{request=r;return {drafts:[]};}},{});
 assert.equal(request.strictSchema,true);assert.equal(request.schema.properties.version.type,'integer');assert.equal(request.schema.properties.drafts.items.anyOf,undefined);assert.equal(request.schema.properties.drafts.minItems,2);assert.equal(request.schema.properties.drafts.maxItems,2);
 for(const field of ['knowledgeApplications','brandGuidelineApplications'])assert.ok(request.schema.properties.drafts.items.required.includes(field));
 assert.match(request.instructions,/COMPLETE drafts array/);assert.deepEqual(request.schema.properties.drafts.items.properties.references.items.properties.assetId.enum,['actual-logo']);assert.deepEqual(request.schema.properties.drafts.items.properties.logo.properties.assetIds.items.enum,['actual-logo']);
});
