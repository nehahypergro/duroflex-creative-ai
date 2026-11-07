'use strict';
const http=require('http'),path=require('path');
const ROOT=__dirname;
async function readJsonBody(req,maxBytes){let bytes=0,parts=[];for await(const part of req){bytes+=part.length;if(bytes>maxBytes)throw Error('Request is too large.');parts.push(part);}const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)),body=require('./lib/creative-ai/runtime/strict-json').parse(text||'{}');if(!body||typeof body!=='object'||Array.isArray(body))throw Error('JSON request body must be an object.');return body;}
function createServer({root=ROOT,resumeJobs=true,provider,access}={}){
 if(process.env.NODE_TEST_CONTEXT&&path.resolve(root)===ROOT)throw Error('Tests must provide an isolated workspace root.');
 const policy=require('./lib/group-workspace').groupPolicy(root);
 const dossierStore=require('./lib/brand-dossier').createDossierStore(path.join(root,'output/brand-dossiers'));
 const app=require('./lib/creative-ai/runtime/http').createHandler({root,dossierStore,provider,resumeJobs});app.runtime.editorChatEnabled=!!access&&process.env.CREATIVE_AI_EDITOR_CHAT!=='0';policy.mount(app.runtime);
 if(access)require('./lib/admin/studio-access').mount(app.runtime,access);
 const costs=new (require('./lib/cost-tracker').CostTracker)(root,policy.config);
 const server=http.createServer(async(req,res)=>{try{
  const handle=async()=>{try{
   const requestHost=req.headers.host||'',hostName=new URL('http://'+requestHost).hostname;if(!['127.0.0.1','localhost','[::1]'].includes(hostName))throw Error('This pilot accepts local connections only.');if(req.headers.origin&&new URL(req.headers.origin).host!==requestHost)throw Error('Cross-origin requests are not allowed.');const pathname=new URL(req.url,'http://localhost').pathname;
   if(pathname==='/'){res.writeHead(302,{Location:'/creative-ai'});res.end();return;}
   if(pathname==='/creative-ai/session.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end('');return;}
   if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok',workspace:policy.config.name,brands:policy.config.brands.map(b=>b.name)}));return;}
   if(pathname==='/creative-ai/api/costs'){if(req.method==='GET'){const value=await costs.snapshot();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}else if(req.method==='POST'){const value=await costs.add(await readJsonBody(req,12000));res.writeHead(201,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}else throw Error('Unsupported cost action');return;}
   if(pathname==='/creative-ai/api/workspace'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(policy.config));return;}
   if(pathname.startsWith('/dossiers/')&&pathname!=='/dossiers/demo'&&await dossierStore.handle(req,res,pathname,readJsonBody))return;
   // Check file downloads as well as metadata; internal files must not bypass the group boundary.
   const job=/^\/creative-ai\/api\/jobs\/([a-zA-Z0-9_-]+)/.exec(pathname);if(job)await app.runtime.store.read(job[1],{hydrate:false});
   const research=/^\/creative-ai\/api\/research\/([a-zA-Z0-9_-]+)$/.exec(pathname);if(research)await app.runtime.researchSessions.store.read(research[1]);
   if(await app.handle(req,res,pathname==='/creative-ai/costs'?'/creative-ai':pathname,readJsonBody))return;
   res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Page not found'}));
  }catch(e){require('./lib/creative-ai/runtime/error-boundary').send(res,e);}
  }; // Authenticate before entering any Studio or private file route.
  if(require('./lib/creative-ai/runtime/editor-sharing').matches(req.url))return await require('./lib/creative-ai/runtime/editor-sharing').handlePublic(app.runtime,req,res,readJsonBody);
  if(!access)return await handle();
  try{const result=await require('./lib/admin/studio-access').guard(access,req,res,app.runtime);if(result.handled)return;const ctx={actor:result.actor,briefDocuments:access.briefs,trackingStartedAt:new Date().toISOString(),trackingBaseline:result.trackingBaseline};res.once('finish',()=>access.tracking?.background(()=>access.tracking.observeResponse(result.actor,{method:req.method,url:req.url,status:res.statusCode,attachment:String(res.getHeader('content-disposition')||'').startsWith('attachment'),context:ctx,requestId:require('node:crypto').randomUUID()})));return await require('./lib/admin/context').context.run(ctx,handle);}catch(e){require('./lib/creative-ai/runtime/error-boundary').send(res,e);}
 }catch(e){
  // Every branch, including unauthenticated capability routes, belongs to this
  // request boundary. Never turn malformed client input into a rejected listener.
  require('./lib/creative-ai/runtime/error-boundary').send(res,e);
 }});return {server,runtime:app.runtime,policy};
}
if(require.main===module)require('./scripts/admin/local-studio').run().catch(()=>{console.error('Authenticated Studio could not start. Check the local database and ports; no unauthenticated fallback was started.');process.exitCode=1;});
module.exports={createServer,readJsonBody};
