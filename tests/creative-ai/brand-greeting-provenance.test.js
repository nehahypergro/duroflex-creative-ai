'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const strategy=require('../../lib/creative-ai/marketing-strategist');
const fixture=require('../../lib/creative-ai/marketing-strategist/examples/synthetic');
async function greeting(){
 const input=await fixture.inputExample();input.assignment.focusType='brand';
 const output=fixture.outputExample({includeStrategyChecks:true});
 output.brief.primaryProposition={text:'A warm festive wish for a home full of light.',basis:'evidence',sourceIds:['brief-source'],factIds:[]};
 output.brief.supportingClaims=[];
 output.alternatives=[{...output.alternatives[0],primaryProposition:structuredClone(output.brief.primaryProposition),proofFactIds:[]}];
 output.getWhoToBy=strategy.deriveGetWhoToBy(output.brief);
 output.strategyChecks.productFocus={text:'The supplied brand is the greeting sender.',basis:'evidence',sourceIds:['brief-source'],factIds:['positioning']};
 output.strategyChecks.proofFactIds=[];
 return {input,output};
}
test('recorded greeting failure receives actionable provenance repair, without accepting empty evidence',async()=>{
 const {input,output}=await greeting(),result=strategy.validateOutput(output,input);
 assert.equal(result.ok,false);
 assert.ok(result.hardErrors.some(e=>e.includes('Evidence proposition requires eligible fact references')));
 assert.ok(result.hardErrors.some(e=>e.includes('non-factual greeting')&&e.includes('inference')));
 assert.ok(result.hardErrors.some(e=>e.includes('brand identity/positioning')&&e.includes('proofFactIds')));
});
test('a sentiment with separately sourced brand fit passes without inventing product proof',async()=>{
 const {input,output}=await greeting();
 output.brief.primaryProposition.basis='inference';
 output.alternatives[0].primaryProposition=structuredClone(output.brief.primaryProposition);
 output.alternatives[0].proofFactIds=['positioning'];
 output.strategyChecks.proofFactIds=['positioning'];
 output.strategyChecks.proofLimits=['Brand positioning supports brand fit only; it does not substantiate the wish, product efficacy or audience response.'];
 output.getWhoToBy=strategy.deriveGetWhoToBy(output.brief);
 const before=structuredClone(output),result=strategy.validateOutput(output,input);
 assert.equal(result.ok,true,result.hardErrors.join('\n'));assert.deepEqual(output,before);
 for(const basis of ['evidence']){
  const bad=structuredClone(output);bad.brief.primaryProposition.basis=basis;bad.alternatives[0].primaryProposition=structuredClone(bad.brief.primaryProposition);bad.getWhoToBy=strategy.deriveGetWhoToBy(bad.brief);
  assert.ok(strategy.validateOutput(bad,input).hardErrors.some(e=>e.includes('Evidence proposition')));
 }
 output.brief.supportingClaims=[{factId:'invented-efficacy',text:'Guaranteed pain relief.',sourceIds:['brief-source']}];
 assert.ok(strategy.validateOutput(output,input).hardErrors.some(e=>e.includes('Unsupported claim invented-efficacy')));
});
