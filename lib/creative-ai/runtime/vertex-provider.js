'use strict';
// Optional Vertex transport. Shared projection, validation, bounded repair,
// image generation and accounting remain in the existing provider.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {OpenAIProvider}=require('./provider');
const MODELS=new Set(['gemini-3.6-flash','gemini-3.8-flash','gemini-3.1-pro-preview','gemini-4-argon']);
const outputCeiling=model=>model==='gemini-4-argon'?32768:65536;
function validateOutput(body){const ceiling=outputCeiling(body.model);if(!Number.isSafeInteger(body.max_output_tokens)||body.max_output_tokens<1||body.max_output_tokens>ceiling)throw Error('Vertex output limit must be between 1 and '+ceiling);if(!['low','medium','high'].includes(body.reasoning?.effort))throw Error('Unsupported Vertex thinking level');}
function settings(root){const values=Object.fromEntries(fs.readFileSync(path.join(root,'.env'),'utf8').split('\n').flatMap(l=>{const m=/^([A-Z_]+)=(.*)$/.exec(l);return m?[[m[1],m[2].trim().replace(/^['"]|['"]$/g,'')]]:[];}));return {credentialFile:process.env.GOOGLE_APPLICATION_CREDENTIALS||values.GOOGLE_APPLICATION_CREDENTIALS,project:process.env.GOOGLE_CLOUD_PROJECT||values.GOOGLE_CLOUD_PROJECT};}
function wireBody(body){
 validateOutput(body);
 const parts=[];
 for(const message of body.input||[])for(const part of message.content||[]){
  if(part.type==='input_text')parts.push({text:part.text});
  else if(part.type==='input_image'){const match=/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(part.image_url);if(!match)throw Error('Vertex requires supplied raster bytes');parts.push({inlineData:{mimeType:match[1],data:match[2]}});}
  else throw Error('Unsupported Vertex input part: '+part.type);
 }
 // Preserve the entire contract, including keywords unsupported by Vertex's
 // responseSchema subset. JSON mode + the shared local validator enforce it.
 const systemInstruction={parts:[{text:body.instructions+'\nExact JSON output contract: '+JSON.stringify(body.text.format.schema)}]};
 return {systemInstruction,contents:[{role:'user',parts}],generationConfig:{responseMimeType:'application/json',maxOutputTokens:body.max_output_tokens,thinkingConfig:{thinkingLevel:body.reasoning.effort.toUpperCase()}}};
}
function envelope(raw){
 const c=raw.candidates?.[0],u=raw.usageMetadata,text=(c?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
 const usage=u?{...(Number.isFinite(u.promptTokenCount)?{input_tokens:u.promptTokenCount}:{}),...(Number.isFinite(u.candidatesTokenCount)?{output_tokens:u.candidatesTokenCount+(u.thoughtsTokenCount||0)}:{}),input_tokens_details:{cached_tokens:u.cachedContentTokenCount||0},output_tokens_details:{reasoning_tokens:u.thoughtsTokenCount||0}}:{};
 return {id:raw.responseId||'vertex-'+crypto.randomUUID(),status:c?.finishReason==='STOP'?'completed':c?.finishReason==='MAX_TOKENS'?'incomplete':'failed',incomplete_details:c?.finishReason==='MAX_TOKENS'?{reason:'max_output_tokens'}:null,output:[{content:[{type:'output_text',text}]}],usage,provider:'google-vertex',providerRaw:raw};
}
class VertexPlanningProvider extends OpenAIProvider{
 constructor(config,vertex){super(config);this.vertex=vertex;}
 outputLimits(model,bounds){return MODELS.has(model)?{...bounds,initial:Math.min(bounds.initial,outputCeiling(model)),recovery:Math.min(bounds.recovery,outputCeiling(model))}:super.outputLimits(model,bounds);}
 async token(){
  if(this.auth&&this.auth.expires>Date.now()+60000)return this.auth.value;
  const key=JSON.parse(fs.readFileSync(this.vertex.credentialFile,'utf8'));if(key.type!=='service_account')throw Error('Vertex requires the saved service-account credentials');
  const now=Math.floor(Date.now()/1000),enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url'),unsigned=enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:key.client_email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
  const assertion=unsigned+'.'+crypto.sign('RSA-SHA256',Buffer.from(unsigned),key.private_key).toString('base64url');
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(20000)});
  const j=await r.json();if(!r.ok||!j.access_token)throw Error('Saved Vertex credentials could not authenticate (HTTP '+r.status+')');this.auth={value:j.access_token,expires:Date.now()+j.expires_in*1000};return this.auth.value;
 }
 async call(model,operation,body,timeoutMs){
  if(!MODELS.has(model))throw Error('Unverified Vertex model: '+model);
  const project=this.vertex.project;if(!/^[a-z][a-z0-9-]+$/.test(project||''))throw Error('Invalid Vertex project configuration');
  const token=await this.token();return fetch('https://aiplatform.googleapis.com/v1/projects/'+project+'/locations/global/publishers/google/models/'+model+':'+operation,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});
 }
 async checkAccess(){
  const base=new OpenAIProvider({...this.config,roleModels:Object.fromEntries(Object.entries(this.config.roleModels||{}).filter(([,r])=>!MODELS.has(r.model)))}),result=await base.checkAccess();if(!result.configured)return result;
  for(const model of new Set(Object.values(this.config.roleModels||{}).map(r=>r.model).filter(m=>MODELS.has(m)))){const r=await this.call(model,'countTokens',{contents:[{role:'user',parts:[{text:'Access check'}]}]},30000);if(!r.ok){const data=await r.json();return {...result,configured:false,reason:'Vertex '+model+' access check failed (HTTP '+r.status+'): '+String(data.error?.message||'').slice(0,800)};}}
  return {...result,vertexAvailable:true};
 }
 async inputPreflight(body,budget,metadata){
  if(!MODELS.has(body.model))return super.inputPreflight(body,budget,metadata);
  validateOutput(body);
  const start=performance.now(),wire=wireBody(body),countBody={contents:[{role:'user',parts:[...wire.systemInstruction.parts,...wire.contents[0].parts]}]};
  const r=await this.call(body.model,'countTokens',countBody,30000),data=await r.json();
  const d={version:1,...metadata,model:body.model,method:'vertex.countTokens',requestHash:crypto.createHash('sha256').update(JSON.stringify(countBody)).digest('hex'),contextWindow:1048576,outputTokens:body.max_output_tokens,safetyTokens:4096,elapsedMs:Math.round(performance.now()-start)};
  if(!r.ok||!Number.isSafeInteger(data.totalTokens)){d.status='unavailable';d.httpStatus=r.status;await budget.preflight?.(d);throw Error('Vertex input counting unavailable (HTTP '+r.status+')');}
  d.inputTokens=data.totalTokens;d.totalReservedTokens=d.inputTokens+d.outputTokens+d.safetyTokens;d.status=d.totalReservedTokens>d.contextWindow?'blocked':'passed';await budget.preflight?.(d);if(d.status==='blocked')throw Error('Vertex context budget exceeded');return d;
 }
 async sendReasoning(body,timeoutMs){
  if(!MODELS.has(body.model))return super.sendReasoning(body,timeoutMs);
  const r=await this.call(body.model,'generateContent',wireBody(body),timeoutMs);if(!r.ok)return r;const raw=await r.json();return {ok:true,status:r.status,json:async()=>envelope(raw)};
 }
}
module.exports={VertexPlanningProvider,settings,wireBody,envelope};
