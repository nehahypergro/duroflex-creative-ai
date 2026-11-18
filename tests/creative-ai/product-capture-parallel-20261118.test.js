'use strict';
// Regression (18 Nov 2026, Neha: adding a product from its link was slow): every photo, video and PDF on the product
// page was downloaded one after another (a real Duroflex mattress page: 51 downloads, 16.8 s; 2.3 s six at a time).
// Media are now downloaded six at a time, the saved list keeps the page's order, and failures stay recorded. Failing before.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),os=require('os'),sharp=require('sharp');
const {ProductLibrary}=require('../../lib/creative-ai/runtime/product-library');
const BRANDS={'brand-1923d633-e03e-44cc-84b2-bbfb5c152710':['Duroflex','https://duro.example/'],'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de':['Sleepyhead','https://sleepy.example/']};
const COUNT=12;
for(const [brandId,[name,site]] of Object.entries(BRANDS))test(name+': product media download six at a time and keep the page order',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'capture-parallel-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const library=new ProductLibrary({dir:id=>path.join(root,id),read:async id=>{if(id!==brandId)throw Error('Unknown brand');return {id,name,brandUrl:site};}});
 const urls=Array.from({length:COUNT},(_,i)=>'https://cdn.example/'+name.toLowerCase()+'-'+i+'.png');
 const html=`<script type="application/ld+json">{"@type":"Product","name":"${name} Test Mattress","sku":"T-1","description":"Foam mattress","image":${JSON.stringify(urls)}}</script><main><media-gallery>${urls.map(u=>`<img src="${u}">`).join('')}</media-gallery></main>`;
 const images=await Promise.all(urls.map((_,i)=>sharp({create:{width:100+i,height:100,channels:3,background:'white'}}).png().toBuffer()));
 let active=0,peak=0;
 const fetchPage=async url=>{if(url.endsWith('.js'))throw Error('No product JSON');if(url.includes('/products/'))return {url,contentType:'text/html',bytes:Buffer.from(html)};const i=urls.indexOf(url);active++;peak=Math.max(peak,active);try{await new Promise(r=>setTimeout(r,60));if(i===3)throw Error('Source returned HTTP 404');return {url,contentType:'image/png',bytes:images[i]};}finally{active--;}};
 const started=Date.now(),p=await library.capture(brandId,site+'products/test-mattress',{fetchPage}),ms=Date.now()-started;
 const gallery=p.assets.filter(a=>a.group==='product-images');
 assert.deepEqual(gallery.map(a=>a.url),urls,'saved in the page order');
 assert.equal(gallery[3].status,'unavailable');assert.match(gallery[3].note,/404/);
 assert.deepEqual(gallery.filter((_,i)=>i!==3).map(a=>[a.status,a.width]),urls.filter((_,i)=>i!==3).map((_,j)=>['stored',100+(j<3?j:j+1)]),'each stored file is the right picture');
 assert.ok(peak>1&&peak<=6,'downloads overlap, at most six at a time (peak '+peak+')');
 assert.ok(ms<COUNT*60*0.6,'12 downloads of 60 ms took '+ms+' ms');
});
