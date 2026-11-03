'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const composition=require('../../lib/creative-ai/runtime/editable-composition');
const {fit}=require('../../lib/creative-ai/runtime/text-fitting');
const quality=require('../../lib/creative-ai/runtime/editable-quality');
const plan=()=>({contractVersion:2,safeMargin:.03,text:[{fieldId:'h',role:'headline',x:.08,y:.1,width:.5,height:.2,fontId:'font',fontSize:.08,minFontSize:.07,maxLines:2,minContrastRatio:7,surface:'Quiet dark wall above the subject',colour:'#ffffff',align:'left',lineHeight:1.1,buttonBackground:null,buttonPadding:0,reason:'First read; leave product unobstructed'}],logo:null,protectedRegions:[{id:'subject',kind:'person',x:.65,y:.4,width:.25,height:.5,reason:'Keep the person clear'}]});
const spec={text:[{fieldId:'h',delivery:'embedded'}]};
for(const brandId of ['Duroflex','Sleepyhead']){
 const assets={brandId,fonts:[{id:'font',brandId}],logos:[]};
 test(brandId+': upstream constraints are valid and protected placement is enforced',()=>{
  assert.doesNotThrow(()=>composition.validate(plan(),spec,assets,false));
  const overlap=plan();overlap.text[0].x=.6;overlap.text[0].width=.3;overlap.text[0].y=.45;
  assert.throws(()=>composition.validate(overlap,spec,assets,false),/protected.*subject/i);
  const small=plan();small.text[0].minFontSize=.09;
  assert.throws(()=>composition.validate(small,spec,assets,false),/minimum.*font/i);
  const edge=plan();edge.text[0].x=0;
  assert.throws(()=>composition.validate(edge,spec,assets,false),/safe margin/i);
 });
}
function document(){return {canvas:{width:1000,height:1000},safeMargin:0,compositionPolicy:{version:1},layoutIntent:{layout:plan()},objects:[{id:'h',fieldId:'h',role:'headline',type:'text',fontSize:80,left:80,top:100,width:500,height:200,text:'Exact copy',fill:'#ffffff'}]};}
const measured=(d,size=65)=>({measurements:d.objects.map(o=>({...o,textHeight:o.fontSize>size?300:100,lineCount:o.fontSize>size?3:2})),contrast:[{id:'h',status:'pass',minimumRatio:8}],issues:[]});
test('fitter never reduces text below the art director’s readable minimum',async()=>{
 const d=document(),render=async d=>measured(d),r=await fit(d,await render(d),render);
 assert.equal(r.status,'needs-attention');assert.equal(r.changes.length,0);assert.equal(r.document.objects[0].fontSize,80);
});
test('max lines is enforced even when glyphs fit in the box',async()=>{
 const d=document(),render=async d=>({...measured(d,100),measurements:d.objects.map(o=>({...o,textHeight:100,lineCount:3}))});
 const r=await fit(d,await render(d),render);assert.equal(r.status,'needs-attention');assert.equal(r.changes.length,0);
});
test('successful fitting preserves exact copy and placement within the planned font range',async()=>{
 const d=document(),render=async d=>measured(d,75),r=await fit(d,await render(d),render);
 assert.equal(r.status,'fitted');assert.equal(r.changes.length,1);
 const fitted=r.document.objects[0];assert.ok(fitted.fontSize>=70&&fitted.fontSize<=75);
 assert.deepEqual({...fitted,fontSize:80},d.objects[0]);
 assert.deepEqual(r.document.layoutIntent,d.layoutIntent);
 assert.ok(r.evaluations<=9);
});
test('missing line measurements cannot silently pass the planned line limit',async()=>{
 const d=document(),render=async d=>{const r=measured(d,100);delete r.measurements[0].lineCount;return r;};
 const r=await fit(d,await render(d),render);assert.equal(r.status,'needs-attention');
 assert.equal(r.changes.length,0);assert.equal(r.evaluations,0);
});
test('user-added text remains editable but generated text cannot lose its contract binding',()=>{
 const {limits}=require('../../lib/creative-ai/runtime/typography-contract'),d=document();
 assert.equal(limits(d,{id:'user-heading',type:'text'}),null);
 assert.throws(()=>limits(d,{id:'h',type:'text'}),/missing.*contract/i);
});
test('clean artwork receives planned surfaces and contrast without promotional copy',()=>{
 const d=document();d.objects[0].text='PROMOTIONAL_COPY_SENTINEL';
 const prompt=require('../../lib/creative-ai/runtime/editable').photoPrompt({artDirection:{},lockedRules:[]},d);
 assert.ok(prompt.includes('Quiet dark wall above the subject'));
 assert.ok(prompt.includes('"minContrastRatio":7'));assert.ok(prompt.includes('"maxLines":2'));
 assert.ok(!prompt.includes('PROMOTIONAL_COPY_SENTINEL'));
});
test('local release rejects a correction below minimum size, line limit or planned contrast',()=>{
 const d=document();d.objects[0].fontSize=60;
 const r=measured(d);r.measurements[0].lineCount=3;r.contrast[0].minimumRatio=5;
 const checks=quality.compositionChecks(d,r);
 assert.ok(checks.issues.some(i=>/minimum.*font/i.test(i)));
 assert.ok(checks.issues.some(i=>/line limit/i.test(i)));
 assert.ok(checks.issues.some(i=>/contrast.*7/i.test(i)));
 assert.equal(checks.visualApproval,false);
});
test('new reconciliation responses require the explicit design limits',()=>{
 const request={wire:{kind:'typed-reconciliation-v2',schema:{type:'object',properties:{adjustments:{type:'array',items:{type:'object',properties:{},required:[]}}}},input:{},instructions:''}};
 const r=composition.makeRequest(request,{brandId:'Duroflex',fonts:[],logos:[]},()=>{});
 const schema=r.wire.schema.properties.adjustments.items.properties.overlayLayout;
 assert.ok(schema.required.includes('contractVersion'));
 for(const key of ['minFontSize','maxLines','minContrastRatio','surface'])assert.ok(schema.properties.text.items.required.includes(key),key);
});
