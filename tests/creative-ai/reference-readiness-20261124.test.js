'use strict';
// Poonam's live brief (24 Nov 2026, Error CA-101 on a Duroflex Octave WhatsApp Image + Instagram Post): a picture added
// with "Add reference" stays on the device (Creative reference v1, 10 Nov 2026), but readiness still refused every
// device-only reference (22 Oct rule), so every brief with an attached picture failed, as "Not a design reference" and
// as the design reference alike. The page then hid the server's reason behind "did not provide a recognisable reason".
// Both brands; every test here fails before the fix.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../../public/creative-ai/studio-model');
const root=path.resolve(__dirname,'../..');
const cases=[['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','product-3566a343eb36f945fd10'],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','product-985736dbde7586ad61c7']];
const PICTURE='data:image/jpeg;base64,'+Buffer.from('test-picture').toString('base64');
let policyRoot;
test.before(async()=>{const od=require('../../lib/creative-ai/runtime/original-delivery'),prepare=od.prepare;policyRoot=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'reference-readiness-'));fs.writeFileSync(path.join(policyRoot,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));test.mock.method(od,'prepare',(_root,intake)=>prepare(policyRoot,intake));
 // The design picture is saved in the brand's own store at readiness; keep this suite out of the real store.
 test.mock.method(require('../../lib/creative-ai/runtime/creative-reference'),'save',async(_root,brandId,input)=>({version:1,name:input.name,use:input.use,sha256:'b'.repeat(64),width:10,height:10,brandId}));});
test.after(()=>{test.mock.restoreAll();if(policyRoot)fs.rmSync(policyRoot,{recursive:true,force:true});});

async function fixture([brandId,productId],references=[],extra={}){
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');const runtime=new CreativeRuntime({root,provider:{reason(){assert.fail('No paid call');},generate(){assert.fail('No paid call');}}});
 await require('./helpers/pinned-research-fixture').pin(runtime,brandId);const p=await runtime.brands.products.read(brandId,productId);
 const d=M.startAssetDraft(brandId,['whatsapp-image','instagram-post']);
 Object.assign(d,{intakeVersion:d.intakeVersion||2,brief:'create an ad for christmas',objective:'Awareness',messageType:'Product launch',focus:'product',productId:p.id,productName:p.name,variant:String(p.variants[0].id),rtbs:'3 premium fabric options',references});
 M.confirmRequirements(d);Object.assign(d,extra);// the page adds the design picture after confirming, as studio.js does
 return {runtime,d};
}
const picture={id:'ref-1',name:'ee3957a63c0faa8cd0de00bf713aa1eb.jpg',bytes:165994,kind:'device-file',readability:{status:'readable'}};

for(const c of cases)test(c[0].slice(0,14)+': a picture left as "Not a design reference" is listed as not used, never a reason to refuse the brief',async()=>{
 const g=require('../../lib/creative-ai/runtime/studio-generation');
 const {runtime,d}=await fixture(c,[picture,{id:'ref-2',name:'brief-notes.pdf',bytes:9000,kind:'device-file'}]),r=await g.prepare(runtime,d);
 const bare=M.clone(d);bare.references=[];M.confirmRequirements(bare);const plain=await g.prepare(runtime,bare);
 assert.deepEqual(r.blocked,[]);
 assert.deepEqual(r.notes,['Not used in the design: “ee3957a63c0faa8cd0de00bf713aa1eb.jpg” (set to “Not a design reference”). To use a picture, choose how next to its name, for example “Match its look”.','Not used in the design: “brief-notes.pdf”. Only a picture can guide the design.'],'listed once for the whole brief');
 // Only the source draft's own fingerprint (and the keys built from it) may differ.
 const made=x=>{const {sourceStudioDraftHash,requestKey,studioReadinessToken,...rest}=x.prepared.request;return rest;};
 assert.deepEqual(r.request.campaignChildren.map(made),plain.request.campaignChildren.map(made),'the unused picture changes nothing that is made');
 assert.ok(r.request.campaignChildren.every(x=>!x.prepared.request.creativeReference));
});

for(const c of cases)test(c[0].slice(0,14)+': the design reference picture passes readiness and reaches every format',async()=>{
 const g=require('../../lib/creative-ai/runtime/studio-generation');
 const {runtime,d}=await fixture(c,[{...picture,creativeUse:['look']}],{creativeReference:{name:picture.name,use:['look'],imageData:PICTURE}}),r=await g.prepare(runtime,d);
 assert.deepEqual(r.blocked,[]);assert.equal(r.notes,undefined);
 for(const x of r.request.campaignChildren){assert.equal(x.prepared.request.creativeReference.name,picture.name);assert.deepEqual(x.prepared.request.creativeReference.use,['look']);}
 // A design picture that did not arrive is named once, not once per format.
 const missing=await fixture(c,[{...picture,creativeUse:['look']}]);
 await assert.rejects(()=>g.prepare(missing.runtime,missing.d),e=>e.message==='The reference picture “ee3957a63c0faa8cd0de00bf713aa1eb.jpg” is not saved on this device. Add it again.');
});

test('readiness shows the reason the server gives for a brief that needs a change, and still hides technical failures',()=>{
 const sandbox={window:{},console};vm.runInNewContext(fs.readFileSync(path.join(root,'public/creative-ai/canvas-model.js'),'utf8'),sandbox);const m=sandbox.window.CreativeCanvasModel;
 const generic=/did not provide a recognisable reason/;
 for(const brand of ['Duroflex','Sleepyhead']){
  const shown=m.clientError({status:400,message:'WhatsApp Image: Select at least one feature or add a reason to believe for this '+brand+' product. Instagram Post: Choose a supported message type.',clientCode:'CA-101',reference:'CAI-B62C4FB84196'},'readiness');
  assert.doesNotMatch(shown,generic);assert.match(shown,new RegExp('Select at least one feature or add a reason to believe for this '+brand+' product'));assert.match(shown,/Choose a supported message type/);assert.match(shown,/Error CA-101 · Reference CAI-B62C4FB84196$/);
  assert.match(m.clientError({status:422,message:'The reference picture “'+brand+'-mood.jpg” is not saved on this device. Add it again.',clientCode:'CA-101'},'readiness'),new RegExp(brand+'-mood\\.jpg'));
 }
 for(const message of ["Cannot read properties of undefined (reading 'id')",'x is not a function','Agent output failed the schema','Unexpected token < in JSON at position 0','ENOENT: no such file, open /app/output/x.json'])
  assert.match(m.clientError({status:400,message},'readiness'),generic,message);
 assert.match(m.clientError({status:500,message:'Select at least one feature.'},'readiness'),/unexpected problem/);
});
