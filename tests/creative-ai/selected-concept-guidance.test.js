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
