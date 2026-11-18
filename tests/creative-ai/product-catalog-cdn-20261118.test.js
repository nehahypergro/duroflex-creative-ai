'use strict';
// Regression (18 Nov 2026, hosted Studio, Neha: "why are the skus not visible when i click on product selection"):
// the hosted copy keeps only the CDN receipt of each saved product photo (the photos are not in Git). Listing the
// products downloaded one photo per product from the CDN, one product after another, to prove it was readable. The
// Duroflex list took about 37 s, the browser gives up after 20 s, and the product picker said "No products match
// your search." The catalog now trusts a CDN receipt whose hash matches the saved photo (the upload already checked
// those exact bytes) and reads products in parallel. Failing before.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),os=require('os'),crypto=require('crypto'),sharp=require('sharp');
const {ProductLibrary}=require('../../lib/creative-ai/runtime/product-library');
const BRANDS={'brand-1923d633-e03e-44cc-84b2-bbfb5c152710':'Duroflex','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de':'Sleepyhead'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

async function workspace(brandId,{count=3,receiptHash,local=false}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'catalog-cdn-')),base=path.join(root,'output/creative-ai/brands');
 const brands={dir:id=>path.join(base,id),read:async id=>{if(!BRANDS[id])throw Error('Unknown brand');return {id,name:BRANDS[id],brandUrl:'https://brand.example/'};}};
 const image=await sharp({create:{width:600,height:600,channels:3,background:'white'}}).jpeg().toBuffer(),digest=sha(image);
 for(let i=0;i<count;i++){
  const id='product-'+String(i).padStart(20,'0'),dir=path.join(base,brandId,'products',id),file='snapshot-1/product-images/media-'+String(i).padStart(16,'0')+'.jpg';
  await fs.mkdir(path.join(dir,'snapshot-1/product-images'),{recursive:true});
  if(local)await fs.writeFile(path.join(dir,file),image);
  await fs.writeFile(path.join(dir,file+'.cdn.json'),JSON.stringify({version:1,brandId,url:'https://cdn2.gro.care/'+digest.slice(0,12)+'.jpg',sha256:receiptHash||digest,bytes:image.length}));
  await fs.writeFile(path.join(dir,'profile.json'),JSON.stringify({id,brandId,name:BRANDS[brandId]+' product '+i,description:'Saved official product description.',catalogVersion:2,features:[],featureListVersion:99,specificationFields:[],collectedAt:'2026-11-0'+(i+1)+'T00:00:00.000Z',snapshot:'snapshot-1',variants:[{id:String(i+1),name:'Queen'}],assets:[{id:'media-'+String(i).padStart(16,'0'),group:'product-images',type:'image',status:'stored',file,sha256:digest,width:600,height:600,bytes:image.length}]}));
 }
 return {root,library:new ProductLibrary(brands),cleanup:()=>fs.rm(root,{recursive:true,force:true})};
}
function countFetches(t){const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;await new Promise(r=>setTimeout(r,50));throw Error('The product list must not download saved photos');};t.after(()=>{global.fetch=original;});return ()=>calls;}

for(const [brandId,name] of Object.entries(BRANDS)){
 test(name+': products whose photos are only on the CDN are listed as ready without downloading them',async t=>{
  const calls=countFetches(t),w=await workspace(brandId);t.after(w.cleanup);
  const list=await w.library.catalog(brandId);
  assert.equal(list.length,3);assert.equal(calls(),0,'no photo is downloaded to list products');
  for(const p of list){assert.equal(p.readiness.state,'ready',p.name+': '+p.readiness.issues.join('; '));assert.equal(p.readiness.usableImageIds.length,1);}
  assert.deepEqual(list.map(p=>p.name),[2,1,0].map(i=>name+' product '+i),'newest first, as before');
 });
 test(name+': a CDN receipt for different bytes does not count as a usable photo',async t=>{
  countFetches(t);const w=await workspace(brandId,{count:1,receiptHash:'f'.repeat(64)});t.after(w.cleanup);
  const [p]=await w.library.catalog(brandId);
  assert.equal(p.readiness.state,'images-missing');
 });
 test(name+': a local photo is still opened and checked',async t=>{
  const calls=countFetches(t),w=await workspace(brandId,{count:1,local:true});t.after(w.cleanup);
  const [p]=await w.library.catalog(brandId);
  assert.equal(p.readiness.state,'ready');assert.equal(calls(),0);
  const file=path.join(w.root,'output/creative-ai/brands',brandId,'products',p.id,p.assets[0].file);await fs.writeFile(file,Buffer.from('not a picture'));
  const [broken]=await w.library.catalog(brandId);
  assert.equal(broken.readiness.state,'images-missing','a damaged local photo is not trusted because of its receipt');
 });
}
test('the product list reads products in parallel',async t=>{
 countFetches(t);const brandId=Object.keys(BRANDS)[0],w=await workspace(brandId,{count:12});t.after(w.cleanup);
 // Each saved read waits 60 ms (a slow disk or bucket). One product after another would take over 700 ms.
 const read=w.library.read.bind(w.library);w.library.read=async(...args)=>{await new Promise(r=>setTimeout(r,60));return read(...args);};
 const started=Date.now(),list=await w.library.catalog(brandId),ms=Date.now()-started;
 assert.equal(list.length,12);assert.ok(ms<450,'12 products listed in '+ms+' ms');
});
