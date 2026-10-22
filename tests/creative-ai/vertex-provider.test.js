'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {wireBody,envelope,VertexPlanningProvider}=require('../../lib/creative-ai/runtime/vertex-provider');
const body={model:'gemini-3.8-flash',instructions:'Keep brand authority',input:[{content:[{type:'input_text',text:'Same saved brief'},{type:'input_image',image_url:'data:image/png;base64,YQ=='}]}],text:{format:{schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}}},reasoning:{effort:'medium'},max_output_tokens:1000};
test('Vertex retains full schema, instructions, images and thinking level',()=>{const w=wireBody(body);assert.ok(w.systemInstruction.parts[0].text.includes(JSON.stringify(body.text.format.schema)));assert.equal(w.contents[0].parts[0].text,'Same saved brief');assert.deepEqual(w.contents[0].parts[1],{inlineData:{mimeType:'image/png',data:'YQ=='}});assert.equal(w.generationConfig.thinkingConfig.thinkingLevel,'MEDIUM');});
test('Vertex preserves incomplete/blocking status and counts billed thoughts',()=>{const raw={responseId:'fixture',candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{thought:true,text:'private'},{text:'{}'}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:20,thoughtsTokenCount:30,cachedContentTokenCount:40}},r=envelope(raw);assert.equal(r.status,'incomplete');assert.equal(r.usage.output_tokens,50);assert.equal(r.output[0].content[0].text,'{}');assert.deepEqual(r.providerRaw,raw);assert.equal(envelope({}).status,'failed');assert.deepEqual(envelope({}).usage,{});});
test('Vertex preflight counts full instructions/schema and blocks excess context',async()=>{const p=new VertexPlanningProvider({},{});let payload,records=[];p.call=async(m,op,b)=>{payload=b;assert.equal(op,'countTokens');return {ok:true,json:async()=>({totalTokens:1048576})};};await assert.rejects(()=>p.inputPreflight(body,{preflight:async d=>records.push(d)},{}),/budget exceeded/);assert.ok(payload.contents[0].parts[0].text.includes('additionalProperties'));assert.equal(records[0].status,'blocked');});
test('New model estimates include Gemini thinking and reject missing usage',()=>{const {estimate}=require('../../lib/cost-tracker');assert.equal(estimate({kind:'reasoning',model:'gpt-6.1-sol',usage:{input_tokens:1000,output_tokens:100}}),0.003);assert.equal(estimate({kind:'reasoning',model:'gemini-3.8-flash',usage:{input_tokens:1000,output_tokens:100}}),0.001125);assert.equal(estimate({kind:'reasoning',model:'gemini-3.1-pro-preview',usage:{}}),null);});

test('Argon non-streaming initial and retry outputs stay within 32768, other models unchanged',async()=>{
 const p=new VertexPlanningProvider({reasoningModel:'gpt-6-luna',roleModels:{art:{model:'gemini-4-argon',reasoningEffort:'medium'}},maxOutputTokens:25000,maxRecoveryOutputTokens:50000,inputContextPreflight:false},{}),calls=[],receipts=[];
 p.call=async(m,op,b)=>{calls.push(b);return {ok:true,status:200,json:async()=>({responseId:'argon-'+calls.length,candidates:[{finishReason:calls.length===1?'MAX_TOKENS':'STOP',content:{parts:[{text:'{"ok":true}'}]}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:5,thoughtsTokenCount:10}})};};
 await p.reason({contextKind:'art',instructions:'fixture',input:{},schema:body.text.format.schema},{reserve:async()=>{},receipt:async r=>receipts.push(r)});
 assert.deepEqual(calls.map(b=>b.generationConfig.maxOutputTokens),[25000,32768]);assert.deepEqual(receipts.map(r=>r.outputTokenLimit),[25000,32768]);
 assert.throws(()=>wireBody({...body,model:'gemini-4-argon',max_output_tokens:32769}),/32768/);
 assert.equal(wireBody({...body,max_output_tokens:50000}).generationConfig.maxOutputTokens,50000);
 assert.throws(()=>wireBody({...body,model:'gemini-4-argon',reasoning:{effort:'minimal'}}),/thinking level/);
});
test('Mini has its own verified input-context limit',()=>{
 const {policy}=require('../../lib/creative-ai/runtime/context-preflight');assert.equal(policy('gpt-5.4-mini',{}).contextWindow,400000);assert.equal(policy('gpt-5.4-mini',{}).maxOutputTokens,128000);
});
test('Argon prices use receipt date across promotion expiry and preserve unknown usage',()=>{
 const {estimate}=require('../../lib/cost-tracker'),r={kind:'reasoning',model:'gemini-4-argon',usage:{input_tokens:1000000,output_tokens:1000000}};
 assert.equal(estimate({...r,recordedAt:'2026-11-30T23:59:59Z'}),12);assert.equal(estimate({...r,recordedAt:'2026-12-01T00:00:00Z'}),24);assert.equal(estimate({...r,usage:{}}),null);
});

test('Gemini 3.6 Flash routes through Vertex with exact model, Medium thinking and counted input',async()=>{
 const p=new VertexPlanningProvider({roleModels:{art:{model:'gemini-3.6-flash',reasoningEffort:'medium'}}},{}),calls=[];
 p.call=async(model,operation,payload)=>{calls.push({model,operation,payload});return {ok:true,status:200,json:async()=>operation==='countTokens'?{totalTokens:100}:{responseId:'fixture-36',candidates:[{finishReason:'STOP',content:{parts:[{text:'{"ok":true}'}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:10}}};};
 const b={...body,model:'gemini-3.6-flash'};await p.inputPreflight(b,{preflight:async()=>{}},{});const response=await p.sendReasoning(b,1000);assert.equal((await response.json()).status,'completed');assert.deepEqual(calls.map(c=>[c.model,c.operation]),[['gemini-3.6-flash','countTokens'],['gemini-3.6-flash','generateContent']]);assert.equal(calls[1].payload.generationConfig.thinkingConfig.thinkingLevel,'MEDIUM');
 const {estimate}=require('../../lib/cost-tracker'),r={kind:'reasoning',model:b.model,usage:{input_tokens:1000000,output_tokens:1000000}};assert.equal(estimate({...r,recordedAt:'2026-10-15T00:00:00Z'}),4.5);assert.equal(estimate({...r,recordedAt:'2027-01-01T00:00:00Z'}),9);assert.equal(estimate({...r,usage:{}}),null);
});
