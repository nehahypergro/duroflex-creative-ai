'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const strategy=require('../../lib/creative-ai/marketing-strategist');
const {inputExample,outputExample}=require('../../lib/creative-ai/marketing-strategist/examples/synthetic');
async function fixture(){const input=await inputExample(),output=outputExample();input.facts.push({id:'unused-brand-proposal',kind:'brand',text:'An unrelated proposed portfolio is not adopted.',status:'conflicted',essential:true,sourceIds:['site']});output.unusedBrandFacts=[{factId:'unused-brand-proposal',reason:'The assignment communicates an existing product, not a new portfolio.',avoidance:'Do not name or depict the unadopted portfolio.'}];return {input,output};}
test('unrelated brand conflict can be explicitly excluded without approving its truth',async()=>{const {input,output}=await fixture(),before=JSON.stringify(input);assert.deepEqual(strategy.validateOutput(output,input).hardErrors,[]);assert.equal(JSON.stringify(input),before);assert.ok(!strategy.analyzeInput(input).eligibleFacts.some(f=>f.id==='unused-brand-proposal'));});
for(const kind of ['product','offer','destination','customer','campaign'])test('cannot waive essential '+kind+' evidence',async()=>{const {input,output}=await fixture();input.facts.at(-1).kind=kind;assert.equal(strategy.validateOutput(output,input).ok,false);});
test('positioning and explicit guardian requirements cannot be waived',async()=>{for(const mode of ['positioning','requirement']){const {input,output}=await fixture();if(mode==='positioning')input.guardian.establishedPositioningFactIds.push('unused-brand-proposal');else input.guardian.requirements.push({id:'needs-proposal',text:'Use the proposed portfolio.',sourceIds:['site']});assert.equal(strategy.validateOutput(output,input).ok,false);}});
test('excluded brand fact cannot be cited as proof',async()=>{const {input,output}=await fixture();output.brief.primaryProposition.factIds.push('unused-brand-proposal');assert.equal(strategy.validateOutput(output,input).ok,false);});
test('absence of scope decision keeps legacy conflict blocked',async()=>{const {input,output}=await fixture();delete output.unusedBrandFacts;assert.equal(strategy.validateOutput(output,input).ok,false);});
test('unknown duplicate and empty scope decisions reject',async()=>{for(const mode of ['unknown','duplicate','empty']){const {input,output}=await fixture();if(mode==='unknown')output.unusedBrandFacts[0].factId='invented';if(mode==='duplicate')output.unusedBrandFacts.push({...output.unusedBrandFacts[0]});if(mode==='empty')output.unusedBrandFacts[0].avoidance='';assert.equal(strategy.validateOutput(output,input).ok,false);}});
test('explicit conflict records remain blocking',async()=>{const {input,output}=await fixture();input.conflicts.push({id:'conflict',description:'Required unresolved identity.',factIds:['unused-brand-proposal'],requirementIds:[],essential:true});assert.equal(strategy.validateOutput(output,input).ok,false);});
test('all downstream embedded strategy contracts accept the scoped dependency record',()=>{
 const expected=strategy.outputSchema.properties.unusedBrandFacts;let found=0;
 for(const name of ['creative-director','art-director','graphic-designer']){
  const walk=s=>{if(!s||typeof s!=='object')return;if(s.$id===strategy.outputSchema.$id){found++;assert.deepEqual(s.properties.unusedBrandFacts,expected,name);}for(const v of Object.values(s))walk(v);};
  walk(require('../../lib/creative-ai/'+name+'/input.schema.json'));
 }
 assert.equal(found,3);
});
