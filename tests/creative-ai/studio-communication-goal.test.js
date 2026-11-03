'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
const make=brief=>Object.assign(M.startDraft('brand-a','quick',1),{intakeVersion:2,brief});
test('Get To By extracts explicit audience, response and message without requiring a purchase',()=>{
 const d=make('Get new homeowners to consider Airboost by highlighting its reversible topper.');M.applyBriefAutofill(d);
 assert.equal(d.audience,'new homeowners');assert.equal(d.message,'GET — new homeowners\nTO — consider Airboost\nBY — highlighting its reversible topper');
 const a=make('Get families to feel excited about Diwali by showcasing the sofa.');M.applyBriefAutofill(a);assert.match(a.message,/TO — feel excited about Diwali/);assert.doesNotMatch(a.message,/buy|purchase/i);
});
test('ordinary brief phrasing fills the communication summary and leaves unknown parts absent',()=>{
 const d=make('Create an Instagram post for new homeowners to consider Airboost by highlighting its reversible topper.');M.applyBriefAutofill(d);assert.match(d.message,/GET — new homeowners/);assert.match(d.message,/TO — consider Airboost/);assert.match(d.message,/BY — highlighting its reversible topper/);
 const p=make('Make an instagram carousel for the rhapsody sofa focusing the Diwali excitement');M.applyBriefAutofill(p);assert.equal(p.message,'TO — feel excited about Diwali');assert.equal(p.audience,'');
 const unknown=make('Make a blue square post');M.applyBriefAutofill(unknown);assert.equal(unknown.message,'');
});
test('manual corrections survive new text, serialization and undo',()=>{
 const d=make('Get families to consider the sofa by highlighting its finish');M.applyBriefAutofill(d);d.message='My approved communication goal';M.protectBriefField(d,'message');const saved=JSON.parse(JSON.stringify(d));saved.brief='Get students to explore the product by highlighting its compact size';M.applyBriefAutofill(saved);assert.equal(saved.message,'My approved communication goal');M.undoBriefAutofill(saved);assert.equal(saved.message,'My approved communication goal');
});
test('removed source retracts autofilled summaries; conflicting and negated directions are not guessed',()=>{
 const d=make('Get families to explore the sofa by highlighting its finish');M.applyBriefAutofill(d);d.brief='Make a square post';M.applyBriefAutofill(d);assert.equal(d.message,'');
 const conflict=make('Get: families; Get: students; To: explore the sofa; By: highlight its finish');const p=M.briefAutofillCandidates(conflict);assert.equal(p.fields.message,undefined);assert.ok(p.ambiguous.includes('message'));
 const negative=make('Do not get students to buy the sofa by claiming guaranteed health benefits');M.applyBriefAutofill(negative);assert.equal(negative.message,'');
});
test('uploaded brief and typed correction combine by framework part, retaining exact qualifiers',()=>{
 const d=make('By: Highlight the finish, on selected variants only');d.briefDocuments=[{id:'doc',text:'Audience: new homeowners\nDesired response: consider the sofa\nKey message: Highlight its size'}];M.applyBriefAutofill(d);assert.equal(d.message,'GET — new homeowners\nTO — consider the sofa\nBY — Highlight the finish, on selected variants only');assert.equal(M.fieldProvenance(d,'message').label,'From brief & document');
 const confirmed=M.confirmRequirements(d);assert.equal(confirmed.requirements.message,d.message);d.message+=' amended';assert.equal(M.confirmationCurrent(d),false);
});
test('labelled non-English content is preserved without translation or fabricated audience',()=>{
 const d=make('To: दिवाली का उत्साह\nBy: उपलब्ध रंगों को दिखाना');M.applyBriefAutofill(d);assert.equal(d.message,'TO — दिवाली का उत्साह\nBY — उपलब्ध रंगों को दिखाना');assert.equal(d.audience,'');
});
