'use strict';
// Regression (25 Nov 2026, local picture test, Neha: "Yes, fix them"). Both picture-test jobs first stopped with
// "Reasoning reference transfer failed before paid dispatch (REFERENCE_UPLOAD_TIMEOUT)." The 22 Nov sentence ("… took longer
// than … to upload; nothing was charged …") never reached the job because the bare code was kept, and the project page read
// "TIMEOUT" as a slow paid step: "Creation took longer than the allowed time … earlier charges may still apply", although
// that step was never sent. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const media=require('../../lib/creative-ai/runtime/reasoning-media');
function model(){const context={window:{},TextEncoder};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../public/creative-ai/canvas-model.js'),'utf8'),context);return context.window.CreativeCanvasModel;}
const body=()=>({input:[{role:'user',content:[{type:'input_image',image_url:'data:image/png;base64,'+Buffer.alloc(64,1).toString('base64')}]}]});
const SENTENCE='Product pictures took longer than 160 s to upload (3 of 7 done); nothing was charged. Continue retries; finished uploads are reused.';
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': an upload time-out keeps its own sentence instead of the bare code',async()=>{
  const budget={brandContext:async()=>({intake:{brandId:'brand-'+brand.toLowerCase()}}),remainingMs:async()=>600000};
  await assert.rejects(media.prepare(body(),budget,async()=>{throw Object.assign(Error(SENTENCE),{code:'REFERENCE_UPLOAD_TIMEOUT'});}),e=>{
   assert.equal(e.code,'REASONING_REFERENCE_UPLOAD_FAILED');assert.match(e.message,/took longer than 160 s/);assert.match(e.message,/nothing was charged/);
   assert.doesNotMatch(e.message,/REFERENCE_UPLOAD_TIMEOUT/);return true;});
  // A time-out with no sentence of its own still says nothing was charged.
  await assert.rejects(media.prepare(body(),budget,async()=>{throw Object.assign(Error('No time remains for reference staging.'),{code:'REFERENCE_UPLOAD_TIMEOUT'});}),e=>/nothing was charged/.test(e.message)&&!/REFERENCE_UPLOAD_TIMEOUT/.test(e.message));
  // Other upload failures keep the earlier wording.
  await assert.rejects(media.prepare(body(),budget,async()=>{throw Object.assign(Error('socket hang up'),{code:'ECONNRESET'});}),e=>/before paid dispatch \(ECONNRESET\)/.test(e.message));
 });
 test(brand+': the stopped project page does not say charges may apply for a step that was never sent',()=>{
  const m=model();
  for(const raw of ['Reasoning reference transfer failed before paid dispatch (REFERENCE_UPLOAD_TIMEOUT).',SENTENCE]){
   const shown=m.clientError(raw,'generation');
   assert.doesNotMatch(shown,/charges may still apply|longer than the allowed time/,raw);
   assert.match(shown,/upload/i,raw);assert.match(shown,/not charged/,raw);assert.match(shown,/Your brief is saved/,raw);
  }
  // A real time-out of a paid step keeps the cautious sentence.
  assert.match(m.clientError('Job time budget reached','generation'),/earlier charges may still apply/);
 });
}
