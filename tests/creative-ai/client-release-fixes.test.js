'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('../../lib/creative-ai/runtime/editable-quality');
const readiness=require('../../lib/creative-ai/runtime/editable-readiness');
test('repair coordinator reflows before payment and matches source OCR using original positions',async t=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'type-repair-path-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const planned={brandId:'fixture',canvas:{width:1000,height:1000},safeMargin:30,compositionPolicy:{reading:{width:320,bodyCssPx:16}},protectedRegions:[],objects:[{id:'body',fieldId:'b',role:'supporting-copy',type:'text',text:'Exact wording',fontId:'approved',fontSize:25,left:40,top:70,width:400,height:30}],assets:[],fonts:[]};
 let paid=0,sourceLayout;const saved={};
 t.mock.method(require('../../lib/creative-ai/runtime/editable-composition'),'documentFor',()=>structuredClone(planned));
 t.mock.method(require('../../lib/creative-ai/runtime/editable'),'render',async(r,id,doc)=>({measurements:doc.objects.map(o=>({...o,textHeight:o.fontSize*1.2}))}));
 t.mock.method(require('../../lib/creative-ai/runtime/review'),'ocr',async()=>({status:'measured',rows:[]}));
 t.mock.method(require('../../lib/creative-ai/runtime/saved-copy-layout'),'select',(rows,fields,doc)=>{sourceLayout=doc;throw Error('Offline source-assignment boundary');});
 await fs.writeFile(path.join(dir,'composed-source-unit.png'),'fixture source');
 const runtime={store:{save:async(id,name,data)=>{saved[name]=data;}},provider:{generate:async()=>{paid++;}}};
 await assert.rejects(require('../../lib/creative-ai/runtime/component-repair-tools').build(runtime,'fixture',{k:'unit',record:{exactCopy:{fields:[{id:'b',delivery:'embedded',text:'Exact wording'}]}},planned,dir,job:{intake:{canvasAssets:{}}}},['typography'],'candidate',{}),/Offline source-assignment boundary/);
 assert.equal(sourceLayout.objects[0].fontSize,25);
 assert.equal(saved['typography-reflow.json'].changes[0].after.fontSize,50);
 assert.equal(planned.objects[0].fontSize,25);assert.equal(paid,0);
});
test('reclaiming unused text-box height resolves narrow clearance without shrinking glyphs',async()=>{
 const doc={canvas:{width:1200,height:627},safeMargin:18.81,compositionPolicy:{reading:{width:320,headlineCssPx:24}},protectedRegions:[{left:696,top:200.64,width:456,height:395.01}],objects:[{id:'logo',role:'logo',type:'image',left:48,top:21.945,width:228,height:36.8783},{id:'headline',fieldId:'h',role:'headline',type:'text',text:'Required headline',fontSize:90,fontId:'approved',left:48,top:59.565,width:1104,height:106.59}]};
 const result=await require('../../lib/creative-ai/runtime/typography-repair').reflow(doc,async d=>({measurements:d.objects.map(o=>({...o,textHeight:o.fieldId?101.7:o.height}))}));
 assert.equal(result.document.objects[1].fontSize,90);assert.equal(result.document.objects[1].height,103);assert.equal(result.attempts,1);
 assert.equal(doc.objects[1].height,106.59);
});
test('approved-overlay review sends no logo reference, contradictory instruction or logo correction slot',async t=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'overlay-review-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));let request;
 const doc={schemaVersion:1,engine:'fabric-6',brandId:'fixture',canvas:{width:800,height:800},safeMargin:20,layoutPolicyVersion:2,protectedRegions:[],assets:[{id:'approved-logo',kind:'logo'}],fonts:[],objects:[{id:'photo',role:'photograph',type:'image',left:0,top:0,width:800,height:800,locked:true},{id:'logo',role:'logo',type:'image',assetId:'approved-logo',left:600,top:30,width:160,height:60}],compositionPolicy:{version:1,productRequired:false,reviewChecksVersion:2,approvedLogoOverlayVersion:1}};
 const runtime={store:{dir:()=>dir,save:async(id,name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value))},provider:{reason:async req=>{request=req;return {observations:req.schema.properties.observations.items.properties.check.enum.map(check=>({check,status:'pass',evidence:'Fixture pixels inspected'})),corrections:[],protectedRegions:[],overlaps:[],unresolvedOverlapIds:[]};}}};
 const result=await Q.reviewOnce(runtime,'id','overlay',doc,{data:'fixture-image',measurements:[]},{exactCopy:{fields:[]},artDirection:{},attachmentManifest:[]},{});
 assert.equal(result.status,'complete',result.error);
 assert.equal(request.images.length,1);assert.equal(request.schema.properties.corrections.maxItems,0);
 assert.doesNotMatch(request.instructions,/readability, logo|copy-fit, logo|logo check assesses|Check all colours|logo corrections/);
 assert.match(request.instructions,/no logo observation/);
});
for(const brandId of ['Duroflex','Sleepyhead']){
 test(brandId+': directly overlaid logo has no model approval requirement; legacy reviews retain theirs',()=>{
  const document={brandId,objects:[{id:'photo',role:'photograph'},{id:'logo',role:'logo'}],compositionPolicy:{reviewChecksVersion:2,approvedLogoOverlayVersion:1}};
  const checks=Q.schema(document).properties.observations.items.properties.check.enum;
  assert(!checks.includes('logo'));assert(checks.includes('readability'));
  const summary={status:'complete',reviewChecksVersion:2,approvedLogoOverlayVersion:1,compositionChecks:{issues:[]},observations:checks.map(check=>({check,status:'pass',evidence:'Pixels inspected'}))};
  assert.equal(readiness.assess(summary).ready,true);
  assert.equal(readiness.assess({...summary,approvedLogoOverlayVersion:undefined}).ready,false);
  assert(Q.schema({...document,compositionPolicy:{reviewChecksVersion:2}}).properties.observations.items.properties.check.enum.includes('logo'));
 });
 test(brandId+': typography repair enlarges and wraps without changing source, wording, font or logo',async()=>{
  const source={brandId,canvas:{width:1000,height:1000},safeMargin:30,compositionPolicy:{reading:{width:320,headlineCssPx:24,bodyCssPx:16}},protectedRegions:[{left:500,top:450,width:460,height:500}],objects:[{id:'logo',role:'logo',type:'image',left:750,top:30,width:200,height:60},{id:'headline',fieldId:'h',role:'headline',type:'text',text:'Rest better every night',fontId:'approved-bold',fontSize:40,left:40,top:130,width:400,height:60,lineHeight:1.16},{id:'body',fieldId:'b',role:'supporting-copy',type:'text',text:'Comfort that supports your everyday rest',fontId:'approved-regular',fontSize:30,left:40,top:240,width:400,height:40,lineHeight:1.16}]};
  const before=structuredClone(source);
  const render=async doc=>({measurements:doc.objects.map(o=>({...o,textHeight:o.text?Math.ceil(o.text.length*o.fontSize*.5/o.width)*o.fontSize*1.16:o.height}))});
  const result=await require('../../lib/creative-ai/runtime/typography-repair').reflow(source,render);
  assert.deepEqual(source,before);assert.deepEqual(result.document.objects[0],source.objects[0]);
  for(const o of result.document.objects.filter(o=>o.fieldId)){const old=source.objects.find(p=>p.id===o.id);assert.equal(o.text,old.text);assert.equal(o.fontId,old.fontId);assert(o.fontSize*320/1000>=(o.role==='headline'?24:16));assert(o.top+o.height<=970);assert(!source.protectedRegions.some(r=>require('../../lib/creative-ai/runtime/component-repair-tools').overlaps(r,o)));}
  assert(result.changes.length>0);
 });
 test(brandId+': typography repair fails locally when protected subject leaves no room',async()=>{
  const d={brandId,canvas:{width:100,height:100},safeMargin:5,compositionPolicy:{reading:{width:320,bodyCssPx:16}},protectedRegions:[{left:5,top:5,width:90,height:90}],objects:[{id:'body',fieldId:'b',role:'supporting-copy',type:'text',text:'Required wording',fontId:'approved',fontSize:10,left:5,top:5,width:80,height:20}]};
  await assert.rejects(require('../../lib/creative-ai/runtime/typography-repair').reflow(d,async doc=>({measurements:doc.objects.map(o=>({...o,textHeight:20}))})),/no clear space/i);
 });
}
