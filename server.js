'use strict';
const http=require('http'),path=require('path');
const ROOT=__dirname;
async function readJsonBody(req,maxBytes){let bytes=0,parts=[];for await(const part of req){bytes+=part.length;if(bytes>maxBytes)throw Error('Request is too large.');parts.push(part);}const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)),body=require('./lib/creative-ai/runtime/strict-json').parse(text||'{}');if(!body||typeof body!=='object'||Array.isArray(body))throw Error('JSON request body must be an object.');return body;}
function createServer({root=ROOT,resumeJobs=true,provider}={}){
 if(process.env.NODE_TEST_CONTEXT&&path.resolve(root)===ROOT)throw Error('Tests must provide an isolated workspace root.');
 const policy=require('./lib/group-workspace').groupPolicy(root);
 const dossierStore=require('./lib/brand-dossier').createDossierStore(path.join(root,'output/brand-dossiers'));
 const app=require('./lib/creative-ai/runtime/http').createHandler({root,dossierStore,provider,resumeJobs});policy.mount(app.runtime);
 const costs=new (require('./lib/cost-tracker').CostTracker)(root,policy.config);
 const server=http.createServer(async(req,res)=>{
  try{
   const requestHost=req.headers.host||'',hostName=new URL('http://'+requestHost).hostname;if(!['127.0.0.1','localhost','[::1]'].includes(hostName))throw Error('This pilot accepts local connections only.');if(req.headers.origin&&new URL(req.headers.origin).host!==requestHost)throw Error('Cross-origin requests are not allowed.');const pathname=new URL(req.url,'http://localhost').pathname;
   if(pathname==='/'){res.writeHead(302,{Location:'/creative-ai'});res.end();return;}
   if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok',workspace:policy.config.name,brands:policy.config.brands.map(b=>b.name)}));return;}
   if(pathname==='/creative-ai/api/costs'){if(req.method==='GET'){const value=await costs.snapshot();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}else if(req.method==='POST'){const value=await costs.add(await readJsonBody(req,12000));res.writeHead(201,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}else throw Error('Unsupported cost action');return;}
   if(pathname==='/creative-ai/api/workspace'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(policy.config));return;}
   if(pathname.startsWith('/dossiers/')&&pathname!=='/dossiers/demo'&&await dossierStore.handle(req,res,pathname,readJsonBody))return;
   // Check file downloads as well as metadata; internal files must not bypass the group boundary.
   const job=/^\/creative-ai\/api\/jobs\/([a-zA-Z0-9_-]+)/.exec(pathname);if(job)await app.runtime.store.read(job[1]);
   const research=/^\/creative-ai\/api\/research\/([a-zA-Z0-9_-]+)$/.exec(pathname);if(research)await app.runtime.researchSessions.store.read(research[1]);
   if(await app.handle(req,res,pathname==='/creative-ai/costs'?'/creative-ai':pathname,readJsonBody))return;
   res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Page not found'}));
  }catch(e){if(!res.headersSent)res.writeHead(e.code==='ENOENT'?404:400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message.slice(0,800)}));}
 });return {server,runtime:app.runtime,policy};
}
if(require.main===module){const app=createServer(),host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||app.policy.config.port);if(!['127.0.0.1','localhost','::1'].includes(host))throw Error('Team authentication and hosting must be configured before exposing this pilot.');app.server.listen(port,host,()=>console.log('Duroflex group studio listening on port '+port));}
module.exports={createServer,readJsonBody};
