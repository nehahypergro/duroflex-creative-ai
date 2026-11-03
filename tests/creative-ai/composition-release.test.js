'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const quality=require('../../lib/creative-ai/runtime/editable-quality');
const doc={canvas:{width:1000,height:1000},safeMargin:0,compositionPolicy:{version:1},objects:[{id:'headline',type:'text',role:'headline',fontSize:40,width:400,height:100,left:20,top:20},{id:'body',type:'text',role:'supporting-copy',fontSize:20,width:400,height:100,left:20,top:200}]};
const measured=doc.objects.map(o=>({...o,textHeight:40}));
const render=(a,b)=>({measurements:measured,issues:[],contrast:[{id:'headline',minimumRatio:a,status:a>=4.5?'pass':'fail'},{id:'body',minimumRatio:b,status:b>=4.5?'pass':'fail'}]});
test('a correction cannot trade a failing headline for a failing body',()=>{
 assert.throws(()=>quality.acceptCorrection(doc,render(3,8),render(8,3)),/body.*contrast/i);
});
test('a correction cannot worsen the same failing layer at equal issue count',()=>{
 assert.throws(()=>quality.acceptCorrection(doc,render(3,8),render(2,8)),/headline.*contrast/i);
});
test('explicit placement failure rejects correction before selection',()=>{
 const next=render(8,8);next.issues=['headline: measured bounds exceed the explicit brief safe area.'];
 assert.throws(()=>quality.acceptCorrection(doc,render(8,8),next),/explicit brief safe area/);
});
test('missing text measurements cannot count as fit',()=>{
 const next=render(8,8);next.measurements=next.measurements.slice(1);
 assert.throws(()=>quality.acceptCorrection(doc,render(8,8),next),/headline.*measur/i);
});
test('unknown contrast cannot replace sampled evidence',()=>{
 const next=render(8,8);next.contrast[0]={id:'headline',status:'unknown',minimumRatio:null};
 assert.throws(()=>quality.acceptCorrection(doc,render(8,8),next),/headline.*contrast/i);
});
test('measured correction preserving clear text is accepted',()=>{
 assert.doesNotThrow(()=>quality.acceptCorrection(doc,render(3,8),render(7,6)));
});

test('measured glyph overflow cannot be accepted as a correction',()=>{
 const next=render(8,8);next.measurements=structuredClone(measured);next.measurements[0].textHeight=140;
 assert.throws(()=>quality.acceptCorrection(doc,render(8,8),next),/headline.*overflow/i);
});
test('missing contrast is attention, never a pass',()=>{
 const next=render(8,8);next.contrast=[];
 const check=quality.compositionChecks(doc,next);assert.equal(check.status,'needs-attention');assert.equal(check.visualApproval,false);assert.equal(check.issues.filter(i=>/contrast/.test(i)).length,2);
});
