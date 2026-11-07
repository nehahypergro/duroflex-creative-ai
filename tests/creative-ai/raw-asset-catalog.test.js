'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../public/creative-ai/studio-model'),C=require('../../lib/creative-ai/experiments/asset-catalog'),web=require('../../lib/creative-ai/experiments/web-commerce');
test('all Studio shelves and their preset menus are represented',()=>{
 const a=C.catalog();assert.equal(new Set(a.map(e=>e.id)).size,a.length);
 for(const g of ['social','website','retail','messaging','corporate'])for(const f of M.toolFormats(g))assert.ok(a.some(e=>e.category===g&&e.name===f.name),f.name);
 for(const g of M.catalogueVisuals.additional)for(const [name]of g.items)assert.ok(a.some(e=>e.name===name),name);
 for(const name of [...M.retailPrintPresets.map(p=>p.name),...Object.keys(M.amazonTemplates),...Object.keys(M.emailPresets)])assert.ok(a.some(e=>e.name===name),name);
 assert.equal(C.categories.length,6);assert.ok(a.some(e=>e.id.includes('iphone-ios')));
});
test('every raster format resolves all its pages at the shared preset dimensions',()=>{
 for(const e of C.catalog().filter(e=>e.mode==='image')){
  const slots=C.resolve([{assetId:e.id,brief:'Only use supplied source facts.'}]);
  assert.equal(slots.length,e.parts.length,e.name);assert.deepEqual(slots.map(s=>[s.width,s.height]),e.parts.map(p=>[p.width,p.height]),e.name);
  assert.ok(slots.every(s=>s.page>=1&&s.pages===slots.length));
  if(e.print)assert.deepEqual(slots[0].print,e.print);
 }
});
test('preflight rejects missing facts, missing pages, invalid sizes and wrong output capabilities',()=>{
 const a=C.catalog(),print=a.find(a=>a.print),image=a.find(a=>a.text==='none'&&a.mode==='image');
 assert.throws(()=>C.resolve([{assetId:'unknown'}]),/Unknown/);
 assert.throws(()=>C.resolve([{assetId:a[0].id},{assetId:a[0].id}]),/repeated/);
 assert.throws(()=>C.resolve([{assetId:a.find(a=>a.mode==='local-icons').id}]),/icon preparation/);
 assert.throws(()=>C.resolve([{assetId:a.find(a=>a.requiresBrief).id}]),/factual brief/);
 assert.throws(()=>C.resolve([{assetId:a[0].id,parts:[]}]),/every page/);
 assert.throws(()=>C.resolve([{assetId:a[0].id,parts:[{width:NaN}]}]),/canvas/);
 assert.throws(()=>C.resolve([{assetId:print.id,parts:print.parts.map(p=>({...p,width:900}))}]),/physical proportions/);
 assert.throws(()=>C.resolve([{assetId:image.id,copy:'Do not bake me in'}]),/image-only/);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': new prompts use only the selected brand and SKU guidance',()=>{
 const source={record:{productReference:{brand,sku:brand+'-fixture'},artDirection:{focalCommunication:'SOURCE MESSAGE',lighting:'SOURCE LIGHT',palette:['SOURCE COLOUR']},exactCopy:{fields:[{role:'headline',text:'SOURCE WORDING',delivery:'embedded'}]}}};
 for(const slot of C.resolve([{assetId:'social-instagram-post'},{assetId:'social-pmax-image-set'}])){
  const p=web.buildPrompt(source,slot);assert.match(p,new RegExp(brand+'-fixture'));assert.match(p,/SOURCE MESSAGE/);assert.doesNotMatch(p,/Honey|Octave|everyday time together|Poppins/);
  assert.doesNotMatch(p,new RegExp(brand==='Duroflex'?'Sleepyhead':'Duroflex'));if(slot.text==='none')assert.match(p,/IMAGE ONLY/);
 }
});
test('page-specific copy is kept separate and image-only pages reject it',()=>{
 const e=C.catalog().find(e=>e.id==='social-instagram-carousel');
 const slots=C.resolve([{assetId:e.id,copy:'Shared fallback',parts:e.parts.map((p,i)=>({copy:i===0?'Only on first page':''}))}]);
 assert.equal(slots[0].copy,'Only on first page');assert.equal(slots[1].copy,'Shared fallback');
 const p=C.catalog().find(e=>e.id==='social-pmax-image-set');
 assert.throws(()=>C.resolve([{assetId:p.id,parts:p.parts.map(()=>({copy:'Unwanted text'}))}]),/image-only/);
});
test('legacy campaign-specific brief cannot be applied to another brand source',async()=>{
 await assert.rejects(web.submit({}, {requestKey:'web-commerce-00000000-0000-0000-0000-000000000000',source:{sourceId:'another-brand'}}),/Select asset types/);
});
