'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {typedWireSchema}=require('../../lib/creative-ai/runtime/provider');
const {check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
test('review uniqueItems is enforced locally but omitted from OpenAI strict wire schema',()=>{
 const s={type:'object',properties:{resolves:{type:'array',uniqueItems:true,items:{type:'string'}}},required:['resolves'],additionalProperties:false},w=typedWireSchema(s);
 assert.equal(w.properties.resolves.uniqueItems,undefined);assert.equal(s.properties.resolves.uniqueItems,true);
 assert.ok(check(s,{resolves:['overlap-1','overlap-1']}).some(e=>/duplicate/.test(e)));assert.deepEqual(check(s,{resolves:['overlap-1','overlap-2']}),[]);
});
test('unique objects compare independent of property insertion order',()=>{assert.ok(check({type:'array',uniqueItems:true},[{a:1,b:2},{b:2,a:1}]).some(e=>/duplicate/.test(e)));});
test('unresolved stored raster objects fail before token counting or spend',async()=>{
 const {OpenAIProvider}=require('../../lib/creative-ai/runtime/provider'),p=new OpenAIProvider({reasoningModel:'gpt-6-luna'});let calls=0;p.inputPreflight=async()=>{calls++;throw Error('should not reach counting');};
 await assert.rejects(()=>p.reason({instructions:'Review',input:{},schema:{type:'object'},images:[{id:'saved',imageData:{$studioRaster:{sha256:'fixture'}}}]},{reserve:async()=>{calls++;}}),/decoded raster/);assert.equal(calls,0);
});
