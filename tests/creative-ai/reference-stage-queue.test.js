'use strict';
// Regression (8 Nov 2026, jobs creative-3e50ce1b and creative-360c829a): with more jobs running
// at once, "Reasoning reference transfer failed before paid dispatch" exactly 2 minutes after the
// stage began. The 2-minute staging window started before waiting for a slot in the shared
// upload gate, so queue time used it up. The window must start once a slot is acquired.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const cdn=require('../../lib/creative-ai/runtime/cdn-media');
const {stage}=require('../../lib/creative-ai/runtime/image-reference-stage');
const {Gate}=require('../../lib/creative-ai/runtime/image-upload');

test('waiting for an upload slot does not use up the staging window',async t=>{
 const bytes=crypto.randomBytes(2048),sha=crypto.createHash('sha256').update(bytes).digest('hex');
 const server=http.createServer((req,res)=>res.end(bytes));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'reference-stage-'));
 await fs.writeFile(path.join(dir,'job.json'),JSON.stringify({intake:{brandId:'brand-test'}}));
 const saved={scope:cdn.scope,config:cdn.config,publish:cdn.publish,safeUrl:cdn.safeUrl};
 Object.assign(cdn,{scope:()=>({root:dir}),config:async()=>({enabled:true}),safeUrl:()=>true,publish:async()=>({brandId:'brand-test',sha256:sha,bytes:bytes.length,url:'http://127.0.0.1:'+server.address().port+'/ref'})});
 t.after(async()=>{Object.assign(cdn,saved);server.close();await fs.rm(dir,{recursive:true,force:true});});
 const gate=new Gate(1);let release;const held=gate.run(()=>new Promise(r=>release=r));
 setTimeout(()=>release(),300); // another job holds the only slot for 300 ms
 const budget={brandContext:async()=>({intake:{brandId:'brand-test'},dir}),remainingMs:async()=>600000};
 const started=Date.now(),refs=await stage([{assetId:'ref-1',type:'png',bytes}],budget,{gate,maxStageMs:150});
 assert.ok(Date.now()-started>=280,'it waited for the busy slot');
 assert.equal(refs.length,1);assert.equal(refs[0].sha256,sha);await held;
});

test('a staging failure keeps its underlying cause in the job error',async()=>{
 const media=require('../../lib/creative-ai/runtime/reasoning-media');
 const body={input:[{role:'user',content:[{type:'input_image',image_url:'data:image/png;base64,'+Buffer.from('x').toString('base64')}]}]};
 await assert.rejects(media.prepare(body,{},async()=>{throw Object.assign(Error('Reference upload time budget reached before generation.'),{code:'REFERENCE_UPLOAD_TIMEOUT'});}),e=>e.code==='REASONING_REFERENCE_UPLOAD_FAILED'&&/REFERENCE_UPLOAD_TIMEOUT/.test(e.message));
});
