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
