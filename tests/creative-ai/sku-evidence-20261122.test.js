'use strict';
// Regression (22 Nov 2026, Neha on two live 16 Nov designs: "since this is a product led company, they cannot skip on
// SKU perfectness … what was missed where?" → "Yes, build all three"). The Airboost Duo Topper store banner said
// "Two sides" but drew no orange foam side; the Airboost 6.8 post cut the mattress side open and drew ridged latex.
// Both passed "Product". Research had kept the first 3 page photos (two were one picture at two sizes) and the
// protected photo was a copy of photo 1, so every stage saw 1–2 views and never the construction picture; the
// "Did it deliver?" panel also showed "Product: Delivered" while a product-feature check had failed.
// New lean jobs pin skuEvidenceVersion 1. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {fixture,square}=require('./lean-marketing-fixture');
const BRANDS={Duroflex:'https://duroflex.test/cdn/shop/files/',Sleepyhead:'https://sleepyhead.test/cdn/shop/files/'};
// The live topper gallery, in page order: the protected photo is TPR_1; TPR_1 also appears at 600 px.
const gallery=base=>[
 {id:'sku-product-image-1',label:'Topper on a bed, angled view',url:base+'TPR_1_600x600.jpg'},
 {id:'sku-product-image-2',label:'Topper on a bed, angled view',url:base+'TPR_1.jpg'},
 {id:'sku-product-image-3',label:'Product infographic with dual firmness text',url:base+'TPR_5.jpg'},
 {id:'sku-product-image-4',label:'Topper on a bed, front view',url:base+'TPR_2.jpg'},
 {id:'sku-product-image-5',label:'Topper partly rolled on a bed',url:base+'TPR_4.jpg'},
 {id:'sku-product-image-6',label:'Exploded product cutaway with labelled construction layers',url:base+'TPR_7.jpg'},
 {id:'sku-product-image-7',label:'Close-up of the knitted fabric',url:base+'TPR_8.jpg'}];
const LAYERS='The rolled end shows only white foam and blue fabric; the orange high-response foam layer of the official construction picture is missing.';
function flag(id,evidence,on){let n=0;return out=>{n++;if(!on.includes(n))return;const c=out.checks.find(x=>x.id===id);if(c){c.result='clear_mismatch';c.evidence=evidence;}};}
const kind=(f,k)=>f.calls.filter(c=>c.kind===k);
test('new lean jobs pin skuEvidenceVersion and the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.skuEvidenceVersion,1);assert.equal(pc.snapshot(c).skuEvidenceVersion,1);assert.equal(pc.snapshot({}).skuEvidenceVersion,undefined);
});
test('research reads the saved gallery (up to 7 distinct photos, size copies removed) only when pinned',()=>{
 const {selectSkuImages}=require('../../lib/creative-ai/runtime/sku-research');
 const page={images:['https://duroflex.test/a_600x600.jpg','https://cdn.test/a.jpg','https://cdn.test/b.jpg']};
 const asset=(name,w)=>({type:'image',group:'product-images',status:'stored',width:w,height:w,url:'https://cdn.test/files/'+name});
 const profile={brandId:'b',pageUrl:'https://duroflex.test/products/topper',assets:[asset('TPR_1_600x600.jpg',600),asset('TPR_1.jpg',2000),...[2,3,4,5,6,7,8,9].map(n=>asset('TPR_'+n+'.jpg',2000))]};
 const intake={brandId:'b',productPageUrl:'https://duroflex.test/products/topper'};
 assert.deepEqual(selectSkuImages(page,profile,intake),page.images,'earlier jobs keep the page\'s first photos');
 const picked=selectSkuImages(page,profile,intake,{gallery:true});
 assert.equal(picked.length,7);assert.equal(picked[0],'https://cdn.test/files/TPR_1.jpg','the larger copy of photo 1, once');assert.ok(picked.includes('https://cdn.test/files/TPR_7.jpg'));
 assert.match(fs.readFileSync(path.join(__dirname,'../../lib/creative-ai/runtime/engine.js'),'utf8'),/gallery:job\.runtimeConfig\?\.skuEvidenceVersion===1/,'the research step passes the pin');
});
test('views: the protected photo, then distinct clean photos before annotated ones; the construction picture apart',()=>{
 const {choose}=require('../../lib/creative-ai/lean/sku-evidence');
 const a=(id,label,key,kind='product')=>({id,label,imageData:'x',key,kind});
 const pool=[a('protected','Protected','tpr_1'),a('sku-product-image-1','Angled','tpr_1'),a('sku-product-image-2','Infographic with text','tpr_5'),a('sku-product-image-3','Front','tpr_2'),a('sku-product-image-4','Rolled','tpr_4'),a('sku-product-image-5','Mattress layer cutaway','tpr_7'),a('sku-product-image-6','Fabric close-up','tpr_8')];
 const r=choose(pool,pool,x=>x.key);
 assert.deepEqual(r.views.map(v=>v.id),['protected','sku-product-image-3','sku-product-image-4','sku-product-image-6']);assert.equal(r.construction.id,'sku-product-image-5');
 assert.equal(choose(pool.slice(0,4),pool.slice(0,4),x=>x.key).construction,null,'no construction picture on the page');
 // Live 6.8 labels: the hero render "with a visible cutaway" comes first in the gallery; the exploded layers picture wins.
 const m=[a('protected','Protected','hero'),a('sku-product-image-1','Airboost mattress product rendering with a visible cutaway and Duroflex/Duropedic markings.','hero'),a('sku-product-image-2','Mattress cutaway render is labeled “Airboost 6.8 Arctic Ice Pro,” which does not match the selected product name.','x','reference'),a('sku-product-image-3','Exploded product cutaway showing mattress layers','layers')];
 assert.equal(choose(m,m,x=>x.key).construction.id,'sku-product-image-3','a layers diagram beats a whole-mattress render; a photo the audit did not accept is never used');
 assert.equal(choose(m.slice(0,3),m.slice(0,3),x=>x.key).construction.id,'sku-product-image-1','the render with a cutaway is used when it is the only one');
});
for(const brand of Object.keys(BRANDS)){
 test(brand+': the planner, the image model and the checker get 4 distinct views and the construction picture',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],gallery:gallery(BRANDS[brand]),identityUrl:BRANDS[brand]+'TPR_1.jpg'});assert.equal(f.planError,null);await f.run();
  const plan=kind(f,'lean-planning')[0];assert.equal(plan.input.productConstruction.picture,true);assert.match(plan.input.productConstruction.rule,/same layers in the same order/);
  assert.equal(plan.images.filter(l=>/Exact selected SKU reference/.test(l)).length,4);assert.ok(plan.images.some(l=>/^Official construction picture/.test(l)));
  const image=f.calls.find(c=>c.kind==='image');
  assert.deepEqual(image.attachments.filter(a=>a.roles.includes('product')).map(a=>a.assetId),['sku-photo','sku-product-image-4','sku-product-image-5','sku-product-image-7'],'the protected photo, front, rolled, close-up; no size copy, infographic or diagram as a view');
  const construction=image.attachments.find(a=>a.roles.includes('construction'));assert.equal(construction.assetId,'sku-product-image-6');
  assert.match(image.prompt,/Image 6 is the official construction picture of this exact product/,'named in the existing list of attached images (4 views + logo)');
  const review=kind(f,'lean-review')[0],check=review.input.requirements.find(r=>r.id==='product-construction');
  assert.match(check.expected,/match the attached official construction picture/);assert.ok(review.images.some(l=>/Official construction picture from the exact SKU page/.test(l)),'the checker gets the picture');
  assert.equal(review.images.filter(l=>/Exact product reference, angle/.test(l)).length,4,'four views in the check');
 });
 test(brand+': an inside that does not match the construction picture is redrawn once',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],gallery:gallery(BRANDS[brand]),identityUrl:BRANDS[brand]+'TPR_1.jpg',reviewEdit:flag('product-construction',LAYERS,[1])});await f.run();
  const images=kind(f,'image');assert.equal(images.length,2);assert.ok(images[1].prompt.includes(LAYERS.slice(0,60)));assert.equal(kind(f,'lean-correction').length,0);
  assert.match((await f.read()).results[0].imageUrl,/candidate/);
 });
 test(brand+': with no construction picture the planner may not show the inside and the check flags one',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],gallery:gallery(BRANDS[brand]).filter(g=>!/cutaway/.test(g.label))});await f.run();
  assert.equal(kind(f,'lean-planning')[0].input.productConstruction.picture,false);assert.match(kind(f,'lean-planning')[0].input.productConstruction.rule,/no picture of this product's inside/);
  assert.equal(f.calls.find(c=>c.kind==='image').attachments.some(a=>a.roles.includes('construction')),false);
  assert.match(kind(f,'lean-review')[0].input.requirements.find(r=>r.id==='product-construction').expected,/Flag clear_mismatch if the artwork shows the product's inside/);
 });
 test(brand+': jobs admitted before the pin keep 3 photos and their check',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],gallery:gallery(BRANDS[brand]),pinned:false,unpin:['skuEvidenceVersion']});await f.run();
  assert.equal(kind(f,'lean-planning')[0].input.productConstruction,undefined);
  assert.equal(f.calls.find(c=>c.kind==='image').attachments.filter(a=>a.roles.includes('product')).length,3);
  assert.equal(kind(f,'lean-review')[0].input.requirements.some(r=>r.id==='product-construction'),false);
 });
}
test('"Did it deliver?" never shows Product as delivered when any product check failed (live Airboost 6.8 post)',()=>{
 const M=require('../../public/creative-ai/studio-model');
 // The live 16 Nov post's saved results (ids and results only).
 const live=[['copy-0','no_mismatch'],['product','no_mismatch'],['product-feature-1','no_mismatch'],['product-feature-5','clear_mismatch','The gray airboost plaque and navy panel are present, but DUROFLEX is red'],['label-wording','no_mismatch'],['logo','no_mismatch'],['physical-realism','no_mismatch'],['placement-feature-demonstration','clear_mismatch','Only the cover is lifted']].map(([id,result,evidence])=>({id,result,...(evidence?{evidence}:{})}));
 const rows=M.deliveryRows(live),product=rows.find(r=>r.name==='Product');assert.equal(product.state,'check');assert.match(product.note,/DUROFLEX is red/);
 const label=M.deliveryRows([{id:'copy-0',result:'no_mismatch'},{id:'product',result:'no_mismatch'},{id:'label-wording',result:'clear_mismatch',evidence:'Label reads "Airbost"'}]);
 assert.equal(label.find(r=>r.name==='Words').state,'ok','the label is the product, not campaign words');assert.equal(label.find(r=>r.name==='Product').state,'check');
 assert.equal(M.deliveryRows([{id:'people-scale',result:'clear_mismatch',evidence:'Too big'}]).find(r=>r.name==='Looks real').state,'check');
 assert.equal(M.deliveryRows([{id:'product-construction',result:'clear_mismatch',evidence:LAYERS}])[0].name,'Product');
});
