'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),{EditableCanvases}=require('../../lib/creative-ai/runtime/editable'),model=require('../../public/creative-ai/canvas-model');
test('separate evidence and readiness statuses preserve bounded scope recovery',()=>{
 const {canReverifyScope}=require('../../lib/creative-ai/runtime/component-repair');
 const review={status:'unavailable',readiness:{status:'verification-pending'},error:'Failed subject overlap must identify affected layers and observed regions'};
 assert.equal(canReverifyScope({},review),true);
 assert.equal(canReverifyScope({verificationHistory:[{reason:'Correct editable-overlay versus photographic obstruction review scope'}]},review),false);
});
for(const brandId of ['Duroflex','Sleepyhead'])test(brandId+': editor review applies only to the reviewed document and current revision',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'review-binding-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(root),id='creative-binding',document={brandId,objects:[]};await store.save(id,'job.json',{id,intake:{brandId}});
 const review={status:'complete',requiresManualReview:true,compositionChecks:{documentHash:crypto.createHash('sha256').update(JSON.stringify(document)).digest('hex'),issues:[]},observations:['readability','copy-fit','logo','subject-occlusion','photograph'].map(check=>({check,status:'pass'}))};
 const state={revision:2,document,review};await store.save(id,'editable-continuity-post.json',state);
 const editor=new EditableCanvases({store}),saved=await editor.read(id,'continuity','post');
 assert.equal(saved.verifiedRevision,2);assert.deepEqual(model.reviewNotes(saved,document),[]);
 assert.match(model.reviewNotes(saved,{...document,objects:[{text:'Changed'}]}).join(' '),/Manual edits/);
 assert.match(model.reviewNotes({...saved,revision:3},document).join(' '),/Manual edits/);
 await store.save(id,'editable-continuity-post.json',{...state,document:{...document,objects:[{text:'Saved change'}]}});
 assert.equal((await editor.read(id,'continuity','post')).verifiedRevision,null);
 await store.save(id,'editable-continuity-post.json',{...state,review:{...review,correctionError:'Proposed changes remain unapplied'}});
 assert.equal((await editor.read(id,'continuity','post')).verifiedRevision,null);
 assert.equal(JSON.parse(await fs.readFile(path.join(root,id,'editable-continuity-post.json'))).review.requiresManualReview,true,'read projection does not rewrite historical review evidence');
});
