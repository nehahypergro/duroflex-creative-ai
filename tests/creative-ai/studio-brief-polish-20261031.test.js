'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
test('goal blanks retain canonical, partial and legacy communication content',()=>{
 for(const p of [{get:'Homeowners',to:'consider a sofa',by:'showing comfort'},{by:'Two lines\nwith qualifiers'},{to:'A legacy goal'},{}])assert.deepEqual(M.communicationParts(M.communicationText(p)),p);
 assert.deepEqual(M.communicationParts('Get homeowners to feel comfortable by showing support'),{get:'homeowners',to:'feel comfortable',by:'showing support'});
 assert.deepEqual(M.communicationParts('A message without framework'),{to:'A message without framework'});
});
test('new drafts remain recovery-only below 80%; established drafts keep saving',()=>{
 const d=M.startDraft('brand-a','campaign',1);assert.equal(M.draftAutosaveReady(d,null),false);
 d.focus='brand';d.brief='Introduce the brand';assert.equal(M.intakeProgress(d).percent,67);assert.equal(M.draftAutosaveReady(d,{recoveryOnly:true}),false);
 d.outputs=[M.output(1)];assert.equal(M.draftAutosaveReady(d,{recoveryOnly:true}),true);
 d.brief='';assert.equal(M.draftAutosaveReady(d,{recoveryOnly:true}),false);
 assert.equal(M.draftAutosaveReady(d,{recoveryOnly:false}),true);assert.equal(M.draftAutosaveReady(d,{revision:2}),true);
});
test('draft promotion is persistence metadata and cannot invalidate confirmed requirements',()=>{const d=M.startDraft('b','quick',1);d.recoveryOnly=true;M.confirmRequirements(d);d.recoveryOnly=false;assert.equal(M.confirmationCurrent(d),true);d.brief='Changed assignment';assert.equal(M.confirmationCurrent(d),false);});
test('manually edited goal blanks retain priority over later brief autofill',()=>{const d=M.startDraft('b','quick',1);d.intakeVersion=2;d.brief='Get homeowners to consider a sofa by showing comfort';M.applyBriefAutofill(d);assert.equal(M.communicationParts(d.message).get,'homeowners');d.message=M.communicationText({get:'Couples',to:'relax',by:'comfort'});M.protectBriefField(d,'message');d.brief='Get students to buy by showing value';M.applyBriefAutofill(d);assert.equal(M.communicationParts(d.message).get,'Couples');});
