'use strict';
// Exact fresh-run evidence. Subject bounds are manual annotations of the saved
// pixels, not inferred from the intended layout or automatic visual approval.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const evidence=path.join(root,'work/text-composition-live-20261101');
const original=path.join(root,'output/creative-ai/jobs/creative-0767c1b6-ae9b-454d-b72c-17008ad3cc12/editable-continuity-custom_studio-social-square-original.json');
const files=[original,path.join(evidence,'fitting.json'),path.join(evidence,'fitted.png')];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('fresh Cocoon artwork: fitted text preserves strategy but weak contrast and subject overlap remain blocked',{skip:files.some(f=>!fs.existsSync(f))},()=>{
 const bytes=files.map(f=>fs.readFileSync(f)),before=bytes.map(hash);
 const source=JSON.parse(bytes[0]),fit=JSON.parse(bytes[1]),doc=fit.document;
 assert.equal(hash(bytes[2]),'5994d9118b88c6fd5bb73849cc2bbcbd2579eff7e989a1ab81f33aff749d2a87');
 assert.deepEqual(Buffer.from(fit.rendered.data.split(',')[1],'base64'),bytes[2]);
 assert.equal(doc.brandId,'brand-1923d633-e03e-44cc-84b2-bbfb5c152710');
 assert.equal(fit.status,'fitted');
 const restored=structuredClone(doc);
 for(const change of fit.changes){
  const obj=restored.objects.find(o=>o.id===change.id);
  assert.ok(obj.fontSize>=change.from*.75);
  obj.fontSize=change.from;
 }
 assert.deepEqual(restored,source,'Only bounded font sizing may change; retain copy, placement and upstream intent');
 for(const obj of doc.objects.filter(o=>o.type==='text')){
  const measurement=fit.rendered.measurements.find(m=>m.id===obj.id);
  assert.ok(measurement.textHeight<=obj.height+1,obj.id+' must fit its planned height');
 }
 const checks=require('../../lib/creative-ai/runtime/editable-quality').compositionChecks(doc,fit.rendered);
 assert.equal(checks.visualApproval,false);
 assert.equal(checks.status,'needs-attention');
 assert.ok(checks.issues.some(i=>/copy-2.*contrast/i.test(i)));
 const regions=[{id:'observed-sofa',kind:'product',left:90,top:515,width:915,height:430}];
 const overlaps=require('../../lib/creative-ai/runtime/composition-guards').collisions(doc,fit.rendered.measurements,regions);
 assert.ok(overlaps.some(o=>o.layerId==='copy-2'),'Fitting alone must not be mistaken for a placement repair');
 assert.deepEqual(files.map(f=>hash(fs.readFileSync(f))),before,'Evidence remains immutable');
});
