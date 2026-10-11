'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const provenance=require('../../lib/creative-ai/runtime/art-provenance'),agents=require('../../lib/creative-ai/runtime/agents'),{check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
test('planning annotations cannot cite another selected slide’s otherwise valid rule or source',()=>{
 const placements=['slide-1','slide-2'].map(id=>({id,expanded:{rules:[{id:id+'-canvas',sourceIds:[id+'-source'],evidenceStatus:'user-specified',tier:'mandatory'},{id:'legibility',sourceIds:['editorial'],evidenceStatus:'editorial-heuristic',tier:'heuristic'}]}})),before=JSON.stringify(agents.draftSchema),schema=provenance.draftSchemaFor(agents.draftSchema,placements),condition={type:'object',anyOf:schema.properties.drafts.items.anyOf};
 const own={placementId:'slide-2',...Object.fromEntries(['safeAreas','crop','viewingSize'].map(name=>[name,{ruleIds:['slide-2-canvas'],sourceIds:['slide-2-source']}]))};
 assert.deepEqual(check(condition,own),[]);
 for(const name of ['safeAreas','crop','viewingSize']){const wrong=structuredClone(own);wrong[name].ruleIds=['slide-1-canvas'];assert.ok(check(condition,wrong).length);const wrongSource=structuredClone(own);wrongSource[name].sourceIds=['slide-1-source'];assert.ok(check(condition,wrongSource).length);}
 const editorial=structuredClone(own);editorial.viewingSize={ruleIds:['legibility'],sourceIds:['editorial']};assert.deepEqual(check(condition,editorial),[]);
 assert.equal(JSON.stringify(agents.draftSchema),before);
});
