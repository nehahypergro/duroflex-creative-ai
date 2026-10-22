'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp'),fs=require('fs'),path=require('path');
const reader=require('../../lib/creative-ai/runtime/readability'),formats=require('../../lib/creative-ai/runtime/output-formats'),placements=require('../../lib/creative-ai/runtime/placements'),pk=require('../../lib/creative-ai/placement-knowledge');
const base={brandUrl:'https://example.com',focusType:'brand',brief:'Explicit synthetic reading-context test'};
test('copy capacity follows reading context rather than canvas area',()=>{
 assert.equal(reader.policyFor({id:'google-upload-mobile-banner',width:320,height:50}).body,0);
 assert.equal(reader.classify({id:'google-upload-skyscraper',width:160,height:600}),'compact-banner');
 for(const [key,expected] of [['dangler','pos'],['leaflet-a5','handout'],['leaflet-a6','small-handout'],['brochure-trifold','folded'],['price-list','print-document'],['hoarding','ooh']])assert.equal(reader.classify({id:'custom:studio-print-'+key}),expected);
 assert.equal(reader.policyFor({id:'email-hero'}).body,0);
 for(const [id,expected] of [['web-hero','web'],['app-banner','web'],['print-sales-sheet','print-document'],['print-price-list','print-document'],['print-booklet-a5','print-document'],['print-poster-a4','distance-sign']])assert.equal(reader.classify(formats.presets.find(p=>p.id==='custom:studio-'+id)),expected,id);
 assert.equal(reader.classify({id:'related-app-store-screenshot'}),'web');
 assert.equal(reader.policyFor({id:'commerce-comparison-chart'}).total,null);
 assert.equal(reader.policyFor({id:'merchant-primary'}).total,0);
 assert.equal(reader.policyFor({family:'responsive-advertising'}).classId,'native');
});
test('type conversions expose downscaling without claiming to measure generated glyphs',()=>{
 assert.equal(reader.assetPixels(16,1080,360),48);assert.equal(reader.assetPixels(16,1080,320),54);assert.equal(reader.assetPixels(24,1080,320),81);assert.equal(reader.printPixels(12,150),25);
 for(const f of [()=>reader.assetPixels(0,1080,320),()=>reader.printPixels(12,NaN)])assert.throws(f,/Positive/);
});
test('all new preset pins get scoped advisory rules without mutating the historical catalogue',()=>{
 const before=JSON.stringify(pk.loadCatalog());for(const p of formats.presets){const resolved=placements.resolve({...base,placementIds:[p.id],carouselSlideCount:2});for(const s of resolved.selections){const r=s.expanded.rules.find(r=>r.id.endsWith('-readability'));assert.ok(r,p.id);assert.equal(r.tier,'heuristic');assert.equal(r.severity,'advisory');assert.equal(r.evidenceStatus,'editorial-heuristic');assert.deepEqual(r.scope.profileIds,[s.pin.id||s.pin.profileId]);assert.match(r.statement,/mandatory qualifiers/);}}
 assert.equal(JSON.stringify(pk.loadCatalog()),before);
});
test('physical size overrides reduce handout capacity and remain in the pinned reading contract',()=>{
 const id='custom:studio-print-flyer-a4',s=placements.resolve({...base,placementIds:[id],printOptions:{[id]:{trimWidthMm:100,trimHeightMm:140}}}).selections[0];assert.equal(s.description.readability.classId,'small-handout');assert.match(s.expanded.rules.find(r=>r.id.endsWith('-readability')).statement,/\[small-handout\]/);
});
test('new phone, thumbnail and print review contracts differ; historical records retain detail review',async()=>{
 function rec(id){const s=placements.resolve({...base,placementIds:[id]}).selections[0];return {canvas:s.description.dimensions,placementContext:{context:{placements:[{profile:s.expanded.profile,rules:s.expanded.rules}]}}};}
 const feed=reader.viewingContract(rec('custom:studio-social-square'));assert.equal(feed.previewWidth,320);
 const yt=reader.viewingContract(rec('custom:studio-youtube-thumbnail'));assert.equal(yt.previewWidth,160);
 const print=reader.viewingContract(rec('custom:studio-print-dangler'));assert.equal(print.status,'physical-proof-required');
 const old=rec('custom:studio-social-square');old.placementContext.context.placements[0].rules=old.placementContext.context.placements[0].rules.filter(r=>!r.id.endsWith('-readability'));assert.equal(reader.viewingContract(old),null);
 const pixels=await sharp({create:{width:1080,height:1080,channels:3,background:'#ddd'}}).png().toBuffer();const result=await require('../../lib/creative-ai/runtime/review').preparePreview(rec('custom:studio-social-square'),'data:image/png;base64,'+pixels.toString('base64'));assert.equal((await sharp(result.preview).metadata()).width,320);const legacy=await require('../../lib/creative-ai/runtime/review').preparePreview(old,'data:image/png;base64,'+pixels.toString('base64'));assert.equal((await sharp(legacy.preview).metadata()).width,1800);assert.equal(legacy.viewing,null);
});
test('audit enumerates every placement and rule with traceable research and correct PMax companion',()=>{
 const a=require('../../docs/placements/research-2026-10-09/audit.json');assert.equal(a.profiles.length,224);assert.equal(a.rules.length,186);assert.equal(a.sources.length,34);assert.equal(a.examples.length,9);assert.equal(new Set(a.profiles.map(p=>p.id)).size,224);
 for(const p of a.profiles)for(const id of p.sourceIds)assert.ok(a.sources.some(s=>s.id===id),id);
 assert.match(a.rules.find(r=>r.id==='google-pmax-native-headlines').finding,/already covers/);assert.match(a.rules.find(r=>r.id==='pmax-short-headline').finding,/already present/);
 assert.ok(fs.existsSync(path.join(__dirname,'../../docs/placements/readability-audit-2026-10-09.md')));
});
test('thumbnail update and regional display guidance do not claim universal publisher eligibility',()=>{
 const p=formats.presets.find(p=>p.id==='custom:studio-youtube-thumbnail');assert.deepEqual([p.width,p.height],[3840,2160]);assert.ok(p.maxBytes<2000000);
 for(const name of ['triple-widescreen','netboard','top-banner','panorama'])assert.match(formats.presets.find(p=>p.id.includes(name)).guidelines,/Sweden|Norway|Denmark/);
});
test('Studio module profiles retain their known reading context instead of becoming unspecified',()=>{for(const id of ['custom:recipe-marketplace-module-01','custom:recipe-marketplace-module-02'])assert.equal(reader.classify({id,name:'Hero module',width:970,height:600}),'feature');assert.equal(reader.classify({id:'custom:recipe-product-image-01',name:'View',width:1600,height:1600}),'commerce-photo');assert.equal(reader.classify({id:'custom:unknown',name:'Custom item',width:970,height:600}),'unspecified');});
