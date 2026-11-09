'use strict';
// Regression (8 Nov 2026 test brief D4): "keep the copy short and readable on a phone" made the
// WhatsApp visual require an exact phone number. Contact details are inferred only when the
// brief actually asks for them.
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../public/creative-ai/studio-model.js');
const mode=(brief,feature=14)=>{const d=M.startDraft('brand-test','quick',feature);d.brief=brief;return M.assetValues(d.outputs[0],d).contactMode;};

test('mentioning a phone screen does not ask for a phone number',()=>{
 for(const brief of ['Keep the copy short and readable on a phone.','Design it to look great on phones and tablets.','Phone-first layout, big type.','Address the renter\'s worry about a hard mattress.'])assert.equal(mode(brief),'None',brief);
});
test('asking for contact details still adds them',()=>{
 for(const brief of ['Add our phone number so people can call.','Include contact details for the Indiranagar store.','Show the customer care number.','Call us on our toll-free helpline.','Put the store address at the bottom.'])assert.equal(mode(brief),'Contact details',brief);
 assert.equal(mode('Add a QR code and our phone number.'),'QR + contact');
});
