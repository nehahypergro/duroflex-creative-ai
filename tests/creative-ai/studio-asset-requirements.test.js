'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': responsive website and email produce two exact delivery slots',()=>{
  for(const id of [7,14]){const d=M.startDraft(brand,'quick',id),o=d.outputs[0];if(id===14)M.applyEmailPreset(o,'Email hero');
   o.staticValues={...o.staticValues,responsiveMode:'Desktop + mobile',mobileWidth:'600',mobileHeight:'800'};
   const p=M.generationProfile(d);assert.equal(p.unitCount,2);assert.equal(M.units(d),2);assert.deepEqual(p.customProfiles.map(x=>x.canvas),[{width:o.width,height:o.height,unit:'px'},{width:600,height:800,unit:'px'}]);
   const resolved=require('../../lib/creative-ai/runtime/placements').resolve(p);assert.equal(resolved.selections.length,2);
   o.staticValues.mobileWidth='';assert.equal(M.generationProfile(d),null);
  }
 });
 test(brand+': consequential questions stay conditional, shared and exact',()=>{
  const d=M.startDraft(brand,'quick',7),o=d.outputs[0];d.intakeVersion=2;d.brief='Create a festival offer banner with a QR code.';
  const keys=M.staticRecipeForOutput(o,d).fields.map(f=>f[0]);assert.ok(keys.includes('offerSku'));assert.ok(keys.includes('qrDestination'));assert.ok(M.requiredAssetFields(o,d).includes('offer'));
  o.staticValues={...o.staticValues,promotionMode:'No',contactMode:'None'};assert.ok(!M.requiredAssetFields(o,d).includes('offer'));assert.ok(!M.staticRecipeForOutput(o,d).fields.some(f=>f[0]==='qrDestination'));
  const p=M.output(5);assert.ok(M.requiredAssetFields(p,d).includes('pdpDestination'));p.staticValues={pdpDestination:'Other marketplace',templateMode:'Attached reference',templateReferenceId:'missing'};
  d.outputs=[p];assert.ok(M.validateBrief(d,{purpose:'review'})['static-'+p.id+'-templateReferenceId']);
 });
 test(brand+': template assumptions and exact Amazon slots are visible',()=>{
  const o=M.output(11);M.applyRetailPreset(o,'brochure');assert.match(M.assetRequirementSummary(o).join(' '),/2 flat faces/);assert.match(M.assetRequirementSummary(o).join(' '),/assumptions/i);
  const a=M.output(6);M.applyAmazonPreset(a,'Amazon Brand Story');const summary=M.assetRequirementSummary(a).join(' ');assert.match(summary,/Desktop background.*1464/);assert.match(summary,/Mobile background.*463/);
 });
}
test('imported requirements surface without overwriting explicit choices or upgrading old briefs',()=>{
 const d=M.startDraft('Duroflex','quick',7),o=d.outputs[0];d.intakeVersion=2;d.briefDocuments=[{text:'Create a promotional banner with QR code.'}];assert.equal(M.assetValues(o,d).promotionMode,'Yes');assert.equal(M.assetValues(o,d).contactMode,'QR code');
 d.brief='No offers and no QR code.';assert.equal(M.assetValues(o,d).promotionMode,'No');assert.equal(M.assetValues(o,d).contactMode,'None');
 o.staticValues={promotionMode:'No',contactMode:'None'};d.brief='Offer with QR code';assert.equal(M.assetValues(o,d).promotionMode,'No');assert.equal(M.assetValues(o,d).contactMode,'None');
 const legacy=M.startDraft('Sleepyhead','quick',5);assert.ok(!M.requiredAssetFields(legacy.outputs[0],legacy).includes('pdpDestination'));legacy.intakeVersion=2;assert.ok(M.requiredAssetFields(legacy.outputs[0],legacy).includes('pdpDestination'));
});
