'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {format}=require('../../lib/creative-ai/experiments/lean-planner/formats');
for(const id of ['retail-google','retail-banner','retail-screen','window','standee','wobbler','shelf-talker','counter-card','wall','poster','flyer','leaflet','bifold','trifold','dangler'])test('Retail format resolves full guidance: '+id,()=>{const f=format(id);assert.ok(f.guidance.treatment.length);assert.ok(f.pages.length);assert.ok(f.requestedDimensions.width>0);});
test('Physical retail presets retain mounting and fold requirements',()=>{assert.equal(format('dangler').print.keepoutTopMm,20);assert.equal(format('standee').print.keepoutBottomMm,150);assert.equal(format('trifold').print.fold,'letter');assert.deepEqual(format('trifold').print.panelWidthsMm,[97,100,100]);assert.equal(format('leaflet').pages[1].name,'Face 2 · back');assert.equal(format('bifold').pages[1].name,'Face 2 · inside');});
