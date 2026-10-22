'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
const fixture=require('../../lib/creative-ai/marketing-strategist/examples/synthetic');
const schemas=[
 ['Creative Director',require('../../lib/creative-ai/creative-director/input.schema.json').properties.strategyInput.properties.assignment],
 ['Art Director',require('../../lib/creative-ai/art-director/input.schema.json').properties.directorInput.properties.strategyInput.properties.assignment],
 ['Graphic Designer',require('../../lib/creative-ai/graphic-designer/input.schema.json').properties.artInput.properties.directorInput.properties.strategyInput.properties.assignment]
];
for(const [stage,schema] of schemas)test(stage+' accepts the canonical focus type without allowing unknown fields',async()=>{
 const assignment=(await fixture.inputExample()).assignment;
 for(const focusType of ['brand','product','collection']){
  const input={...assignment,focusType},before=structuredClone(input);
  assert.deepEqual(check(schema,input),[],focusType);assert.deepEqual(input,before);
 }
 assert.ok(check(schema,{...assignment,focusType:'invented'}).length);
 assert.ok(check(schema,{...assignment,focusType:'brand',unrecognised:true}).length);
 assert.deepEqual(check(schema,assignment),[],'legacy inputs remain valid');
});
