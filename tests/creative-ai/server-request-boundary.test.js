'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http'),{fork}=require('node:child_process');
const serverModule=path.resolve(__dirname,'../../server');
async function get(port,target){return new Promise((resolve,reject)=>{const req=http.get({host:'127.0.0.1',port,path:target,headers:{Connection:'close'}},res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);req.setTimeout(3000,()=>req.destroy(Error('Request timeout')));});}
for(const authenticated of [false,true])test('malformed request is contained and next request works; access='+authenticated,{timeout:10000},async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'request-boundary-'));let child;t.after(async()=>{if(child&&child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}await fs.rm(root,{recursive:true,force:true});});
 await fs.writeFile(path.join(root,'workspace.json'),JSON.stringify({name:'Isolated request test',brands:[{id:'brand-duroflex',name:'Duroflex',brandUrl:'https://www.duroflexworld.com/'}]}));
 const script=path.join(root,'fixture.cjs');await fs.writeFile(script,`const app=require(${JSON.stringify(serverModule)}).createServer({root:${JSON.stringify(root)},resumeJobs:false,provider:{},access:${authenticated?"{handle:async()=>false,actor:async()=>null}":'undefined'}});app.server.listen(0,'127.0.0.1',()=>process.send({port:app.server.address().port}));`);
 let stderr='';child=fork(script,[],{silent:true,execArgv:[]});child.stderr.on('data',b=>stderr+=b);
 const port=await new Promise((resolve,reject)=>{child.once('message',m=>resolve(m.port));child.once('exit',code=>reject(Error('Server exited '+code+': '+stderr)));});
 for(const target of ['//[','http://[','///[']){let response;try{response=await get(port,target);}catch(e){assert.fail('Malformed target terminated request/server: '+e.message+' '+stderr);}assert.equal(response.status,400);}
 assert.equal(child.exitCode,null,'Server must remain alive');const next=await get(port,'/creative-ai/api/workspace');assert.equal(next.status,authenticated?401:200,'Authentication must still protect private routes');
 const shared=await get(port,'/creative-ai/shared/'+'a'.repeat(64)+'/info');assert.equal(shared.status,404,'Valid share routes still reach capability lookup');
});
test('public route predicate is safe for malformed targets',()=>{const {matches}=require('../../lib/creative-ai/runtime/editor-sharing');assert.equal(matches('//['),false);assert.equal(matches('/creative-ai/shared/'+'a'.repeat(64)),true);assert.equal(matches('/creative-ai/api/jobs'),false);});
