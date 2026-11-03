'use strict';
// Explicit temporary Google-only route. Never changes existing OpenAI jobs or falls back to them.
const {VertexPlanningProvider,envelope}=require('./vertex-provider'),{fingerprint}=require('../art-director'),sharp=require('sharp');
const REASONING=new Set(['gemini-4-argon','gemini-3.8-flash','gemini-3.6-flash','gemini-3.1-pro-preview']);
// Exact documented models only; no family-prefix fallback.
const IMAGE_MODELS=new Map([['gemini-3-pro-image',{contextWindow:65536}],['gemini-nano-banana-2.1',{contextWindow:131072}]]);
const RATIOS=['1:1','3:2','2:3','3:4','1:4','4:1','4:3','4:5','5:4','1:8','8:1','9:16','16:9','21:9'];
async function imageRequest({prompt,attachments,size},config){
 if(typeof prompt!=='string'||!prompt.trim())throw Error('Vertex requires a complete image prompt');
 if(!Array.isArray(attachments)||attachments.length>14)throw Error('Vertex supports at most 14 image references; references are never silently removed');
 const m=/^(\d+)x(\d+)$/.exec(size||'');if(!m||+m[1]<1||+m[2]<1)throw Error('Vertex requires explicit image dimensions');const ratio=+m[1]/+m[2];
 const aspectRatio=RATIOS.reduce((best,r)=>{const value=x=>{const [w,h]=x.split(':').map(Number);return Math.abs(Math.log(w/h/ratio));};return value(r)<value(best)?r:best;},'1:1');
 const parts=[{text:prompt+'\nReturn exactly one final image. Supplied reference identifiers are source labels, not artwork wording.'}],references=[];
 for(const a of attachments){const data=/^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(a.imageData||'');if(!data)throw Error('Vertex requires actual supplied raster references');const r=await require('./image-upload').encode({assetId:a.assetId,type:data[1],bytes:Buffer.from(data[2],'base64')});if(r.bytes.length>7*1024*1024)throw Error('Vertex inline reference exceeds 7 MB; no reference was dropped');parts.push({text:'Source reference: '+a.assetId},{inlineData:{mimeType:'image/'+r.type,data:r.bytes.toString('base64')}});references.push({assetId:a.assetId,...r.provenance});}
 return {body:{contents:[{role:'user',parts}],generationConfig:{responseModalities:['TEXT','IMAGE'],candidateCount:1,maxOutputTokens:32768,imageConfig:{aspectRatio,imageSize:config.vertexImageSize||'4K'}}},references};
}
class VertexCreativeProvider extends VertexPlanningProvider{
 constructor(config,vertex){
  if(!REASONING.has(config.reasoningModel)||Object.values(config.roleModels||{}).some(r=>!REASONING.has(r.model))||!IMAGE_MODELS.has(config.imageModel))throw Error('Vertex-only configuration requires supported Google reasoning and image models');
  if(config.distributed)throw Error('The temporary Vertex route does not support the OpenAI distributed dispatch backend');
  if(config.vertexImageSize&&!['1K','2K','4K'].includes(config.vertexImageSize))throw Error('Invalid Vertex image resolution');
  super({...config,reasoningInputTransport:'inline',provider:'google-vertex'},vertex);
 }
 async call(model,operation,body,timeoutMs){
  if(!REASONING.has(model)&&!IMAGE_MODELS.has(model))throw Error('Unverified Vertex model');if(!['countTokens','generateContent'].includes(operation))throw Error('Unsupported Vertex operation');
  if(!/^[a-z][a-z0-9-]+$/.test(this.vertex.project||''))throw Error('Invalid Vertex project');
  const token=await this.token();return fetch('https://aiplatform.googleapis.com/v1/projects/'+this.vertex.project+'/locations/global/publishers/google/models/'+model+':'+operation,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});
 }
 async checkAccess(){for(const model of new Set([this.config.reasoningModel,...Object.values(this.config.roleModels||{}).map(r=>r.model),this.config.imageModel])){const r=await this.call(model,'countTokens',{contents:[{role:'user',parts:[{text:'Access check'}]}]},30000);if(!r.ok)return {configured:false,reason:'Vertex access check failed for '+model+' (HTTP '+r.status+')'};const j=await r.json();if(!Number.isSafeInteger(j.totalTokens))return {configured:false,reason:'Vertex token count unavailable for '+model};}return {configured:true,vertexAvailable:true,provider:'google-vertex',project:this.vertex.project,models:[this.config.reasoningModel,this.config.imageModel],limits:'Token counting confirms access, not future generation capacity or billing availability.'};}
 async generateRequest(args,budget){
  const {body,references}=await imageRequest(args,this.config),model=this.config.imageModel,inputHash=fingerprint({provider:'google-vertex',project:this.vertex.project,model,body}),key=args.requestKey;
  let saved=await budget.loadResponse?.('image',key);
  if(saved&&(saved.version!==1||saved.provider!=='google-vertex'||saved.inputHash!==inputHash))throw Error('Saved Vertex image response identity mismatch');
  if(!saved){
   const remaining=await budget.remainingMs(),count=await this.call(model,'countTokens',{contents:body.contents},Math.max(1,Math.min(30000,remaining))),counted=await count.json();
   if(!count.ok||!Number.isSafeInteger(counted.totalTokens))throw Error('Vertex image context counting unavailable (HTTP '+count.status+')');
   const diagnostic={version:1,model,requestKey:key,method:'vertex.countTokens',requestHash:inputHash,inputTokens:counted.totalTokens,outputTokens:32768,contextWindow:IMAGE_MODELS.get(model).contextWindow,safetyTokens:4096,status:counted.totalTokens+32768+4096<=IMAGE_MODELS.get(model).contextWindow?'passed':'blocked'};await budget.preflight?.(diagnostic);if(diagnostic.status!=='passed')throw Error('Vertex image context budget exceeded; source content retained');
   const left=await budget.remainingMs();if(left<1)throw Error('Job time budget reached before Vertex image dispatch');await budget.reserve('image',key);const started=performance.now();let r,raw;
   try{r=await this.call(model,'generateContent',body,Math.max(1,Math.min(this.config.imageTimeoutMs,left)));raw=await r.json();}catch(error){await require('./transport-diagnostic').record(budget,'image',key,error,{started,stage:'generation',model});throw error;}
   saved={version:1,provider:'google-vertex',inputHash,status:r.status,ok:r.ok,raw,responseElapsedMs:Math.round(performance.now()-started)};await budget.saveResponse?.('image',key,saved);
  }
  if(!saved.ok)throw Error('Vertex image provider request failed (HTTP '+saved.status+'). Saved response retained; no automatic image retry.');
  const raw=saved.raw,usage=envelope(raw).usage;
  const candidates=raw.candidates||[],parts=candidates.flatMap(c=>(c.content?.parts||[]).filter(p=>!p.thought&&p.inlineData?.mimeType?.startsWith('image/')));
  let bytes,meta,decodeError;
  if(parts.length===1){try{bytes=Buffer.from(parts[0].inlineData.data,'base64');meta=await sharp(bytes,{limitInputPixels:40000000}).metadata();}catch(error){decodeError=error;}}
  await budget.receipt({kind:'image',provider:'google-vertex',model,requestKey:key,requestId:raw.responseId,usage,providerUsage:raw.usageMetadata||null,...(meta?{nativeImage:{width:meta.width,height:meta.height,format:meta.format,requestedSize:body.generationConfig.imageConfig.imageSize}}:{}),inputRasters:references,handoff:{responseElapsedMs:saved.responseElapsedMs,provider:'google-vertex',project:this.vertex.project,imageSize:body.generationConfig.imageConfig.imageSize,aspectRatio:body.generationConfig.imageConfig.aspectRatio},billingNote:'Original Google usage retained. Unknown prices or usage are not zero.'});
  if(candidates.length!==1||candidates[0].finishReason!=='STOP'||parts.length!==1)throw Error('Vertex did not return exactly one usable image; saved response and usage retained');
  if(decodeError)throw decodeError;if(!['png','jpeg','webp'].includes(meta.format))throw Error('Unsupported Vertex output image format');
  const requestedSize=body.generationConfig.imageConfig.imageSize,minLongEdge={'1K':1024,'2K':2048,'4K':4096}[requestedSize];
  if(Math.max(meta.width,meta.height)<minLongEdge)throw Error('Vertex native resolution mismatch: received '+meta.width+' x '+meta.height+' for requested '+requestedSize+'. Saved image response and usage retained; no automatic retry or silent upscale.');
  return {imageData:'data:image/'+meta.format+';base64,'+bytes.toString('base64'),model,requestKey:key};
 }
}
module.exports={VertexCreativeProvider,imageRequest};
