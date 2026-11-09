'use strict';
// Home-page brief box (8 Nov 2026): the server's reading becomes an ordinary draft that the
// appreciation page shows for confirmation. Unclear or missing details must stay empty so
// the existing validation keeps asking for them; nothing is confirmed automatically.
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../public/creative-ai/studio-model.js');
const brandId='brand-test';
const products=[{id:'product-aaaaaaaaaaaaaaaaaaaa',brandId,name:'Sofa Bubbles',pageUrl:'https://example.com/products/sofa-bubbles',features:['Luxury-touch fabric','Plush seat foam','Solid wood frame'],variants:[{id:'101',name:'3 Seater / Teal Blue'},{id:'102',name:'3 Seater / Grey'}]},{id:'product-bbbbbbbbbbbbbbbbbbbb',brandId:'brand-other',name:'Other brand sofa',variants:[]}];
const result=(o={})=>({assets:[{cardId:'instagram-story',source:'brief'},{cardId:'facebook-story',source:'brief'},{cardId:'whatsapp-status',source:'suggested'}],product:{productId:products[0].id,candidateIds:[],variantId:'101',evidence:''},messageType:{value:'Offer / price / EMI',source:'brief'},objective:{value:'Purchase',source:'suggested',reason:''},language:{value:'Hinglish',source:'brief'},audience:{value:'Young couples',source:'brief'},tone:{value:'Fun',source:'brief'},keyMessage:{value:'',source:'none'},features:['plush seat foam'],offer:{wording:'Flat 30% off',terms:'On selected sizes',startDate:'',endDate:'2026-11-15'},exactWording:[{text:'Flat 30% off',kind:'offer'},{text:'Sit back this Diwali',kind:'tagline'}],occasion:{value:'Diwali',source:'brief'},cta:{value:'',source:'none'},contactDetails:false,logoRequested:false,otherBrandMentioned:'',assumptions:[],questions:[],decision:'campaign',...o});
const build=(o,brief='Diwali offer on Sofa Bubbles')=>M.draftFromReading(brandId,{id:'creative-read',result:result(o)},{brief,products,today:'2026-11-08'});
const errors=d=>Object.keys(M.validateBrief(d,{purpose:'review',products}));

test('a complete reading fills a campaign draft that passes review validation',()=>{
 const d=build();
 assert.equal(d.creationMode,'campaign');assert.deepEqual(d.outputs.map(o=>o.assetCardId),['instagram-story','facebook-story','whatsapp-status']);
 assert.equal(d.productId,products[0].id);assert.equal(d.variant,'101');assert.deepEqual(d.selectedRtbs,['Plush seat foam']);
 assert.equal(d.language,'Hinglish');assert.ok(d.outputs.every(o=>o.language==='Hinglish'));
 assert.equal(d.messageType,'Offer / price / EMI');
 for(const o of d.outputs){assert.equal(o.staticValues.promotionMode,'Yes');assert.equal(o.staticValues.offer,'Flat 30% off');assert.equal(o.staticValues.offerEnd,'2026-11-15');assert.equal(o.staticValues.offerStart,'2026-11-08');assert.equal(o.staticValues.terms,'On selected sizes');assert.equal(o.staticValues.contactMode,'None');}
 assert.equal(d.mandatoryInfo,'Sit back this Diwali');assert.ok(d.briefReading.offerStartAssumed);assert.equal(d.briefReading.decision,'campaign');
 assert.deepEqual(errors(d),[]);
 assert.ok(!M.confirmationCurrent(d),'the reading never confirms the brief by itself');
});

test('one card becomes a single design',()=>{const d=build({assets:[{cardId:'instagram-story',source:'brief'}]});assert.equal(d.creationMode,'quick');assert.equal(d.outputs.length,1);});

test('an unclear variant, missing offer details and unknown products stay empty so validation asks',()=>{
 assert.ok(errors(build({product:{productId:products[0].id,candidateIds:[],variantId:'',evidence:''}})).includes('variant'));
 const noOffer=build({offer:{wording:'',terms:'',startDate:'',endDate:''}});
 assert.ok(errors(noOffer).some(k=>/-offer$/.test(k)));assert.ok(errors(noOffer).some(k=>/-offerEnd$/.test(k)));assert.ok(errors(noOffer).some(k=>/-terms$/.test(k)));
 const foreign=build({product:{productId:products[1].id,candidateIds:[],variantId:'',evidence:''}});assert.equal(foreign.productId||'','','another brand\'s product is never selected');
});

test('contact details are added only when the brief asked for them; coming-soon cards are dropped',()=>{
 assert.equal(build({contactDetails:true}).outputs[0].staticValues.contactMode,undefined);
 const d=build({assets:[{cardId:'instagram-story',source:'brief'},{cardId:'catalogue',source:'brief'}]});assert.deepEqual(d.outputs.map(o=>o.assetCardId),['instagram-story']);
});

test('a product without a saved feature list takes the brief\'s own features, or asks for them',()=>{
 const bare=[{...products[0],features:[],contentSections:[]}];
 const withFeatures=M.draftFromReading(brandId,{id:'r',result:result({features:['Cooling knit fabric']})},{brief:'x',products:bare,today:'2026-11-08'});
 assert.equal(withFeatures.rtbs,'Cooling knit fabric');assert.ok(!Object.keys(M.validateBrief(withFeatures,{purpose:'review',products:bare})).includes('selectedRtbs'));
 const none=M.draftFromReading(brandId,{id:'r',result:result({features:[]})},{brief:'x',products:bare,today:'2026-11-08'});
 assert.ok(Object.keys(M.validateBrief(none,{purpose:'review',products:bare})).includes('selectedRtbs'));
});

// 8 Nov 2026 live test: the brief said "Airboost 6.8 Arctic Ice Pro"; the official name has no
// "Pro", so planning's citation check rejected the copy and needed a paid repair call.
test('words the brief uses for the product that are not in the official name are flagged',()=>{
 const airboost={name:'Duropedic Airboost 6.8 Arctic Ice Mattress | 1 lakh+ Airknit fibres',sku:'AIRBOOST68AIPRO720060000800BLUE',variants:[{id:'1',name:'Queen / 72 x 60 (183 cm x 152 cm) / 8 (20.3 cm)'}]};
 assert.deepEqual(M.productNameCheck(airboost,'Airboost 6.8 Arctic Ice Pro'),{shortName:'Duropedic Airboost 6.8 Arctic Ice Mattress',extra:['pro'],shown:['Pro']});
 assert.deepEqual(M.productNameCheck(airboost,'Airboost 6.8 Arctic Ice mattress, Queen').extra,[]);
 assert.deepEqual(M.productNameCheck(products[0],'Sofa Bubbles in Teal Blue').extra,['teal','blue'].filter(w=>!/teal|blue/i.test(products[0].variants.map(v=>v.name).join(' '))));
 assert.deepEqual(M.productNameCheck(airboost,'Duroflex Airboost 6.8','Duroflex').extra,[],'the brand name is allowed');
});
test('the brief\'s own product wording comes from the reading, never from a free-text explanation',()=>{
 const brief='Airboost 6.8 Arctic Ice Pro for people who sleep hot.';
 assert.equal(M.readingBriefName({product:{briefName:'Airboost 6.8 Arctic Ice Pro'}},brief),'Airboost 6.8 Arctic Ice Pro');
 assert.equal(M.readingBriefName({product:{briefName:'Airboost Pro Max'}},brief),'','must appear in the brief');
 assert.equal(M.readingBriefName({product:{evidence:'“Airboost 6.8 Arctic Ice Pro” matches “Duropedic Airboost 6.8 Arctic Ice Mattress”; no variant specified.'}},brief),'Airboost 6.8 Arctic Ice Pro','older readings use the quoted brief words only');
 assert.equal(M.readingBriefName({product:{evidence:'Matched the sofa by name.'}},brief),'');
});

// User decision 8 Nov 2026: mattresses default to Queen (72 x 60 when offered) instead of asking.
test('mattresses default to Queen 72 x 60; single variants are used; other products still ask',()=>{
 const mattress={id:'product-mmmmmmmmmmmmmmmmmmmm',brandId,name:'Prana Pocket Spring Latex Mattress',category:'Mattress',features:['Pocket springs'],variants:[{id:'1',name:'Single / 72 x 30 / 8'},{id:'2',name:'Queen / 72 x 66 (183 cm x 168 cm) / 6'},{id:'3',name:'Queen / 72 x 60 (183 cm x 152 cm) / 8'},{id:'4',name:'King / 72 x 72 / 8'}]};
 assert.equal(M.defaultVariant(mattress),'3','the standard Queen 72 x 60');
 assert.equal(M.defaultVariant({...mattress,variants:mattress.variants.filter(v=>v.id!=='3')}),'2','otherwise the first Queen');
 assert.equal(M.defaultVariant({...mattress,variants:[{id:'9',name:'Single'},{id:'8',name:'Double'}]}),'','no Queen: still ask');
 assert.equal(M.defaultVariant({...mattress,category:'Accessories',name:'Duro Safe - Waterproof Mattress Protector'}),'','protectors and toppers are not mattresses');
 assert.equal(M.defaultVariant({category:'Sofas',variants:[{id:'5',name:'Default Title'}]}),'5');
 assert.equal(M.defaultVariant(products[0]),'','a sofa with two variants still asks');
 const d=M.draftFromReading(brandId,{id:'r',result:result({product:{productId:mattress.id,candidateIds:[],variantId:'',briefName:'',evidence:''},messageType:{value:'Benefit',source:'brief'}})},{brief:'x',products:[mattress],today:'2026-11-08'});
 assert.equal(d.variant,'3');assert.equal(d.briefReading.variantDefaulted,true);assert.ok(!Object.keys(M.validateBrief(d,{purpose:'review',products:[mattress]})).includes('variant'));
});

// Fallback (8 Nov 2026): when the AI read is unavailable the home box falls back to the free
// local autofill on the marketer's words; it must still find the product and never invent an offer.
test('the local fallback fills the product from the brief and invents nothing',()=>{
 const d=M.startDraft(brandId,'campaign');d.brief='Instagram story for Sofa Bubbles, playful tone.';d.intakeVersion=2;
 M.applyBriefAutofill(d,{products});
 assert.equal(d.productId,products[0].id);
 assert.ok(!(d.outputs||[]).some(o=>o.staticValues?.offer),'no offer wording is invented');
 assert.ok(!M.confirmationCurrent(d),'nothing is confirmed automatically');
});

test('projects say when the backup planning model was used, and only then',()=>{
 assert.equal(M.backupModelNote({budget:{receipts:[{model:'gpt-6.1-sol'}]}}),'');
 assert.equal(M.backupModelNote({budget:{receipts:[{fallback:{model:'gpt-6-luna',primaryModel:'gpt-6-luna',reason:'queued-too-long'}}]}}),'','a direct re-send to the same model is not labelled');
 assert.match(M.backupModelNote({budget:{receipts:[{fallback:{model:'gpt-6-luna',primaryModel:'gpt-6.1-sol',reason:'call-time-limit'}}]}}),/Backup model used: .*gpt-6-luna/);
});

// Home attach (8 Nov 2026): documents uploaded on Home are stored under a reserved draft id; the
// draft keeps that id and the documents so preflight validates the same files.
test('a brief attached on Home keeps its document and reserved draft id',()=>{
 const doc={id:'a'.repeat(64),name:'brief.pdf',sha256:'b'.repeat(64),text:'Diwali offer on Sofa Bubbles',status:'extracted'};
 const d=M.draftFromReading(brandId,{id:'r',result:result()},{brief:'',products,today:'2026-11-08',id:'draft-1234-abcd',briefDocuments:[doc]});
 assert.equal(d.id,'draft-1234-abcd');assert.deepEqual(d.briefDocuments,[doc]);assert.equal(d.brief,'');
 const plain=M.draftFromReading(brandId,{id:'r',result:result()},{brief:'x',products,today:'2026-11-08',id:'not a draft id'});assert.notEqual(plain.id,'not a draft id');assert.equal(plain.briefDocuments,undefined);
});
