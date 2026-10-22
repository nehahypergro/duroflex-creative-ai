'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('../../lib/creative-ai/creative-director/examples/synthetic'),cd=require('../../lib/creative-ai/creative-director'),wire=require('../../lib/creative-ai/runtime/decision-wire'),{check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
function contract(input){return wire.concepts({schema:cd.coreOutputSchema,instructions:'fixture',input:{context:input}},input).schema.properties.concepts.properties.unit0.properties.requiredAssets.items;}
test('concept handoff rejects canvas font/logo registry IDs as available raster execution inputs',()=>{
 const input=fixture.inputExample();input.strategyInput.research.assets=[{id:'sku-photo',kind:'product',imageData:'data:image/png;base64,AA=='}];
 const schema=contract(input),row={label:'Registered Poppins font',assetId:'asset-font-registry',status:'available',essential:true};
 assert.ok(check(schema,row).length,'Registry font ID must not pass the image execution inventory contract');
 assert.equal(check(schema,{...row,label:'SKU',assetId:'sku-photo'}).length,0);
});
test('missing execution assets remain representable; metadata without bytes cannot be called available',()=>{
 const input=fixture.inputExample();input.strategyInput.research.assets=[{id:'metadata-only',kind:'product'}];const schema=contract(input),row={label:'Needed photo',assetId:'metadata-only',status:'missing',essential:true};
 assert.equal(check(schema,row).length,0);assert.ok(check(schema,{...row,status:'available'}).length);
 assert.equal(check(schema,{...row,assetId:'not-yet-supplied'}).length,0);
});
test('source schemas stay unchanged and missing essential source still blocks concept readiness',()=>{
 const input=fixture.inputExample(),before=JSON.stringify(cd.coreOutputSchema);contract(input);assert.equal(JSON.stringify(cd.coreOutputSchema),before);
 const core=fixture.coreExample(input);core.concepts[0].requiredAssets.push({label:'Needed original',assetId:'unavailable-source',status:'missing',essential:true});
 assert.throws(()=>cd.finalizeOutput(core,input),/Mandatory failure cannot be marked pass/);
});
