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
  w.library.forgetCatalog(brandId);// saved photos never change in place; the kept list is rebuilt within 10 minutes anyway
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

// Neha (18 Nov 2026): "can we ensure that skus are already populated? even when new redeployment happend".
// The list is built at server startup and kept; it is rebuilt only when a saved product changes. Failing before.
test('the brand product list is kept between requests and rebuilt when a saved product changes',async t=>{
 countFetches(t);const brandId=Object.keys(BRANDS)[1],w=await workspace(brandId,{count:3});t.after(w.cleanup);
 let reads=0;const read=w.library.read.bind(w.library);w.library.read=(...a)=>{reads++;return read(...a);};
 const first=await w.library.catalog(brandId);const afterFirst=reads;
 const second=await w.library.catalog(brandId);assert.equal(reads,afterFirst,'the second request reuses the kept list');assert.deepEqual(second,first);
 second[0].name='changed by a caller';assert.notEqual((await w.library.catalog(brandId))[0].name,'changed by a caller','each caller gets its own copy');
 const file=path.join(w.root,'output/creative-ai/brands',brandId,'products',first[0].id,'profile.json'),p=JSON.parse(await fs.readFile(file,'utf8'));p.name='Renamed on the website';await fs.writeFile(file,JSON.stringify(p));
 assert.equal((await w.library.catalog(brandId)).find(x=>x.id===first[0].id).name,'Renamed on the website','a changed profile is read again');
 await fs.rm(path.dirname(file),{recursive:true});assert.equal((await w.library.catalog(brandId)).length,2,'a removed product leaves the list');
});
test('two requests at the same moment share one build',async t=>{
 countFetches(t);const brandId=Object.keys(BRANDS)[0],w=await workspace(brandId,{count:4});t.after(w.cleanup);
 let lists=0;const list=w.library.list.bind(w.library);w.library.list=(...a)=>{lists++;return list(...a);};
 const [a,b]=await Promise.all([w.library.catalog(brandId),w.library.catalog(brandId)]);
 assert.equal(lists,1);assert.equal(a.length,4);assert.deepEqual(a,b);
});
test('the server builds every brand product list at startup, for both brands',async t=>{
 countFetches(t);const root=await fs.mkdtemp(path.join(os.tmpdir(),'catalog-warm-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 for(const [brandId,name] of Object.entries(BRANDS)){const w=await workspace(brandId,{count:2});await fs.cp(path.join(w.root,'output'),path.join(root,'output'),{recursive:true});await w.cleanup();await fs.writeFile(path.join(root,'output/creative-ai/brands',brandId,'brand.json'),JSON.stringify({id:brandId,name,brandUrl:'https://brand.example/'}));}
 const {createHandler}=require('../../lib/creative-ai/runtime/http'),log=console.log;console.log=()=>{};t.after(()=>{console.log=log;});
 const app=createHandler({root,warmProducts:true});const report=await app.runtime.productsWarm;
 for(const brandId of Object.keys(BRANDS)){assert.equal(report[brandId].products,2);assert.ok(app.runtime.brands.products.catalogCache.has(brandId),'the list is kept for the first visitor');}
 assert.equal(createHandler({root}).runtime.productsWarm,undefined,'tests start without a background build unless asked');
});
