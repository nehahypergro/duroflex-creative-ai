'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
for(const {routes,active} of [{routes:['continuity']},{routes:['continuity','exploration']},{routes:['continuity','exploration'],active:['continuity']}])test(routes.join('+')+(active?' operation '+active.join('+'):'')+': actual specialist context respects selected scope without imposing an extra concept',async()=>{
 const cd=require('../../lib/creative-ai/creative-director'),art=require('../../lib/creative-ai/art-director'),gf=require('../../lib/creative-ai/graphic-designer/examples/synthetic');
 const input=await gf.inputExample(),a=input.artInput;a.directorInput.conceptRoutes=routes;
 assert.doesNotMatch(cd.assembleContext(a.directorInput).messages[0].content,/into exactly TWO distinct executable conceptual expressions/);
 const {handoff,...core}=a.directorOutput;core.concepts=core.concepts.filter(c=>routes.includes(c.route));a.directorOutput=cd.finalizeOutput(core,a.directorInput);
 const ids=new Set(core.concepts.map(c=>c.conceptId));a.copy=a.copy.filter(c=>ids.has(c.conceptId));if(active){a.activeConceptIds=core.concepts.filter(c=>active.includes(c.route)).map(c=>c.conceptId);a.copy=a.copy.filter(c=>a.activeConceptIds.includes(c.conceptId));}
 const ctx=await art.assembleContext(a),guidance=ctx.messages[0].content+'\n'+JSON.stringify(ctx.placements);
 assert.doesNotMatch(guidance,/EVERY selected placement for BOTH|Keep both concepts in the blocked output|Develop both layouts|Develop exactly two feasible concepts/);
 assert.match(ctx.messages[0].content,/selected concept/i);
 assert.doesNotMatch(require('../../lib/creative-ai/copywriter').instructions,/copy for BOTH concepts/);
 assert.equal(ctx.input.directorOutput.concepts.length,routes.length);
 const fixtureContext={...ctx,input:{...ctx.input,directorOutput:{...ctx.input.directorOutput,concepts:ctx.input.directorOutput.concepts.filter(c=>!active||active.includes(c.route))}}};
 const out=art.finalizeOutput(require('../../lib/creative-ai/art-director/examples/synthetic').coreExample(fixtureContext),ctx);
 assert.deepEqual(new Set(out.specifications.map(s=>s.route)),new Set(active||routes));
});

for(const routes of [['continuity'],['exploration'],['continuity','exploration']])test('actual concept wire binds instructions and schema to '+routes.join('+'),async()=>{
 const cd=require('../../lib/creative-ai/creative-director'),input=(await require('../../lib/creative-ai/graphic-designer/examples/synthetic').inputExample()).artInput.directorInput;input.conceptRoutes=routes;
 const request={instructions:cd.assembleContext(input).messages[0].content,input:{context:input},schema:require('../../lib/creative-ai/concept-selection').schemaFor(cd.coreOutputSchema,input)};
 const wire=require('../../lib/creative-ai/runtime/decision-wire').concepts(request,input);
 assert.deepEqual(Object.keys(wire.schema.properties.concepts.properties),routes);
 assert.deepEqual(wire.schema.properties.concepts.required,routes);
 assert.deepEqual(wire.input.outputUnits.map(u=>u.route),routes);
 assert.match(wire.instructions,/Produce one internal card for each selected route/);
 if(routes.length===1){assert(wire.instructions.includes('Develop only the selected '+routes[0]+' concept.'));assert.doesNotMatch(wire.instructions,/Produce the two|SINGLE-OPTION OVERRIDE|Ignore paired-direction|Develop continuity first|Refine both|Both routes proceed|Develop a continuity concept using/);}
 else assert.match(wire.instructions,/Develop continuity first, then its contrasting exploration/);
});
