'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {photoPrompt}=require('../../lib/creative-ai/runtime/editable');
const {generationSize}=require('../../lib/creative-ai/runtime/placements');
for(const brandId of ['Duroflex','Sleepyhead'])for(const [width,height] of [[1200,627],[1000,1000],[2000,200],[200,2000]]){
 test(brandId+': photo reservations map into generated pixels and retained crop '+width+'x'+height,()=>{
  const doc={brandId,canvas:{width,height},objects:[{type:'text',role:'headline',text:'DO_NOT_RENDER_THIS_COPY',left:width*.05,top:height*.1,width:width*.4,height:height*.2,fill:'#111111'}],protectedRegions:[{id:'sofa',kind:'product',left:width*.55,top:height*.4,width:width*.4,height:height*.5}],assets:[]};
  const prompt=photoPrompt({artDirection:{},lockedRules:[]},doc);
  const line=prompt.split('\n').find(x=>x.startsWith('MODEL-CANVAS RESERVATIONS: '));assert.ok(line,'image model needs coordinates in its own canvas');
  const guide=JSON.parse(line.slice('MODEL-CANVAS RESERVATIONS: '.length)),g=generationSize(width,height);
  assert.deepEqual(guide.canvas,{width:g.width,height:g.height});assert.deepEqual(guide.retainedCrop,g.crop);
  const b=guide.overlayExclusions[0],s=g.crop.width/width;
  assert.ok(Math.abs(b.pixels.left-(g.crop.x+doc.objects[0].left*s))<.011);
  assert.ok(Math.abs(b.pixels.top-(g.crop.y+doc.objects[0].top*s))<.011);
  assert.ok(Math.abs(b.pixels.width-doc.objects[0].width*s)<.011);
  assert.ok(Math.abs(b.percent.left-100*b.pixels.left/g.width)<.011);
  assert.equal(guide.subjectEnvelopes[0].id,'sofa');assert.equal(guide.subjectEnvelopes[0].kind,'product');
  assert.match(prompt,/entire silhouette|whole silhouette/);assert.match(prompt,/furniture|props/);assert.match(prompt,/percentages.*model canvas/);
  assert.ok(!prompt.includes('DO_NOT_RENDER_THIS_COPY'));assert.equal(doc.objects[0].left,width*.05);
 });
}
test('saved Cocoon failure retains its failed visual review and maps the actual text and whole-subject regions',()=>{
 const fs=require('node:fs'),path=require('node:path'),dir=path.resolve(__dirname,'../../output/creative-ai/jobs/creative-b4becbb8-cfeb-4151-bf6f-e9aff2e98fc7'),k='continuity-custom_studio-linkedin-post';
 const names=[`editable-${k}.json`,`editable-review-outcome-${k}.json`,`editable-text-fitting-${k}.json`],before=names.map(n=>fs.readFileSync(path.join(dir,n))),state=JSON.parse(before[0]),review=JSON.parse(before[1]),fitting=JSON.parse(before[2]);
 assert.deepEqual(fitting.unresolved,[]);assert.ok(review.observations.some(o=>o.status==='fail'));
 const prompt=photoPrompt({artDirection:{},lockedRules:[]},state.document),line=prompt.split('\n').find(x=>x.startsWith('MODEL-CANVAS RESERVATIONS: '));assert.ok(line);
 const guide=JSON.parse(line.slice('MODEL-CANVAS RESERVATIONS: '.length));assert.equal(guide.overlayExclusions.length,4);assert.equal(guide.subjectEnvelopes.length,state.document.protectedRegions.length);
 assert.ok(guide.subjectEnvelopes.every(r=>r.pixels.height>0));assert.deepEqual(names.map(n=>fs.readFileSync(path.join(dir,n))),before);
});
