'use strict';
// Regression (asset evaluation, 10 Nov 2026, job d83d3846): the brief asked for "an A4 Poster for Duroflex stores"
// but the Poster card's default A3 preset was used, so the poster was made at A3. Fix 9 (user decision): a paper
// size named in the brief chooses the matching print preset of the same kind on the read-back page, which says so;
// a later manual choice is kept and a mismatch is reported. Both brands; no paid call.
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../public/creative-ai/studio-model');
const brands=['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'];
const reading=card=>({id:'read-1',updatedAt:'2026-11-10T00:00:00.000Z',result:{assets:[{cardId:card}],objective:{value:'Awareness'},language:{value:'English'},offer:{},exactWording:[]}});
for(const brandId of brands){
 test(brandId.slice(0,14)+': "A4 poster" in the brief makes an A4 poster, and the read-back says so',()=>{
  const d=M.draftFromReading(brandId,reading('poster-flyer'),{brief:'Awareness campaign. Make an A4 Poster for our stores.'});
  const v=d.outputs[0].staticValues;assert.equal(v.printPreset,'custom:studio-print-poster-a4');assert.equal(v.physicalWidth,'210');assert.equal(v.physicalHeight,'297');
  assert.deepEqual(d.briefPaperSize.applied.map(a=>a.preset),['Poster · A4']);assert.deepEqual(M.briefSizeMismatch(d),[]);
 });
 test(brandId.slice(0,14)+': no paper size in the brief keeps the card default; a later different choice is reported, not overridden',()=>{
  const d=M.draftFromReading(brandId,reading('poster-flyer'),{brief:'Make a poster for our stores.'});
  assert.equal(d.outputs[0].staticValues.printPreset,'custom:studio-print-poster-a3');assert.equal(d.briefPaperSize,undefined);
  const e=M.draftFromReading(brandId,reading('poster-flyer'),{brief:'Make an A4 poster.'});e.outputs[0].staticValues.printPreset='custom:studio-print-poster-a2';
  assert.deepEqual(M.briefSizeMismatch(e).map(m=>[m.paper,m.chosen]),[['A4','Poster · A2']]);
 });
}
test('paper sizes are read from common brief wording, and A+ is not a paper size',()=>{
 for(const [t,want] of [['an A4 Poster','A4'],['a4 size poster','A4'],['a3-size flyer','A3'],['Make Amazon A+ content',null],['a poster',null]])assert.equal(M.briefPaperSize(t),want,t);
});
