'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),os=require('os'),crypto=require('crypto'),sharp=require('sharp');
const identity=require('../../lib/creative-ai/runtime/approved-identity');
const root=path.resolve(__dirname,'../..');
for(const [brandId,researchId] of [['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','creative-a5835af7-6943-4fe6-b7ff-e7bcdf0cb1a7'],['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','creative-d23cdaaa-c97d-432c-83f4-05d59dd11be1']])test('saved '+brandId+' approved logo reaches flattened research without changing saved evidence',async()=>{
 const runtime={brands:{read:async id=>JSON.parse(await fs.readFile(root+'/output/creative-ai/brands/'+id+'/brand.json','utf8')),dir:id=>root+'/output/creative-ai/brands/'+id}};
 const file=root+'/output/creative-ai/research-sessions/'+researchId+'/research.json',before=await fs.readFile(file),research=JSON.parse(await require('../../lib/creative-ai/runtime/artifact-fs').readFile(file,'utf8')),pin=await identity.snapshot(runtime,{brandId}),bound=await identity.attach(runtime,research,pin,brandId);
 assert(!research.dossier.assets.some(a=>a.id===pin.assetId));assert(bound.dossier.assets.some(a=>a.id===pin.assetId&&a.kind==='logo'&&a.imageData.startsWith('data:image/png;base64,')));
 require('../../lib/brand-dossier/contract').validateResearch(bound.dossier);
 assert(require('../../lib/creative-ai/runtime/research').orderedImages(bound.dossier.assets).some(a=>a.id===pin.assetId));assert(require('../../lib/creative-ai/runtime/research').orderedImages([...bound.dossier.assets,...[1,2,3].map(n=>({id:'sku-product-image-'+n,kind:'product',label:'test',imageData:'data:image/png;base64,test'}))]).some(a=>a.id===pin.assetId));assert.deepEqual(await fs.readFile(file),before);
 assert.deepEqual((await identity.attach(runtime,bound,pin,brandId)).dossier.assets.length,bound.dossier.assets.length);
 await assert.rejects(identity.attach(runtime,research,pin,'wrong-brand'),/brand/);
});
test('unapproved, changed and cross-brand logo files fail before generation',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'approved-identity-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.mkdir(path.join(dir,'canvas-assets'));const bytes=await sharp({create:{width:10,height:10,channels:4,background:'#112233'}}).png().toBuffer();await fs.writeFile(path.join(dir,'canvas-assets','logo.png'),bytes);
 const logo={id:'logo',brandId:'one',approved:true,kind:'logo',name:'Approved',sourceReference:'User supplied',filename:'logo.png',sha256:crypto.createHash('sha256').update(bytes).digest('hex')};let current=logo;const runtime={brands:{read:async()=>({canvasAssets:{logo:current}}),dir:()=>dir}};
 assert(await identity.snapshot(runtime,{brandId:'one'}));current={...logo,brandId:'two'};await assert.rejects(identity.snapshot(runtime,{brandId:'one'}),/brand/);current={...logo,approved:false};await assert.rejects(identity.snapshot(runtime,{brandId:'one'}),/approved/);current={...logo,filename:'../logo.png'};await assert.rejects(identity.snapshot(runtime,{brandId:'one'}),/filename/);current=logo;await fs.writeFile(path.join(dir,'canvas-assets','logo.png'),'changed');await assert.rejects(identity.snapshot(runtime,{brandId:'one'}),/changed/);
 current=null;assert.equal(await identity.snapshot(runtime,{brandId:'one'}),null);
});
