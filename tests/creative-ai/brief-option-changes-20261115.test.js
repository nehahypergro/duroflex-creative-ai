'use strict';
// Brief-page option changes (15 Nov 2026 readiness matrix, scripts/creative-ai/qa-card-readiness-matrix.js).
// Symptoms on the hosted Studio, both brands: changing a card option produced "Choose a connected
// static recipe and its exact supported dimensions" at the readiness check, or silently kept the
// old size. Provider-free model checks; generationProfile is the readiness check's size gate.
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../public/creative-ai/studio-model');
const brands=['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'];
const draft=(b,card)=>{const d=M.startAssetDraft(b,[card]);return {d,o:d.outputs[0]};};

test('changing a retail format applies the new format, not the old size',()=>{for(const b of brands){
 // Before: window -> in-store screen had no size (readiness failed); window -> standee kept the 500 x 700 mm window poster.
 let {d,o}=draft(b,'window-artwork');M.applyStaticChange(o,d,'retailPreset','screen');
 assert.equal(M.generationProfile(d)?.placementId,'custom:retail-screen-1920x1080');
 ({d,o}=draft(b,'window-artwork'));M.applyStaticChange(o,d,'retailPreset','standee');
 assert.equal(M.generationProfile(d)?.placementId,'custom:studio-print-standee');assert.deepEqual([o.staticValues.physicalWidth,o.staticValues.physicalHeight],['850','2000']);
 ({d,o}=draft(b,'in-store-screen'));M.applyStaticChange(o,d,'retailPreset','poster');assert.match(M.generationProfile(d)?.placementId,/studio-print-poster/);
 // A paper size chosen inside the same format is still honoured.
 ({d,o}=draft(b,'standee'));M.applyStaticChange(o,d,'printPreset','custom:studio-print-flyer-a4');
 assert.equal(M.generationProfile(d)?.placementId,'custom:studio-print-flyer-a4');
}});

test('changing the unit keeps the same physical size',()=>{for(const b of brands){
 // Before: 850 x 2000 mm became 850 x 2000 cm (a 20 m standee) and readiness failed.
 const {d,o}=draft(b,'standee');
 M.applyStaticChange(o,d,'unit','cm');assert.deepEqual([o.staticValues.physicalWidth,o.staticValues.physicalHeight],['85','200']);assert.ok(M.generationProfile(d));
 M.applyStaticChange(o,d,'unit','in');assert.deepEqual([o.staticValues.physicalWidth,o.staticValues.physicalHeight],['33.46','78.74']);assert.ok(M.generationProfile(d));
 M.applyStaticChange(o,d,'unit','cm');assert.deepEqual([o.staticValues.physicalWidth,o.staticValues.physicalHeight],['85','200']);
}});

test('card-fixed choices are not offered, and choosing RCS gives an RCS image shape',()=>{for(const b of brands){
 // Before: Platform = Instagram on a Google Display set, and Website asset = Banner on a category tile, failed readiness.
 for(const [card,key] of [['google-display-banners','platform'],['category-tile','websiteType'],['collection-card','websiteType']]){
  const {d,o}=draft(b,card);assert.ok(!M.staticRecipeForOutput(o,d).fields.some(f=>f[0]===key),card+' offers '+key);assert.equal(M.applyStaticChange(o,d,key,'Instagram'),false);assert.ok(M.generationProfile(d),card);}
 // Other ad cards keep their Platform choice.
 {const {d,o}=draft(b,'instagram-feed-ad');assert.ok(M.staticRecipeForOutput(o,d).fields.some(f=>f[0]==='platform'));}
 // Before: WhatsApp image -> RCS left no image shape until one was picked by hand.
 const {d,o}=draft(b,'whatsapp-image');M.applyStaticChange(o,d,'channel','RCS');
 assert.equal(o.staticValues.rcsPreset,'Single card · medium image');assert.match(M.generationProfile(d)?.placementId,/^custom:rcs-image-single-medium/);
}});

test('a ready print or store card does not offer planning-only formats',()=>{for(const b of brands){
 // Before: Format = Dealer / Partner Toolkit, Store / City / Language Versions or GT / COCO Catalogue on a ready card failed readiness.
 const planning=M.retailEntries.filter(e=>e.planningOnly).map(e=>e.key);assert.deepEqual(planning,['partner','store-versions','catalogue']);
 for(const card of ['window-artwork','standee','poster-flyer','in-store-screen','store-banner','google-business-post']){const {d,o}=draft(b,card);
  const options=M.staticRecipeForOutput(o,d).fields.find(f=>f[0]==='retailPreset')[3];assert.ok(planning.every(k=>!options.includes(k)),card);assert.ok(options.includes('poster'),card);}
}});

test('landing page hero answers the branded-header question like the other own-website banners',()=>{
 // Before: "Current image only" failed readiness with "Confirm whether this placement has a visibly branded host/header".
 for(const id of ['website-banner','mobile-banner','landing-page-hero'])assert.equal(M.assetCard(id).preset.staticValues.brandedHost,'Yes',id);
});
