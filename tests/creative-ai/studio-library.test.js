'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const L=require('../../public/creative-ai/studio-library');
const ids=['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'];
// Recorded read-only manifest checks; no rewriting source knowledge or generation.
for(const id of ids)test('Library sources remain resolvable and brand-scoped: '+id,()=>{
 const base=path.join(__dirname,'../../output/creative-ai/brands',id),b=JSON.parse(fs.readFileSync(path.join(base,'brand.json'))),p=L.profile(b);assert.ok(p);
 const refs=[p.summarySource,p.colourSource,p.typeSource,p.hashtagSource,...p.voice.map(v=>v.source),...p.visuals.map(v=>v.source),...p.colours.map(c=>c.source),...(p.typefaces||[]).map(t=>t.source)];
 if(p.secondarySource)refs.push(p.secondarySource);
 for(const ref of refs){const resolved=L.source(b,ref);assert.ok(resolved,ref.label);assert.ok(resolved.url.startsWith('/creative-ai/api/brands/'+id+'/'));if(ref.kind==='document'){const d=b.documents.find(d=>d.id===ref.id);assert.ok(fs.existsSync(path.join(base,'sources',d.id+'.'+d.format)));if(resolved.image)assert.ok(fs.existsSync(path.join(base,'sources',d.id+'-slide-'+ref.page+'.jpg')));}else{const a=b.assets.find(a=>a.id===ref.id);assert.ok(fs.existsSync(path.join(base,a.originalPath)));if(resolved.image)assert.ok(fs.existsSync(path.join(base,a.previewPath)));}}
 const other=JSON.parse(fs.readFileSync(path.join(base,'../',ids.find(x=>x!==id),'brand.json')));assert.equal(L.source(other,p.summarySource),null);
 for(const logo of L.logoAssets(b)){assert.equal(logo.brandId,id);assert.ok(fs.existsSync(path.join(base,'canvas-assets',logo.filename)));}
 assert.equal(L.source({...b,documents:[],assets:[]},p.summarySource),null);
});
test('Profile extraction preserves draft and white colour conflict; no invented mandatory hashtags',()=>{
 const d=L.profile({id:ids[0]}),s=L.profile({id:ids[1]});assert.match(d.notice,/draft/);assert.match(s.colourNote,/#231F20/);assert.match(s.colourNote,/unresolved/);assert.match(s.hashtagNote,/not a mandatory/);assert.equal(L.profile({id:'other'}),null);
});
test('Product list combines query/category/images filters and stable sorting without mutating sources',()=>{
 const p=[{id:'a',name:'Sofa A',category:'Sofa',sku:'GREY-2',variants:[{},{}],assets:[{preview:true,status:'stored',group:'product-images'}],collectedAt:'2026-01-01'},{id:'b',name:'Mattress B',category:'Mattress',variants:[],assets:[],collectedAt:'2026-02-01'}],copy=JSON.stringify(p);
 assert.deepEqual(L.products(p,{query:'grey-2',category:'Sofa',images:true}).map(x=>x.id),['a']);assert.equal(L.products(p,{category:'Mattress',images:true}).length,0);assert.equal(L.products(p,{sort:'recent'})[0].id,'b');assert.equal(L.products(p,{sort:'variants'})[0].id,'a');assert.equal(JSON.stringify(p),copy);
});

test('Uncategorized products remain filterable',()=>{assert.equal(L.products([{id:'u',name:'Unsorted'}],{category:'Uncategorized'}).length,1);});
