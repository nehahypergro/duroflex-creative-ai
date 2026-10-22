'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {replayEnvelope}=require('../../scripts/creative-ai/qa-recorded-provider');
test('recorded replay preserves incomplete status, usage and provider metadata without mutating evidence',()=>{
 const saved={json:{id:'recorded',status:'incomplete',incomplete_details:{reason:'max_output_tokens'},usage:{output_tokens:100},output:[{type:'message',content:[{type:'output_text',text:'{"old":true}'}]}]}};
 const before=structuredClone(saved),out=replayEnvelope(saved,{migrated:true});
 assert.equal(out.status,'incomplete');assert.deepEqual(out.incomplete_details,before.json.incomplete_details);
 assert.deepEqual(out.usage,before.json.usage);assert.equal(out.output[0].content[0].text,'{"migrated":true}');assert.deepEqual(saved,before);
});
test('recorded replay rejects missing or ambiguous text instead of manufacturing a completed response',()=>{
 for(const content of [[],[{type:'refusal',refusal:'No'}],[{type:'output_text',text:'{}'},{type:'output_text',text:'{}'}]])
  assert.throws(()=>replayEnvelope({json:{status:'completed',output:[{content}]}},{}),/one output_text block/);
});
test('brand QA requires an explicit known brand and local recorded-job identity',async()=>{
 const {run,samplesForBrand}=require('../../scripts/creative-ai/qa-brand-next-run');
 await assert.rejects(()=>run({jobId:'../../foreign',brandName:'Duroflex'}),/recorded job/);
 await assert.rejects(()=>run({jobId:'creative-00000000-0000-0000-0000-000000000000',brandName:'Unknown'}),/supported brand/);
 for(const name of ['Duroflex','Sleepyhead']){const values=Object.values(samplesForBrand(name));assert.equal(values.length,16);assert.ok(values.some(s=>s.includes(name)));assert.ok(values.every(s=>!s.includes(name==='Duroflex'?'Sleepyhead':'Duroflex')));}
});
