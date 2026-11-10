'use strict';
// User request, 10 Nov 2026: "lets please have these usable and not coming soon": the Coming soon cards
// whose format playbook was already written and linked to a real size or preset. Each one must now
// start a real generation request for both brands, reach its own format playbook, and keep its
// special rules (white-background main image, no invented partner logo). Multi-category Module and
// Catalogue need several products in one design, which the engine does not support yet, so they stay
// unavailable. Provider-free: no paid request is made.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../../public/creative-ai/studio-model');
const playbooks=require('../../lib/creative-ai/treatment-knowledge/format-playbooks');
const root=path.resolve(__dirname,'../..');
const brands=['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'];
function savedProduct(brandId){const dir=path.join(root,'output/creative-ai/brands',brandId,'products');for(const id of fs.readdirSync(dir).sort()){try{const p=JSON.parse(fs.readFileSync(path.join(dir,id,'profile.json'),'utf8'));if(p.brandId===brandId&&p.variants?.length)return p;}catch{/* unreadable profiles are skipped */}}throw Error('No saved product for '+brandId);}
function withProduct(d,p){return Object.assign(d,{focus:'product',productId:p.id,productName:p.name,variant:String(p.variants[0].id)});}
const expected={
 'collection-card':{ids:['custom:studio-commerce-collection'],size:[1600,900],packs:['website-module']},
 'landing-page-modules':{ids:['custom:client-landing-module-01','custom:client-landing-module-02','custom:client-landing-module-03'],size:[1600,900],packs:['website-module','website-module','website-module'],family:'landing-page-modules'},
 'marketplace-product-images':{ids:['custom:recipe-marketplace-main-01',...[2,3,4,5,6].map(n=>'custom:recipe-product-image-0'+n)],size:[1600,1600],packs:['marketplace-main','product-gallery','product-gallery','product-gallery','product-gallery','product-gallery'],family:'marketplace-product-images'},
 'listing-feature-cards':{ids:[1,2,3].map(n=>'custom:recipe-listing-feature-0'+n),size:[1600,1600],packs:['product-gallery','product-gallery','product-gallery'],family:'listing-feature-cards'},
 'email-product-block':{ids:['custom:client-email-image-1200x800'],size:[1200,800],packs:['email']},
 'blog-link-preview':{ids:['custom:recipe-editorial-cover-1200x630'],size:[1200,630],packs:['editorial-cover']},
 'infographic':{ids:['custom:studio-marketing-infographic'],size:[1080,1920],packs:['infographic']},
 'sales-one-pager':{ids:['custom:studio-sales-one-pager'],size:[1240,1754],packs:['sales-training']}
};
for(const brandId of brands)test(brandId.slice(-6)+': the written-strategy cards are ready and reach their own format playbook',()=>{
 const p=savedProduct(brandId),library=playbooks.load();
 for(const [id,want] of Object.entries(expected)){
  const card=M.assetCard(id);assert.equal(card.status,'ready',id+' is usable');
  const d=withProduct(M.startAssetDraft(brandId,[id]),p),profile=M.generationProfile(d);
  assert.ok(profile,id+' starts a generation request');assert.equal(d.outputs[0].planningOnly,undefined,id);
  assert.deepEqual(profile.placementIds||[profile.placementId],want.ids,id+' placements');
  assert.deepEqual([profile.width,profile.height],want.size,id+' size');
  assert.deepEqual(Object.keys(M.validate({...d,brief:'x'})),[],id+' validates');
  want.ids.forEach((pid,i)=>{const custom=(profile.customProfiles||[]).find(c=>c.id===pid);
   const selection={id:pid,pin:{profileId:pid},description:{formatId:pid,name:custom?.name||pid}};
   assert.deepEqual(playbooks.select(library,selection).map(x=>x.id),[want.packs[i]],pid+' format playbook');
   if(want.family)assert.equal(profile.jobInputs[pid].formatIntent.familyId,want.family,pid+' is planned with its set');});
 }
});
test('the marketplace main image is a clean white-background product picture; gallery images may carry words',()=>{
 const p=savedProduct(brands[0]),profile=M.generationProfile(withProduct(M.startAssetDraft(brands[0],['marketplace-product-images']),p));
 const main=profile.jobInputs['custom:recipe-marketplace-main-01'].formatIntent;
 assert.equal(main.textPolicy,'none');assert.match(main.direction,/pure white background/i);assert.match(main.direction,/no text/i);
 assert.notEqual(profile.jobInputs['custom:recipe-product-image-04'].formatIntent.textPolicy,'none');
 assert.equal(profile.omitLogo,true,'marketplace images carry no logo by default');
});
// Live run, 10 Nov 2026: the server refuses partner generation without a verified attached partner asset, and
// the Studio has no partner-logo upload yet, so Co-branded Post stays Coming soon (the partner-logo guard stays).
test('Co-branded Post stays unavailable until a partner logo can be attached',()=>{
 assert.notEqual(M.assetCard('co-branded-post').status,'ready');
 const d=withProduct(M.startAssetDraft(brands[0],['co-branded-post']),savedProduct(brands[0]));d.outputs[0].planningOnly=undefined;delete d.outputs[0].planningOnly;
 assert.equal(M.generationProfile(M.startAssetDraft(brands[0],['co-branded-post'])),null);
});
test('Web Push Icon opens the existing icon tool; multi-product cards stay unavailable',()=>{
 const icon=M.assetCard('web-push-icon');assert.equal(icon.status,'ready');assert.equal(icon.preset.tool,'push-icons');
 for(const id of ['multi-category-module','catalogue'])assert.notEqual(M.assetCard(id).status,'ready',id+' needs several products');
});
// Live run, 10 Nov 2026 (Sleepyhead Sense Ortho Ultra, Marketplace Product Images, creative-787391e8): the six
// images were planned one by one because the set's per-image inputs never reached the job, so the main image
// lost its "pure white, no words" rule and planning failed with "Empty copy". The set's inputs now travel with
// the request (one plan for the set), and the lifestyle/detail images may carry no words.
for(const brandId of brands)test(brandId.slice(-6)+': coordinated sets send their per-image inputs with the request',()=>{
 const gen=require('../../lib/creative-ai/runtime/studio-generation'),p=savedProduct(brandId);
 for(const id of ['landing-page-modules','marketplace-product-images','listing-feature-cards']){
  const profile=M.generationProfile(withProduct(M.startAssetDraft(brandId,[id]),p)),req=gen.assetSetRequest(profile);
  assert.deepEqual(Object.keys(req.jobInputs),profile.placementIds,id);assert.ok(Object.values(req.jobInputs).every(v=>v.formatIntent.familyId===id),id+' one family');
 }
 const market=gen.assetSetRequest(M.generationProfile(withProduct(M.startAssetDraft(brandId,['marketplace-product-images']),p))).jobInputs;
 assert.equal(market['custom:recipe-marketplace-main-01'].formatIntent.textPolicy,'none');assert.equal(market['custom:recipe-product-image-03'].formatIntent.textPolicy,'optional');
 assert.match(require('node:fs').readFileSync(require.resolve('../../lib/creative-ai/runtime/studio-generation'),'utf8'),/profile\.assetSet\?assetSetRequest\(profile\)/,'prepare() uses it');
});
