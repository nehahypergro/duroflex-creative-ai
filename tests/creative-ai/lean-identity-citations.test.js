'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validateCitations}=require('../../lib/creative-ai/experiments/lean-planner/planning');
const product={id:'product-1',name:'Airboost 6.8 Arctic Ice',variant:{id:'51476984692868',name:'Queen / 78 x 60 (198 cm x 152 cm) / 8 (20.3 cm)',options:['Queen','78 x 60 (198 cm x 152 cm)','8 (20.3 cm)']},facts:[{id:'sku-fact-6'}]};
const check=(text,id='51476984692868')=>validateCitations([{role:'variant',text,factIds:[id]}],product);
test('saved brochure identity and specification citations validate',()=>{check('Airboost 6.8\nArctic Ice');check('Queen • 78 × 60 inches • 8 inches thick');check('Airboost 6.8 Arctic Ice\nQueen\n78 × 60 inches (198 × 152 cm)\n8 inches (20.3 cm) thick');});
// Regression (job creative-df75eb60, 8 Nov 2026): planning failed with "Product identity
// citation does not support copy: supporting line" because words backed by a separately
// cited fact (sku-fact-5) were checked only against the product name.
const kiki={id:'product-46d23fc74c967de88555',name:'Sofa Kiki - 3 Seater Sofa (Fabric, Sapling Green)',variant:{id:'52400345645240',name:'Default Title',options:[]},facts:[{id:'sku-fact-2',text:'The selected page displays Sapling Green / 3 Seater.'},{id:'sku-fact-5',text:'The product information lists high-density foam and describes the comfort level as medium firm.'}]};
test('product-name wording combined with a separately cited fact validates',()=>{
 assert.doesNotThrow(()=>validateCitations([{text:'3 Seater. Sapling Green. High density foam.',factIds:['product-46d23fc74c967de88555','sku-fact-5'],role:'supporting line'}],kiki));
 assert.doesNotThrow(()=>validateCitations([{text:'Explore Sofa Kiki',factIds:['product-46d23fc74c967de88555'],role:'CTA'}],kiki));
});
test('words backed by neither the product name nor a cited fact stay blocked',()=>{
 assert.throws(()=>validateCitations([{text:'3 Seater. High density foam. Lasts forever.',factIds:['product-46d23fc74c967de88555','sku-fact-5'],role:'supporting line'}],kiki),/does not support/);
 assert.throws(()=>validateCitations([{text:'3 Seater. High density foam.',factIds:['product-46d23fc74c967de88555'],role:'supporting line'}],kiki),/does not support/,'the fact must actually be cited');
 assert.throws(()=>validateCitations([{text:'3 Seater. High density foam.',factIds:['product-46d23fc74c967de88555','sku-fact-2'],role:'supporting line'}],kiki),/does not support/,'a cited fact supports only its own words');
});
// Regressions (8 Nov 2026 test batch): creative-103a9856 rejected the CTA "Learn about Sense
// Ortho Ultra." and then a LinkedIn caption that is not rendered on the artwork;
// creative-ebee4b7f rejected a Tamil-script product name the check cannot read.
const ortho={id:'product-c59347f7ba8d81723530',name:'Sense Ortho Ultra Mattress - Ivory White',variant:{id:'52531740278968',name:'Queen / 72 x 60 (183 cm x 152 cm) / 8 (20.3cm)',options:[]},facts:[{id:'sku-fact-3',text:'Cool-to-touch knitted fabric.'},{id:'sku-fact-6',text:'Orthopedic base for alignment and support.'}]};
test('plain call-to-action verbs are not product claims',()=>{
 for(const text of ['Learn about Sense Ortho Ultra.','Learn more about Sense Ortho Ultra','See Sense Ortho Ultra','Try Sense Ortho Ultra','Buy Sense Ortho Ultra','Know more about Sense Ortho Ultra'])assert.doesNotThrow(()=>validateCitations([{text,factIds:['product-c59347f7ba8d81723530'],role:'embedded-cta'}],ortho),text);
 assert.throws(()=>validateCitations([{text:'Learn about Sense Ortho Ultra, the best mattress',factIds:['product-c59347f7ba8d81723530'],role:'cta'}],ortho),/does not support/);
});
test('captions that are not rendered on the artwork are not word-checked against the product name',()=>{
 assert.doesNotThrow(()=>validateCitations([{text:'Long desk day? Meet your night shift. Sense Ortho Ultra has an orthopedic base and a cool-to-touch knit.',factIds:['product-c59347f7ba8d81723530','sku-fact-6','sku-fact-3'],role:'native-caption-only; do not render on artwork'}],ortho));
 assert.throws(()=>validateCitations([{text:'Long desk day? Meet your night shift.',factIds:['unknown-fact'],role:'native caption'}],ortho),/Unknown product fact citation/,'citations must still be real');
});
test('a product name written in another script asks for the original spelling',()=>{
 const bamboo={id:'product-2c0c7ed2573c5a07e952',name:'Bamboo Terry Waterproof Mattress Protector, (72 x 60 inches, Queen Size, White).',variant:{id:'52455660454072',name:'Default Title',options:[]},facts:[]};
 assert.throws(()=>validateCitations([{text:'பாம்பூ டெர்ரி • குயீன் • வெள்ளை',factIds:['product-2c0c7ed2573c5a07e952'],role:'product-name'}],bamboo),/original spelling/);
 assert.doesNotThrow(()=>validateCitations([{text:'Bamboo Terry • Queen • White',factIds:['product-2c0c7ed2573c5a07e952'],role:'product-name'}],bamboo));
 assert.match(require('../../lib/creative-ai/lean/planning').instructions,/original spelling/);
});
test('foreign identity, altered dimensions and unsupported benefits remain blocked',()=>{assert.throws(()=>check('Queen','another-variant'),/Unknown/);assert.throws(()=>check('Queen 72 x 60 inches'),/does not support/);assert.throws(()=>check('Airboost cures back pain'),/does not support/);});
// Regression (8 Nov 2026, planner comparison on saved Hindi/Kannada packets): the round-2
// "original spelling" rule rejected EVERY non-Latin character in a product-cited line, so
// mixed copy such as "Cove सोफ़ा देखें" or "… Protector ಖರೀದಿಸಿ" failed for every model.
// A few local-language words are allowed when the name is kept in its supplied spelling;
// a transliterated name or a longer local-language claim is still rejected.
test('local-language words beside the product name in its original spelling are accepted',()=>{
 const cove={id:'product-cove',name:'Cove Simply Taupe Leatherette + Feather Brown Fabric 1 Seater Sofa',variant:{id:'v1',name:'Default Title',options:[]},facts:[]};
 const duroSafe={id:'product-durosafe',name:'Duro Safe - Waterproof Mattress Protector',variant:{id:'v2',name:'Queen',options:[]},facts:[]};
 assert.doesNotThrow(()=>validateCitations([{text:'Cove सोफ़ा देखें',factIds:['product-cove'],role:'CTA'}],cove));
 assert.doesNotThrow(()=>validateCitations([{text:'Duro Safe - Waterproof Mattress Protector ಖರೀದಿಸಿ',factIds:['product-durosafe'],role:'cta'}],duroSafe));
 assert.doesNotThrow(()=>validateCitations([{text:'Duro Safe Queen',factIds:['product-durosafe'],role:'product-name'}],duroSafe));
 // Still rejected: the name only in another script, unsupported English words, or a long local claim.
 assert.throws(()=>validateCitations([{text:'கோவ் சோபா',factIds:['product-cove'],role:'product-name'}],cove),/original spelling/);
 assert.throws(()=>validateCitations([{text:'Cove सोफ़ा, the best sofa',factIds:['product-cove'],role:'supporting line'}],cove),/does not support/);
 assert.throws(()=>validateCitations([{text:'Cove सोफ़ा जो आपकी कमर दर्द को हमेशा के लिए ठीक करे',factIds:['product-cove'],role:'supporting line'}],cove),/separate copy block|original spelling/);
});
test('local-language lines that also cite their facts, and messages sent beside the image, are accepted',()=>{
 const cove={id:'product-cove',name:'Cove Brushed Nickel Grey Leatherette + Pumice Stone Grey Fabric 3 Seater Sofa + Lounger',variant:{id:'v1',name:'Default Title',options:[]},facts:[{id:'sku-fact-4',text:'Dual-tone finish.'},{id:'sku-fact-5',text:'Bouncy zig-zag springs.'}]};
 assert.doesNotThrow(()=>validateCitations([{text:'ड्यूल-टोन फ़िनिश और बाउंसी ज़िग-ज़ैग स्प्रिंग्स वाला Cove सोफ़ा',factIds:['product-cove','sku-fact-4','sku-fact-5'],role:'body'}],cove));
 assert.doesNotThrow(()=>validateCitations([{text:'Cove Brushed Nickel Grey Leatherette + Pumice Stone Grey Fabric 3 Seater Sofa + Lounger देखें: https://www.duroflexworld.com/',factIds:['product-cove'],role:'CTA — accompanying WhatsApp message only, not embedded'}],cove));
 assert.throws(()=>validateCitations([{text:'Cove सोफ़ा जो आपकी कमर दर्द को हमेशा के लिए ठीक करे',factIds:['product-cove'],role:'body'}],cove),/separate copy block/,'a long local claim citing only the name stays blocked');
});

// Live run 9 Nov 2026 (A+ Premium, Posture Perfect): "Queen variant" citing the variant ID failed the
// whole plan because "variant" is not in the official name. Plain label words beside the official
// size name are allowed; claims still need fact citations and unknown words still fail.
const planning920=require('../../lib/creative-ai/lean/planning');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': plain size/variant label words may sit beside the official variant name',()=>{
 const product={id:'p1',name:brand+' Posture Perfect Mattress',variant:{id:'v1',name:'Queen / 72 x 60 (183 cm x 152 cm) / 8 (20.3 cm)',options:[]},facts:[]};
 for(const text of ['Queen variant','Queen size','Size: Queen','Queen 72 x 60 size'])assert.doesNotThrow(()=>planning920.validateCitations([{role:'variant label',text,factIds:['v1']}],product),text);
 assert.throws(()=>planning920.validateCitations([{role:'variant label',text:'Queen bestseller',factIds:['v1']}],product),/does not support copy/);
});
// Live A+ retry, 9 Nov 2026 (job creative-d5ab6c1e): the backup planner cited the official product picture
// "sku-product-image-2" as the source of the headline "5 Zone Dual Density Layer", and the whole plan was
// rejected as "Unknown product fact citation". A picture is not a written fact and cannot back wording here:
// the picture ID is dropped from the citation (recorded), the wording stays for the visual review, and a
// genuinely unknown fact ID still fails. Both brands share this check.
for(const [brand,product,fact,words] of [['Duroflex',{id:'product-dfb69ef80bb5fad29770',name:'Posture Perfect Pocket Spring Orthopedic Mattress',variant:{id:'1',name:'Queen',options:[]},facts:[{id:'sku-fact-4',text:'Our Proprietary Dual Density Layer helps maintain the natural curves of the body.'}]},'sku-fact-4','Dual Density Layer'],['Sleepyhead',ortho,'sku-fact-3','Cool-to-touch knitted fabric']])
 test(brand+': an official picture cited as a fact is dropped, not a plan failure',()=>{
  const copy=[{role:'headline',text:'5 Zone Dual Density Layer',factIds:['sku-product-image-2']},{role:'support',text:words,factIds:[fact,'technology-image']}];
  assert.doesNotThrow(()=>validateCitations(copy,product));
  assert.deepEqual(copy[0].factIds,[]);assert.deepEqual(copy[0].droppedCitations,['sku-product-image-2']);
  assert.deepEqual(copy[1].factIds,[fact]);
  assert.throws(()=>validateCitations([{role:'headline',text:'Lasts forever',factIds:['sku-fact-99']}],product),/Unknown product fact citation: sku-fact-99/);
 });
// Live run, 10 Nov 2026 (Duroflex Quboid infographic, creative-f09ae10b): the plan labelled layers with the
// words printed on the official technology picture ("Cool gel memory foam", "3 Zone Copper Infused NRG Layer")
// and was rejected because no written fact contained them. New jobs (plan rules v1) read the picture's printed
// words with the local text reader and add them as a citable fact, so real layer names can be cited and checked.
const pictureFact=require('../../lib/creative-ai/runtime/technology-visual').pictureTextFact;
for(const [brand,rows] of [['Duroflex',['Cool gel','memory foam','3 Zone Copper','Infused NRG Layer','PU foam layer','Jacquard woven','fabric','12345']],['Sleepyhead',['BodyIQ','memory foam','Support foam','Knitted fabric']]])test(brand+': words printed on the official technology picture become a citable fact',()=>{
 const fact=pictureFact(rows.map(text=>({text,confidence:0.9})));
 assert.equal(fact.id,'technology-picture-text');assert.match(fact.text,/^Words printed on the official technology picture:/);assert.doesNotMatch(fact.text,/12345/,'number-only text is ignored');
 const product={id:'p',name:brand+' Mattress',variant:null,facts:[fact]};
 const label=brand==='Duroflex'?'Cool gel\nmemory foam':'BodyIQ\nmemory foam';
 assert.doesNotThrow(()=>validateCitations([{role:'construction label',text:label,factIds:['technology-picture-text']}],product));
 assert.equal(pictureFact([]),null);assert.equal(pictureFact([{text:'ab',confidence:0.1}]),null,'low-confidence reads are ignored');
});
