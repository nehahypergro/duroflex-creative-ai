'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fit}=require('../../lib/creative-ai/runtime/text-fitting');
const source={compositionPolicy:{version:1},layoutIntent:{hierarchy:['headline','support']},objects:[{id:'photo',type:'image',locked:true,assetId:'exact-photo'},{id:'headline',type:'text',fontSize:81,width:583.2,height:194.4,left:75.6,top:129.6,text:'Everyday time, together.',fontId:'actual-bold',fill:'#ffffff'},{id:'support',type:'text',fontSize:54,width:583.2,height:140.4,left:75.6,top:345.6,text:'Cocoon’s extra-deep seating.',fontId:'actual-regular',fill:'#ffffff'}]};
const measure=async d=>({measurements:d.objects.filter(o=>o.type==='text').map(o=>({id:o.id,width:o.width,textHeight:o.id==='headline'?(o.fontSize>67?289:180):131})),issues:[],contrast:[]});
test('fresh-run headline fits its allocated space without rewriting or moving the plan',async()=>{const original=structuredClone(source),initial=await measure(source),r=await fit(source,initial,measure);assert.equal(r.status,'fitted');assert.ok(r.document.objects[1].fontSize<=67);assert.ok(r.document.objects[1].fontSize>=66.5);assert.equal(r.changes.length,1);const restored=structuredClone(r.document);restored.objects[1].fontSize=81;assert.deepEqual(restored,source);assert.deepEqual(source,original);assert.ok(r.evaluations<=9);});
test('copy that cannot fit within the size floor remains unresolved, never silently tiny',async()=>{const render=async d=>({measurements:d.objects.filter(o=>o.type==='text').map(o=>({id:o.id,width:o.width,textHeight:999}))});const r=await fit(source,await render(source),render);assert.equal(r.status,'needs-attention');assert.equal(r.changes.length,0);assert.deepEqual(r.document,source);assert.equal(r.unresolved.length,2);});
test('missing measurements fail closed and already fitting copy is untouched',async()=>{const r=await fit(source,{measurements:[]},measure);assert.equal(r.status,'needs-attention');assert.equal(r.evaluations,0);assert.equal(r.changes.length,0);});
test('fitting copy is idempotent and does not grow or shrink a second time',async()=>{const a=await fit(source,await measure(source),measure),b=await fit(a.document,a.rendered,measure);assert.equal(b.status,'unchanged');assert.equal(b.evaluations,0);assert.deepEqual(b.document,a.document);});
test('locked text remains unchanged and reports its unresolved overflow',async()=>{const d=structuredClone(source);d.objects[1].locked=true;const r=await fit(d,await measure(d),measure);assert.equal(r.status,'needs-attention');assert.deepEqual(r.document,d);});

test('fitting never clears weak contrast or grants visual approval',async()=>{
 const doc={...structuredClone(source),canvas:{width:1080,height:1080},safeMargin:0};
 const render=async d=>({...await measure(d),contrast:d.objects.filter(o=>o.type==='text').map(o=>({id:o.id,status:o.id==='support'?'fail':'pass',minimumRatio:o.id==='support'?3.23:6}))});
 const result=await fit(doc,await render(doc),render);
 assert.equal(result.status,'fitted');
 const checks=require('../../lib/creative-ai/runtime/editable-quality').compositionChecks(result.document,result.rendered);
 assert.equal(checks.status,'needs-attention');assert.equal(checks.visualApproval,false);assert.ok(checks.issues.some(i=>/support.*contrast/i.test(i)));
});
