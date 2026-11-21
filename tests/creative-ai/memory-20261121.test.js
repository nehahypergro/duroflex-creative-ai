'use strict';
// Memory review (21 Nov 2026; the local Studio was seen at 2.2–2.7 GB and had crashed on startup). Measured on a copy
// of the saved projects with the admin-server startup: peak 1,220 MB at startup and 1,819–1,959 MB when three open
// pages asked for the project list together; ~34 MB was actually in use at rest. Causes: the project list read and
// decoded every job.json at once (365 files, 134 MB) on every call, and each product-list build re-parsed saved pages
// and decoded a photo per product, six at a time. After: 780 MB startup peak, 871 / 746 MB with three pages.
// Every test here fails before the fix.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const BRANDS=[['Duroflex','brand-1923d633-e03e-44cc-84b2-bbfb5c152710'],['Sleepyhead','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de']];
const repo=path.join(__dirname,'../..');

async function savedJobs(brandId,count){
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'job-summaries-')),ids=[];
 for(let i=0;i<count;i++){const id='creative-'+brandId.slice(6,14)+'-0000-4000-8000-'+String(i).padStart(12,'0');ids.push(id);await fsp.mkdir(path.join(root,id));
  await fsp.writeFile(path.join(root,id,'job.json'),JSON.stringify({id,status:'finished',createdAt:'2026-11-'+String(10+i%9).padStart(2,'0')+'T00:00:00Z',intake:{brandId,brandUrl:'https://example.test',brief:i===1?'Internal test only':'Sell it'},submittedBy:{id:'u'+i,name:'Person '+i,email:'private@example.test'},results:[{},{}],treatmentKnowledge:'x'.repeat(20000)}));}
 return {root,ids};
}
for(const [brand,brandId] of BRANDS)test(brand+': the project list keeps small summaries and re-reads a project only when it changes',async()=>{
 const S=require('../../lib/creative-ai/runtime/job-summaries'),{root,ids}=await savedJobs(brandId,20);let reads=0,active=0,peak=0;
 const store={root,dir:id=>path.join(root,id),read:async id=>{reads++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;if(id===ids[3])throw Error('Another workspace brand');return JSON.parse(await fsp.readFile(path.join(root,id,'job.json'),'utf8'));}};
 const first=await S.summaries({store});assert.equal(reads,20);assert.ok(peak<=S.LIMIT,'at most eight projects are read at once');
 assert.equal(first.length,19,'a project the store refuses (other brand, no access) is left out');
 const one=first.find(s=>s.id===ids[0]);assert.deepEqual(Object.keys(one).sort(),['createdAt','id','intake','internalReason','outputs','status','submittedBy','updatedAt']);assert.equal(one.outputs,2);assert.deepEqual(one.submittedBy,{id:'u0',name:'Person 0',username:undefined});assert.ok(JSON.stringify(one).length<1000,'no pinned knowledge is kept');
 assert.equal(first.find(s=>s.id===ids[1]).internalReason,'Explicit test brief');assert.ok(!(await S.visible(root,first)).some(s=>s.id===ids[1]));
 reads=0;await S.summaries({store});assert.equal(reads,1,'only the refused project is tried again');
 await new Promise(r=>setTimeout(r,15));const j=JSON.parse(await fsp.readFile(path.join(root,ids[5],'job.json'),'utf8'));j.status='failed';await fsp.writeFile(path.join(root,ids[5],'job.json'),JSON.stringify(j));
 reads=0;const third=await S.summaries({store});assert.equal(reads,2);assert.equal(third.find(s=>s.id===ids[5]).status,'failed');
 await fsp.rm(path.join(root,ids[6]),{recursive:true});assert.ok(!(await S.summaries({store})).some(s=>s.id===ids[6]));
 await fsp.rm(root,{recursive:true,force:true});
});

test('the job store reads at most eight projects at once',async()=>{
 const {JobStore}=require('../../lib/creative-ai/runtime/store'),{root}=await savedJobs(BRANDS[0][1],20),store=new JobStore(root);let active=0,peak=0;const read=store.read.bind(store);
 store.read=async(...a)=>{active++;peak=Math.max(peak,active);try{await new Promise(r=>setTimeout(r,5));return await read(...a);}finally{active--;}};
 const all=await store.list({metadataOnly:true});assert.equal(all.length,20);assert.ok(peak<=8,'peak '+peak);
 await fsp.rm(root,{recursive:true,force:true});
});

test('both list routes use the summaries, not the full project list',()=>{
 const http=fs.readFileSync(path.join(repo,'lib/creative-ai/runtime/http.js'),'utf8'),list=fs.readFileSync(path.join(repo,'lib/creative-ai/runtime/project-list.js'),'utf8');
 assert.match(http,/S\.visible\(root,await S\.summaries\(runtime\)\)/);assert.match(list,/S\.visible\(root,await S\.summaries\(runtime\)\)/);
 assert.doesNotMatch(list,/store\.list\(/);
});

for(const [brand,brandId] of BRANDS)test(brand+': a saved product page is parsed once, kept beside the product, and parsed again only when it changes',async()=>{
 const crypto=require('node:crypto'),root=await fsp.mkdtemp(path.join(os.tmpdir(),'page-fields-'));
 try{const id='product-12345678901234567890',snapshot='snapshot-test',html='<h3>Features</h3><ul><li>'+brand+' support layer.</li></ul>',base=path.join(root,brandId,'products',id);
  await fsp.mkdir(path.join(base,snapshot),{recursive:true});const profile={brandId,id,snapshot,name:'Product',description:'Source',pageUrl:'https://example.com/products/a',pageHash:crypto.createHash('sha256').update(html).digest('hex'),variants:[],assets:[]};
  await fsp.writeFile(path.join(base,'profile.json'),JSON.stringify(profile));await fsp.writeFile(path.join(base,snapshot,'page.html'),html);
  const fresh=()=>{for(const k of Object.keys(require.cache))if(k.includes('product-library'))delete require.cache[k];const {ProductLibrary}=require('../../lib/creative-ai/runtime/product-library');return new ProductLibrary({dir:b=>path.join(root,b),read:async b=>({id:b})});};
  assert.deepEqual((await fresh().catalog(brandId,id)).features,[brand+' support layer.']);
  const saved=JSON.parse(await fsp.readFile(path.join(base,'catalog-page-fields.json'),'utf8'));assert.deepEqual(saved.parsed.features,[brand+' support layer.']);assert.equal(saved.file,path.join(snapshot,'page.html'));
  assert.equal(await fsp.readFile(path.join(base,'profile.json'),'utf8'),JSON.stringify(profile),'the saved profile is untouched');
  // A restart reads the saved fields: proved by making the page unreadable as HTML while its stamp is unchanged.
  const fd=await fsp.open(path.join(base,snapshot,'page.html'),'r+');const st=await fd.stat();await fd.close();
  saved.parsed.features=['kept from the saved fields'];await fsp.writeFile(path.join(base,'catalog-page-fields.json'),JSON.stringify(saved));
  assert.deepEqual((await fresh().catalog(brandId,id)).features,['kept from the saved fields'],'no parse after a restart');
  // The page changes (new stamp, hash no longer matches): parsed again, and nothing is taken from it.
  await new Promise(r=>setTimeout(r,20));await fsp.writeFile(path.join(base,snapshot,'page.html'),html+' ');
  assert.equal((await fresh().catalog(brandId,id)).features,undefined);
 }finally{await fsp.rm(root,{recursive:true,force:true});}
});

test('product-list builds decode photos two at a time and remember checked photos',()=>{
 const src=fs.readFileSync(path.join(repo,'lib/creative-ai/runtime/product-library.js'),'utf8');
 assert.match(src,/readablePhotos\.get\(photo\)/);assert.match(src,/if\(decoding>=2\)/);assert.match(src,/ok=await decodeSlot\(/);
});
