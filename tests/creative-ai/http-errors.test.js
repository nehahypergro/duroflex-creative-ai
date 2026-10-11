'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs/promises'),path=require('path'),os=require('os');
const {createHandler}=require('../../lib/creative-ai/runtime/http');

test('failed creative saves report disk exhaustion without leaking internal paths',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'creative-http-errors-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const app=createHandler({root,dossierStore:{}});
 app.runtime.refinements.create=async()=>{throw Object.assign(new Error("ENOSPC: open '/private/internal/job.json.pending'"),{code:'ENOSPC'});};
 let status,body;
 const res={writeHead(code){status=code;},end(value){body=JSON.parse(value);}};
 assert.equal(await app.handle({method:'POST'},res,'/creative-ai/api/jobs/creative-test/versions',async()=>({})),true);
 assert.equal(status,507);
 assert.match(body.error,/Free some space and try again/);
 assert.doesNotMatch(body.error,/private|pending|ENOSPC/);
});
