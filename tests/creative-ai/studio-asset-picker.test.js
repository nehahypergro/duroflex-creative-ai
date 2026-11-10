'use strict';
// Asset picker stage 1 (docs/asset-picker-spec-20261108.json). Provider-free model checks
// against both brands' saved product libraries, read only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../../public/creative-ai/studio-model');
const spec=require('../../docs/asset-picker-spec-20261108.json');
const root=path.resolve(__dirname,'../..');
const brands=['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'];
function savedProduct(brandId){const dir=path.join(root,'output/creative-ai/brands',brandId,'products');for(const id of fs.readdirSync(dir).sort()){try{const p=JSON.parse(fs.readFileSync(path.join(dir,id,'profile.json'),'utf8'));if(p.brandId===brandId&&p.variants?.length)return p;}catch{/* unreadable profiles are skipped */}}throw Error('No saved product for '+brandId);}
function withProduct(d,p){return Object.assign(d,{focus:'product',productId:p.id,productName:p.name,variant:String(p.variants[0].id)});}

test('every spec card exists once with its exact name, division, size label, order and channel',()=>{
 const expected=spec.divisions.flatMap(d=>d.cards.map(c=>({...c,division:d.name})));
 assert.equal(M.assetCatalogue.length,77);assert.equal(expected.length,77);
 assert.deepEqual(M.assetCatalogue.map(c=>[c.name,c.division,c.sizeLabel,c.channel,c.publishing||null]),expected.map(c=>[c.name,c.division,c.size,c.channel,c.publishing||null]));
 assert.deepEqual(M.assetDivisions.map(d=>d.name),spec.divisions.map(d=>d.name));
 assert.equal(new Set(M.assetCatalogue.map(c=>c.id)).size,77,'stable unique ids');
 assert.ok(M.assetCatalogue.every(c=>/^[a-z0-9-]+$/.test(c.id)&&['ready','soon','plan'].includes(c.status)));
 assert.deepEqual(M.assetCatalogue.filter(c=>c.status==='plan').map(c=>c.name),expected.filter(c=>c.planningOnly).map(c=>c.name));
 assert.deepEqual(M.messageTypes,spec.messageTypes);
 for(const name of spec.removedOnRequest)assert.ok(!M.assetCatalogue.some(c=>c.name===name),name+' stays removed');
 assert.ok(M.assetCatalogue.filter(c=>c.publishing==='Paid'&&c.status==='ready').every(c=>c.preset.staticValues?.publishing==='Paid'),'paid cards set publishing Paid');
});

test('every ready card reaches an existing generation profile with a real saved product for both brands',()=>{
 // Tool cards (Web Push Icon, 10 Nov 2026) open their own tool instead of a generation request.
 const ready=M.assetCatalogue.filter(c=>c.status==='ready'&&!c.preset.tool);assert.ok(ready.length>=40);
 for(const brandId of brands){const p=savedProduct(brandId);
  for(const c of ready){const d=withProduct(M.startAssetDraft(brandId,[c.id]),p),profile=M.generationProfile(d);
   assert.ok(profile,c.id+' generates for '+brandId);assert.equal(d.creationMode,'quick');assert.equal(d.outputs[0].assetCardId,c.id);assert.equal(d.outputs[0].assetChannel,c.channel);assert.equal(d.outputs[0].planningOnly,undefined);
   assert.deepEqual(Object.keys(M.validate({...d,brief:'x'})),[],c.id+' validates');}
 }
 const id=card=>M.generationProfile(withProduct(M.startAssetDraft(brands[0],[card]),savedProduct(brands[0]))).placementId;
 assert.equal(id('instagram-story'),'custom:studio-social-story');assert.equal(id('facebook-story'),'custom:studio-social-story');
 assert.equal(id('facebook-post'),'custom:studio-social-square');assert.equal(id('instagram-feed-ad'),'custom:studio-social-portrait');
 assert.equal(id('website-banner'),'custom:studio-web-banner');assert.equal(id('whatsapp-status'),'custom:studio-whatsapp-status');
 assert.equal(id('google-pmax-set'),'custom:studio-pmax-landscape');assert.equal(id('product-page-images'),'custom:studio-pdp-pack');
});

test('coming-soon and planning cards never produce a generation request, even on older engines',()=>{
 const p=savedProduct(brands[1]);
 for(const c of M.assetCatalogue.filter(c=>c.status!=='ready')){
  const d=withProduct(M.startAssetDraft(brands[1],[c.id]),p);assert.equal(d.outputs[0].planningOnly,true,c.id);
  assert.equal(M.generationProfile(d),null,c.id);assert.equal(M.campaignGenerationSupported(d),false,c.id);
  const legacy=M.clone(d);delete legacy.outputs[0].planningOnly;assert.equal(M.generationProfile(legacy),null,c.id+' stays unrouted without the planning flag');
 }
 const mixed=withProduct(M.startAssetDraft(brands[1],['instagram-post','hiring-post']),p);
 assert.equal(mixed.creationMode,'campaign');assert.equal(M.campaignGenerationSupported(mixed),true);
 assert.deepEqual(mixed.outputs.map(o=>!!M.generationProfile({...mixed,outputs:[o]})),[true,false]);
});

test('message type is single-select, reaches the brief text and Offer turns on the existing promotion fields',()=>{
 const p=savedProduct(brands[0]),d=withProduct(M.startAssetDraft(brands[0],['instagram-post','website-banner']),p);d.brief='Launch';d.name='Campaign';d.intakeVersion=2;
 assert.doesNotMatch(M.intakeContext(d,p),/Message type/);
 M.applyMessageType(d,'Offer / price / EMI');assert.equal(d.messageType,'Offer / price / EMI');
 assert.match(M.intakeContext(d,p),/^Message type: Offer \/ price \/ EMI$/m);
 for(const o of d.outputs){assert.equal(M.assetValues(o,d).promotionMode,'Yes');for(const k of ['offer','offerSku','offerStart','offerEnd','terms'])assert.ok(M.requiredAssetFields(o,d).includes(k),k);assert.ok(M.staticRecipeForOutput(o,d).fields.some(f=>f[0]==='offer'));}
 const errors=M.validateBrief(d,{products:[p],purpose:'review'});assert.ok(d.outputs.every(o=>errors['static-'+o.id+'-offer']),'offer wording is required');
 M.applyMessageType(d,'Technology');assert.equal(d.messageType,'Technology');assert.match(M.intakeContext(d,p),/Message type: Technology/);
 assert.ok(d.outputs.every(o=>o.staticValues?.promotionMode===undefined),'offer-only promotion is restored');assert.equal(d.messageTypePromotion,undefined);
 M.applyMessageType(d,'Technology');assert.equal(d.messageType,undefined,'choosing again clears');
 // A user's own promotion choice survives message-type changes.
 d.outputs[0].staticValues.promotionMode='Yes';M.applyMessageType(d,'Offer / price / EMI');M.applyMessageType(d,'Benefit');assert.equal(d.outputs[0].staticValues.promotionMode,'Yes');
 assert.throws(()=>M.applyMessageType(d,'Discount'));
 assert.ok(M.validateBrief({...d,messageType:'Discount'},{products:[p],purpose:'review'}).messageType);
});

test('platform notes surface existing logo rules without changing them',()=>{
 const note=id=>M.assetPlatformNote(M.assetCardOutput(id));
 assert.match(note('instagram-story'),/Organic stories leave out the added corner logo/);
 assert.match(note('instagram-story-ad'),/keep the approved logo/);
 assert.match(note('website-banner'),/Own-website banners leave out the added corner logo/);
 assert.match(note('mobile-banner'),/Own-website banners/);
 assert.equal(note('instagram-post'),'');assert.equal(note('hiring-post'),'');
 assert.deepEqual(M.assetPlatformNotes(['instagram-story','facebook-story'].map(id=>M.assetCardOutput(id))).length,1);
});

test('old featureId drafts keep validating, stay confirmed and resolve the same profiles',()=>{
 const p=savedProduct(brands[0]);
 const expected={1:'custom:studio-social-square',3:'custom:recipe-offer-creative-1080x1080',4:'custom:recipe-proof-claim-1080x1080',2:'custom:recipe-technology-visual-1080x1080',7:'custom:studio-web-banner',8:'custom:studio-social-story',9:'custom:studio-carousel-square',13:'custom:studio-linkedin-post',14:'custom:studio-whatsapp-card'};
 for(const [featureId,placementId] of Object.entries(expected)){const d=withProduct(M.startDraft(brands[0],'quick',Number(featureId)),p);d.brief='Legacy brief';
  assert.equal(M.generationProfile(d)?.placementId,placementId,'feature '+featureId);assert.equal(d.outputs[0].assetCardId,undefined);
  d.intakeVersion=2;M.confirmRequirements(d);const before=JSON.stringify(d);
  assert.equal(M.confirmationCurrent(JSON.parse(before)),true);assert.equal(M.validateBrief(d,{products:[p],purpose:'review'}).messageType,undefined);
  assert.ok(!('messageType' in d.confirmedBrief.requirements));assert.doesNotMatch(M.intakeContext(d,p),/Message type/);assert.equal(JSON.stringify(d),before,'reading never mutates a saved draft');}
 // Older presets: PMax, LinkedIn carousel, retail and the existing platform values.
 const pmax=withProduct(M.startDraft(brands[0],'quick',1),p);pmax.outputs[0].staticValues={platform:'PMax',imageRatios:'Landscape + square'};assert.deepEqual(M.generationProfile(pmax).placementIds,['custom:studio-pmax-landscape','custom:studio-pmax-square']);
 const linkedin=withProduct(M.startDraft(brands[0],'quick',9),p);linkedin.outputs[0].staticValues={platform:'LinkedIn',narrativeType:'Story'};assert.equal(M.generationProfile(linkedin).placementId,'custom:studio-linkedin-carousel-square');
 const social=withProduct(M.startDraft(brands[0],'quick',1),p);social.outputs[0].staticValues={platform:'Instagram / Facebook'};assert.equal(M.generationProfile(social).placementId,'custom:studio-social-square');
 assert.ok(M.staticRecipe(1).fields[0][3].includes('Instagram / Facebook')&&M.staticRecipe(9).fields[0][3].includes('Instagram / Facebook'));
 const retail=withProduct(M.startDraft(brands[0],'quick',10),p);M.applyRetailPreset(retail.outputs[0],'store');assert.equal(M.generationProfile(retail).placementId,'custom:retail-store-1080x1080');
 assert.equal(M.toolFormats('social').length,4,'old catalogue data remains for saved bookmarks');
});

test('brand switching keeps the picker tab without carrying other routes',()=>{
 assert.equal(M.navigation.brandRoute('tools/assets?from=home&group=ads&mode=campaign'),'tools/assets?group=ads&mode=campaign&from=home');
 assert.equal(M.navigation.brandRoute('tools/assets?from=brief/draft-1&group=social'),'tools/assets?group=social');
});
