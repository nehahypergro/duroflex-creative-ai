'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('path'),fs=require('fs/promises'),os=require('os'),crypto=require('crypto');
const branding=require('../../lib/creative-ai/runtime/campaign-branding');
const root=path.resolve(__dirname,'../..'),workspace=require('../../workspace.json');
test('campaign presentation logos resolve by exact brand, preserve source bytes and aspect ratio',async()=>{
 const logos=[];
 for(const brand of workspace.brands){
  const logo=await branding.load({root,brands:{read:async()=>brand}},{intake:{brandId:brand.id,brandUrl:brand.brandUrl}});
  assert.equal(logo.name,brand.name);assert.equal(logo.brandId,brand.id);
  assert.deepEqual(logo.bytes,await fs.readFile(path.join(root,logo.source)));
  assert.equal(logo.sha256,crypto.createHash('sha256').update(logo.bytes).digest('hex'));
  assert.equal(branding.metadata(logo).bytes,undefined);
  const size=branding.fit(logo,280,46);assert.ok(size.width<=280&&size.height<=46);
  assert.ok(Math.abs(size.width/size.height-logo.width/logo.height)<1e-10);
  logos.push(logo.sha256);
 }
 assert.notEqual(logos[0],logos[1]);
});
test('presentation branding rejects foreign identity and missing logo instead of substituting another brand',async t=>{
 const [duroflex,sleepyhead]=workspace.brands;
 const job={intake:{brandId:duroflex.id,brandUrl:duroflex.brandUrl}};
 await assert.rejects(()=>branding.load({root,brands:{read:async()=>sleepyhead}},job),/does not match/);
 await assert.rejects(()=>branding.load({root,brands:{read:async()=>duroflex}},{intake:{...job.intake,brandUrl:sleepyhead.brandUrl}}),/does not match/);
 const empty=await fs.mkdtemp(path.join(os.tmpdir(),'campaign-branding-'));t.after(()=>fs.rm(empty,{recursive:true,force:true}));
 await assert.rejects(()=>branding.load({root:empty,brands:{read:async()=>duroflex}},job),/logo is unavailable/);
 assert.equal(await branding.load({root,brands:{read:async()=>{throw Error('must not read unrelated brand');}}},{intake:{brandId:'brand-unrelated'}}),null);
});
