'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const art=require('../../lib/creative-ai/art-director'),graphic=require('../../lib/creative-ai/graphic-designer');
const fixture=require('../../lib/creative-ai/art-director/examples/synthetic');
async function input(){
 const value=await fixture.inputExample();
 value.directorInput.strategyInput.assignment.formats.push({...value.directorInput.strategyInput.assignment.formats[0],id:'second-format'});
 value.directorInput.strategy.brief.channelFormatImplications.push({...structuredClone(value.directorInput.strategy.brief.channelFormatImplications[0]),formatId:'second-format'});
 value.directorOutput=require('../../lib/creative-ai/creative-director/examples/synthetic').outputExample(value.directorInput);
 return value;
}
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': streaming one placement can reconcile and build both route packages without claiming the full assignment',async()=>{
 const artInput=await input();
 await assert.rejects(()=>art.assembleContext(artInput,{includeMessages:false}),/Every selected format needs a placement/);
 const ctx=await art.assembleContext(artInput,{includeMessages:false,allowPartialPlacements:true});
 const artOutput=art.finalizeOutput(fixture.coreExample(ctx),ctx);
 const jobs=artOutput.specifications.map(s=>({conceptId:s.conceptId,placementId:s.placementId,canvas:{width:200,height:200,sourceStatus:'verified-primary',ruleIds:['google-upload-small-square']},outputFormat:'png',productAssetRequired:false,logoAssetRequired:false,fontStatus:'not-required',displayContext:'Synthetic scope check',conflicts:[]}));
 const payload={version:1,artInput,artOutput,jobs};
 await assert.rejects(()=>graphic.assembleContext(payload,{includeMessages:false}),/Every selected format needs a placement/);
 const context=await graphic.assembleContext(payload,{includeMessages:false,allowPartialPlacements:true});
 const packages=graphic.buildGenerationPackages(context);
 assert.equal(packages.records.length,2);
 assert.equal(artInput.directorInput.strategyInput.assignment.formats.length,2);
 const bad=structuredClone(payload);bad.artInput.placements[0].formatId='unselected';
 await assert.rejects(()=>graphic.assembleContext(bad,{includeMessages:false,allowPartialPlacements:true}),/outside selected assignment/);
});
