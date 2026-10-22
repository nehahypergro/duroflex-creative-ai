const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const agents=require('../../lib/creative-ai/runtime/agents');
test('recorded Yolo blocked concepts stop before downstream dispatch',()=>{
 const saved=JSON.parse(fs.readFileSync('output/creative-ai/jobs/creative-c3537e34-bc28-45db-b584-ea888f9c6a8d/concepts.json'));
 assert.throws(()=>agents.requireConceptDispatch(saved),e=>e.code==='CONCEPT_DEPENDENCY_REQUIRED');
});
test('both specialist permissions and ready status are required',()=>{
 const ready={status:'ready',handoff:{recipients:[{agentId:'copywriter',dispatchAllowed:true},{agentId:'art-director',dispatchAllowed:true}]}};
 assert.doesNotThrow(()=>agents.requireConceptDispatch(ready));
 for(const value of [{...ready,status:'blocked'},{...ready,handoff:{recipients:[]}}, {...ready,handoff:{recipients:[ready.handoff.recipients[0],{agentId:'art-director',dispatchAllowed:false}]}}])assert.throws(()=>agents.requireConceptDispatch(value),e=>e.code==='CONCEPT_DEPENDENCY_REQUIRED');
});
test('generated scenes are distinguished from required source assets in director contract',()=>{
 const prompt=require('../../lib/creative-ai/creative-director').assembleContext(require('../../lib/creative-ai/creative-director/examples/synthetic').inputExample()).messages[0].content;
 assert.match(prompt,/Generated people, settings and lighting are planned outputs/);
 assert.match(prompt,/missing product references, authentic logos/);
});
