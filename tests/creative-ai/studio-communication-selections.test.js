'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
function fixture(brandId='duroflex'){
 const product={id:brandId+'-product',brandId,name:'Fixture product',features:['Support on selected variants only.','Removable cover.']};
 const d=Object.assign(M.startDraft(brandId,'quick',1),{intakeVersion:2,productId:product.id,productName:product.name,rtbProductId:product.id});
 return {d,product,context:{products:[product,{...product,id:'foreign',brandId:'other',features:['Foreign claim']}]}};
}
for(const brandId of ['duroflex','sleepyhead'])test(brandId+': selections fill and update Get / To / By with exact qualified features',()=>{
 const {d,product,context}=fixture(brandId);d.audience='Families';M.protectBriefField(d,'audience');d.objective='Consideration';M.protectBriefField(d,'objective');d.selectedRtbs=[product.features[0]];
 M.applyBriefAutofill(d,context);assert.deepEqual(M.communicationParts(d.message),{get:'Families',to:'consider the product',by:'highlighting Support on selected variants only.'});
 d.audience='Students';d.objective='Education';d.selectedRtbs=[product.features[1]];M.applyBriefAutofill(d,context);
 assert.deepEqual(M.communicationParts(d.message),{get:'Students',to:'learn about the product',by:'highlighting Removable cover.'});
 d.audience='';d.objective='';d.selectedRtbs=[];M.applyBriefAutofill(d,context);assert.equal(d.message,'');
});
test('manual goal parts, including blanks, survive source updates, serialization and undo independently',()=>{
 const {d,product,context}=fixture();d.brief='Get families to feel excited by highlighting the collection';M.applyBriefAutofill(d,context);
 d.message=M.communicationText({...M.communicationParts(d.message),get:'My audience',by:''});M.protectBriefField(d,'message:get');M.protectBriefField(d,'message:by');
 const saved=JSON.parse(JSON.stringify(d));saved.brief='Get students to explore the collection by highlighting its range';M.applyBriefAutofill(saved,context);
 assert.deepEqual(M.communicationParts(saved.message),{get:'My audience',to:'explore the collection'});
 M.undoBriefAutofill(saved,context);assert.deepEqual(M.communicationParts(saved.message),{get:'My audience'});assert.deepEqual(M.applyBriefAutofill(saved,context),[]);
 saved.objective='Consideration';M.protectBriefField(saved,'objective');saved.brief='';saved.selectedRtbs=[product.features[0]];M.applyBriefAutofill(saved,context);
 assert.deepEqual(M.communicationParts(saved.message),{get:'My audience',to:'consider the product'});
});
test('explicit brief goals take priority over objective defaults and unselected facts never fill By',()=>{
 const {d,context}=fixture();M.applyBriefAutofill(d,context);assert.equal(d.message,'');
 d.brief='To: feel excited about Diwali';d.objective='Purchase';M.protectBriefField(d,'objective');M.applyBriefAutofill(d,context);assert.deepEqual(M.communicationParts(d.message),{to:'feel excited about Diwali'});
 d.brief='';d.productId='foreign';d.rtbProductId='foreign';d.selectedRtbs=['Foreign claim'];M.applyBriefAutofill(d,context);assert.equal(M.communicationParts(d.message).by,undefined);
 d.rtbs='Supplied comfort statement; terms apply.';M.protectBriefField(d,'rtbs');M.applyBriefAutofill(d,context);assert.equal(M.communicationParts(d.message).by,'highlighting Supplied comfort statement; terms apply.');
});
test('legacy whole-message ownership migrates without locking independent goal edits',()=>{
 const {d,context}=fixture();const message='GET — families\nTO — explore the range';d.brief='Get families to explore the range by highlighting choice';d.message=message;
 d.briefAutofill={version:1,enabled:true,manual:{},owned:{message:{value:message,before:'',label:'Communication goal',evidence:'old brief'}}};
 M.applyBriefAutofill(d,context);M.protectBriefField(d,'message:get');d.message=M.communicationText({...M.communicationParts(d.message),get:'Couples'});d.brief='Get students to learn about the range by highlighting choice';M.applyBriefAutofill(d,context);
 assert.deepEqual(M.communicationParts(d.message),{get:'Couples',to:'learn about the range',by:'highlighting choice'});
});
test('explicit objective and selected features can resume after undo without changing brief text',()=>{
 const {d,product,context}=fixture();d.audience='Families';M.protectBriefField(d,'audience');M.applyBriefAutofill(d,context);M.undoBriefAutofill(d,context);assert.equal(d.message,'');M.applyBriefAutofill(d,context);assert.equal(d.message,'');
 d.objective='Consideration';M.protectBriefField(d,'objective');d.selectedRtbs=[product.features[0]];M.applyBriefAutofill(d,context);assert.match(d.message,/TO — consider the product/);assert.match(d.message,/selected variants only/);
});
test('clearing a manually selected audience does not restore the old audience from the brief',()=>{
 const {d,context}=fixture();d.brief='Get families to explore the range by highlighting choice';M.applyBriefAutofill(d,context);
 d.audience='';M.protectBriefField(d,'audience');M.applyBriefAutofill(d,context);assert.equal(M.communicationParts(d.message).get,undefined);
});
