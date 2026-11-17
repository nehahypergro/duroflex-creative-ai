'use strict';
// Regressions from the live Sleepyhead test batch (17 Nov 2026). Failing before; no paid calls.
//  1. Memory Foam Topper (Facebook story): "Images must be embedded PNG/JPEG data URLs under 6MB". The protected SKU
//     picture is the full website photo saved as PNG; a 3000 x 3000 photo exceeds the research limit. (The 17 Nov
//     product-page fix covered only the product-page copies.)
//  2. Sofa Bubbles Instagram story: "Get ultra-plush seating with Sofa Bubbles" (six words) counted as seven.
//  3. Napster Mini Mattress carousel: "Meet the Napster Mini Mattress" failed on "meet" and "the" after every repair.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path'),crypto=require('crypto'),sharp=require('sharp');
const {BrandStore}=require('../../lib/creative-ai/runtime/brands'),{hash}=require('../../lib/creative-ai/runtime/product-identity'),embedded=require('../../lib/brand-dossier/embedded-image');

async function store(t,{brandName,source}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'identity-size-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const brands=new BrandStore(root),brandId='brand-'+brandName.toLowerCase(),pageUrl='https://'+brandName.toLowerCase()+'.test/products/topper',productId='product-'+hash(pageUrl).slice(0,20),base=path.join(brands.products.dir(brandId),productId);
 await fs.mkdir(brands.dir(brandId),{recursive:true});await fs.writeFile(path.join(brands.dir(brandId),'brand.json'),JSON.stringify({id:brandId,name:brandName,brandUrl:'https://'+brandName.toLowerCase()+'.test/',documents:[],assets:[],defaults:{}}));
 await fs.mkdir(path.join(base,'snapshot-a/product-images'),{recursive:true});await fs.writeFile(path.join(base,'snapshot-a/product-images/source.jpg'),source);
 const product={id:productId,brandId,brandName,name:'Memory Foam Topper',pageUrl,snapshot:'snapshot-a',collectedAt:'2026-11-15',variants:[{id:'v1',sku:'TOPPER-1',name:'Queen'}],assets:[{id:'media-1234567890abcdef',group:'product-images',type:'image',status:'stored',file:'snapshot-a/product-images/source.jpg',url:'https://'+brandName.toLowerCase()+'.test/files/topper.jpg',sha256:hash(source)}]};
 await fs.writeFile(path.join(base,'profile.json'),JSON.stringify(product));
 const s=brands.products.identities;s.trustWebsite=true;return {s,brandId,productId,product};
}
// A busy photo whose PNG does not compress: like the topper's 3000 x 3000 website photo, its PNG data URL is over the limit.
const noisyJpeg=size=>sharp(crypto.randomBytes(size*size*3),{raw:{width:size,height:size,channels:3}}).jpeg({quality:92}).toBuffer();

for(const brandName of ['Duroflex','Sleepyhead']){
 test(brandName+': a large website photo still gives a protected SKU picture that fits the research',async t=>{
  const f=await store(t,{brandName,source:await noisyJpeg(1800)});
  const prepared=await f.s.prepare({brandId:f.brandId,productPageUrl:f.product.pageUrl,productVariantId:'v1'});
  assert.ok(embedded.valid(prepared.imageData),'data URL length '+prepared.imageData.length);
  const bytes=Buffer.from(prepared.imageData.split(',')[1],'base64');assert.equal(hash(bytes),prepared.reference.rasterHash);
  const m=await sharp(bytes).metadata();assert.equal(prepared.reference.width,m.width);assert.ok(m.width<1800);
 });
}
test('a website photo that already fits keeps its full size',async t=>{
 const f=await store(t,{brandName:'Sleepyhead',source:await sharp({create:{width:900,height:700,channels:3,background:'#556677'}}).jpeg().toBuffer()});
 const prepared=await f.s.prepare({brandId:f.brandId,productPageUrl:f.product.pageUrl,productVariantId:'v1'});assert.equal(prepared.reference.width,900);assert.equal(prepared.reference.height,700);
});
test('an oversized saved identity is replaced once, then the fitted one is reused',async t=>{
 const f=await store(t,{brandName:'Sleepyhead',source:await noisyJpeg(1800)});
 const pi=require('../../lib/creative-ai/runtime/product-identity'),saved=pi.fitsDossier;
 // Save an identity the old way (full size), as the hosted Studio has for the topper.
 const first=await f.s.prepare({brandId:f.brandId,productPageUrl:f.product.pageUrl,productVariantId:'v1'});
 const dir=path.join(f.s.dir(f.brandId,f.productId),first.id),big=await sharp(await fs.readFile(path.join(dir,'original'))).ensureAlpha().png().toBuffer();
 assert.equal(saved(big),false);
 const identity=JSON.parse(await fs.readFile(path.join(dir,'identity.json'),'utf8'));const {profileHash,...body}=identity;body.reference={...body.reference,rasterHash:hash(big),width:1800,height:1800};const rewritten={...body,profileHash:hash(JSON.stringify(body))};
 await fs.writeFile(path.join(dir,'reference.png'),big);await fs.writeFile(path.join(dir,'identity.json'),JSON.stringify(rewritten,null,2)+'\n');
 const second=await f.s.prepare({brandId:f.brandId,productPageUrl:f.product.pageUrl,productVariantId:'v1'});
 assert.notEqual(second.id,first.id);assert.ok(embedded.valid(second.imageData));
 const third=await f.s.prepare({brandId:f.brandId,productPageUrl:f.product.pageUrl,productVariantId:'v1'});assert.equal(third.id,second.id);
 assert.equal((await f.s.list(f.brandId,f.productId)).length,2,'the old identity is kept, not deleted');
});

test('a hyphenated story headline word counts once; long headlines still fail',()=>{
 const cc=require('../../lib/creative-ai/lean/channel-craft'),story={channelCraft:{version:1,storyPages:['story'],heroPages:[],print:false}},plan=text=>({pages:[{id:'story',copy:[{role:'headline',text}]}]});
 for(const text of ['Get ultra-plush seating with Sofa Bubbles','Don’t skip the comfy corner'])assert.doesNotThrow(()=>cc.validate(plan(text),story),text);
 assert.throws(()=>cc.validate(plan('Get ultra-plush seating with the Sofa Bubbles'),story),/six words or fewer/);
});

test('a product-name line may say "Meet the ..."; claim words still need a cited fact',()=>{
 const planning=require('../../lib/creative-ai/lean/planning'),product={id:'p1',name:'Napster Mini Mattress',variant:{id:'v1',name:'Single'},facts:[{id:'f1',text:'Compact foam mattress for small rooms'}]};
 assert.doesNotThrow(()=>planning.validateCitations([{role:'product introduction',text:'Meet the Napster Mini Mattress',factIds:['p1']}],product));
 assert.doesNotThrow(()=>planning.validateCitations([{role:'product name',text:'The Napster Mini Mattress, for small rooms',factIds:['p1','f1']}],product));
 assert.throws(()=>planning.validateCitations([{role:'product introduction',text:'Meet the coolest Napster Mini Mattress',factIds:['p1']}],product),/words not in the product name or its cited facts: coolest/);
 assert.throws(()=>planning.validateCitations([{role:'supporting line',text:'Napster Mini Mattress relieves back pain',factIds:['p1']}],product),/relieves, back, pain/);
});
