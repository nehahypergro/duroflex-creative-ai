'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {extract}=require('../../lib/creative-ai/runtime/product-feature-list'),{cleanText}=require('../../lib/creative-ai/runtime/research'),M=require('../../public/creative-ai/studio-model');
test('explicit feature lists retain each full item, qualifiers and escaping; unrelated lists are excluded',()=>{
 const html='<script><h3>Features</h3><ul><li>Invented</li></ul></script><div>Features <span>+</span></div><div><ul><li>7.5 inch support. Only in this variant.</li><li>Soft &amp; breathable</li></ul></div><h3>Benefits</h3><ul><li>Not a feature selection</li></ul>';
 assert.deepEqual(extract(html,cleanText),['7.5 inch support. Only in this variant.','Soft & breathable']);
 assert.deepEqual(extract('<h3>Features</h3><h3>Related products</h3><ul><li>Other SKU</li></ul>',cleanText),[]);
});
test('both saved brand sources supply separate checklist items without rewriting history',()=>{
 for(const [brand,match] of [['brand-1923d633-e03e-44cc-84b2-bbfb5c152710',/Octave/],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de',/Napster/]]){
 const base=path.resolve('output/creative-ai/brands',brand,'products'),p=fs.readdirSync(base).map(id=>{try{return JSON.parse(fs.readFileSync(path.join(base,id,'profile.json')))}catch{return null}}).find(p=>p&&match.test(p.name));assert.ok(p);
 const html=fs.readFileSync(path.join(base,p.id,p.snapshot,'page.html'),'utf8'),features=extract(html,cleanText);assert.ok(features.length>=4,p.name);const d={focus:'product',productId:p.id,rtbProductId:p.id,selectedRtbs:[features.join(' ')]};
 // Older flattened selections map to the same complete source list.
 const enriched={...p,features,contentSections:[{heading:'Features',text:features.join(' ')}]};assert.deepEqual(M.productRtbs(enriched),features);assert.deepEqual(M.selectedProductRtbs(d,enriched),features);
 assert.ok(features.every(v=>cleanText(html).includes(v)));
 }
});
test('catalog enriches features only from the matching snapshot hash and leaves the saved profile untouched',async()=>{
 const fsp=require('node:fs/promises'),os=require('node:os'),crypto=require('node:crypto'),{ProductLibrary}=require('../../lib/creative-ai/runtime/product-library');const root=await fsp.mkdtemp(path.join(os.tmpdir(),'rtb-catalog-'));
 try{for(const brandId of ['brand-duroflex','brand-sleepyhead']){const id='product-12345678901234567890',snapshot='snapshot-test',html='<h3>Features</h3><ul><li>Firm support, for this variant only.</li></ul>',base=path.join(root,brandId,'products',id);await fsp.mkdir(path.join(base,snapshot),{recursive:true});const p={brandId,id,snapshot,name:'Product',description:'Source',pageUrl:'https://example.com/products/a',pageHash:crypto.createHash('sha256').update(html).digest('hex'),variants:[],assets:[]},bytes=JSON.stringify(p);await fsp.writeFile(path.join(base,'profile.json'),bytes);await fsp.writeFile(path.join(base,snapshot,'page.html'),html);const lib=new ProductLibrary({dir:id=>path.join(root,id),read:async id=>({id})});assert.deepEqual((await lib.catalog(brandId,id)).features,['Firm support, for this variant only.']);assert.equal(await fsp.readFile(path.join(base,'profile.json'),'utf8'),bytes);await fsp.writeFile(path.join(base,snapshot,'page.html'),html+'changed');assert.equal((await lib.catalog(brandId,id)).features,undefined);}}
 finally{await fsp.rm(root,{recursive:true,force:true});}
});

// Live test (17 Nov 2026): the Duroflex Airboost pages have no Features list. Their benefits are short headings in a
// "Why airboost?" section, so the product saved no features and the brief page showed no RTBs. Failing before.
const airboost='<section class="shopify-section airboost-benefits"><div id="benefits"><div class="section-title"><h2 class="title center">Why airboost?</h2></div><div class="media-wrapper"><div class="video-media"><video></video><h3 class="heading">1 Lakh+ Airknit Fibres</h3></div><div class="video-media"><h3 class="heading">3X Breathability</h3></div><div class="video-media"><h3 class="heading">5-Zone support</h3></div></div></div></section><section><h3>Customer Reviews</h3></section>';
test('a "Why <product>?" section gives its short headings word for word when there is no Features list',()=>{
 assert.deepEqual(extract(airboost,cleanText),['1 Lakh+ Airknit Fibres','3X Breathability','5-Zone support']);
 assert.deepEqual(extract('<h3>Features</h3><ul><li>Listed feature</li></ul>'+airboost,cleanText),['Listed feature'],'an explicit Features list still wins');
 assert.deepEqual(extract('<section><h2>Why us?</h2><h3>Is it firm?</h3><h3>How do I return it?</h3></section>',cleanText),[],'questions are not features');
 assert.deepEqual(extract('<section><h2>Why airboost?</h2><h3>Only one</h3></section>',cleanText),[],'one heading is not a list');
});
for(const [brandId,brandName] of [['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','Duroflex'],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','Sleepyhead']])test(brandName+': a product saved with no features before this reading is re-read from its saved page and gets RTBs',async t=>{
 const os=require('node:os'),crypto=require('node:crypto'),fsp=require('node:fs/promises'),{ProductLibrary}=require('../../lib/creative-ai/runtime/product-library');
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'feature-reread-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
 const brands={dir:id=>path.join(root,id),read:async id=>{if(id!==brandId)throw Error('Unknown brand');return {id,name:brandName,brandUrl:'https://brand.example/'};}},library=new ProductLibrary(brands);
 const id='product-'+'a'.repeat(20),dir=path.join(library.dir(brandId),id),html='<html><body><main>'+airboost+'</main></body></html>';await fsp.mkdir(path.join(dir,'snapshot-a'),{recursive:true});await fsp.writeFile(path.join(dir,'snapshot-a','page.html'),html);
 const profile={version:1,id,brandId,brandName,name:'Airboost Test Mattress',pageUrl:'https://brand.example/products/airboost',snapshot:'snapshot-a',pageHash:crypto.createHash('sha256').update(html).digest('hex'),catalogVersion:2,features:[],specificationFields:[],variants:[],assets:[]};
 await fsp.writeFile(path.join(dir,'profile.json'),JSON.stringify(profile));
 const p=await library.catalog(brandId,id);assert.deepEqual(p.features,['1 Lakh+ Airknit Fibres','3X Breathability','5-Zone support']);
 const d=M.startAssetDraft(brandId,['instagram-post']);M.selectBriefProduct(d,p,'');assert.equal(M.selectedProductRtbs(d,p).length,3);
 assert.deepEqual(JSON.parse(await fsp.readFile(path.join(dir,'profile.json'),'utf8')).features,[],'the saved profile itself is not rewritten');
 await fsp.writeFile(path.join(dir,'snapshot-a','page.html'),html+'<!-- changed -->');assert.deepEqual((await library.catalog(brandId,id)).features,[],'a changed saved page is not trusted');
});
