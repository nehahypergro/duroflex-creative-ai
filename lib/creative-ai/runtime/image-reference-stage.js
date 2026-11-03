'use strict';
// Upload references independently of paid generation. Only verified, same-brand
// CDN objects are submitted to the image API; prompts and metadata stay local.
const fs=require('node:fs/promises'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const cdn=require('./cdn-media'),{Gate}=require('./image-upload');
const gate=new Gate(2),MAX_STAGE_MS=120000,MAX_ATTEMPTS=3;
function failure(code,message){return Object.assign(Error(message),{code});}
function retryDelay(response,attempt){
 const raw=response?.headers.get('retry-after');
 const seconds=raw===null||raw===undefined?NaN:Number(raw),date=Date.parse(raw);
 return Math.max(1000*2**attempt,Number.isFinite(seconds)?seconds*1000:Number.isFinite(date)?date-Date.now():0);
}
// These retries only transfer media. They can leave an orphan CDN object after
// a lost acknowledgement, but never dispatch or repeat an image-generation call.
function transferFetch(deadline,maxBytes,fetchImpl=fetch){
 return async(url,options={})=>{
  for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){
   const remaining=deadline-Date.now();if(remaining<1)throw failure('REFERENCE_UPLOAD_TIMEOUT','Reference upload time budget reached before generation.');
   const signal=AbortSignal.any([AbortSignal.timeout(remaining),...(options.signal?[options.signal]:[])]);
   let response,error,delay=1000*2**attempt;
   try{
    response=await fetchImpl(url,{...options,signal});
    if([408,429,500,502,503,504].includes(response.status)){
     delay=retryDelay(response,attempt);await response.body?.cancel();
     error=failure('REFERENCE_UPLOAD_HTTP','Reference transfer returned HTTP '+response.status);
    }else{
     // Read the complete response under the same deadline. Interrupted response
     // bodies are retryable here, unlike a paid generation response.
     const chunks=[];let size=0,limit=options.method==='POST'?65536:maxBytes;
     for await(const chunk of response.body||[]){size+=chunk.length;if(size>limit)throw failure('REFERENCE_RESPONSE_LIMIT','Reference response exceeds its saved size limit.');chunks.push(chunk);}
     return new Response(Buffer.concat(chunks),{status:response.status,headers:response.headers});
    }
   }catch(e){
    if(e.code==='REFERENCE_RESPONSE_LIMIT'||signal.aborted)throw e;
    if(!(e instanceof TypeError)&&!['ECONNRESET','EPIPE','ETIMEDOUT','UND_ERR_SOCKET','UND_ERR_CONNECT_TIMEOUT'].includes(e.code||e.cause?.code))throw e;
    error=e;
   }
   if(attempt===MAX_ATTEMPTS-1)throw error;
   if(Date.now()+delay>=deadline)throw failure('REFERENCE_UPLOAD_TIMEOUT','Reference transfer retry exceeds the remaining time budget.');
   await new Promise(resolve=>setTimeout(resolve,delay));
  }
 };
}
async function stage(rasters,budget){
 if(!budget.brandContext)throw failure('REFERENCE_SCOPE_REQUIRED','Image references require a saved brand-scoped project.');
 const context=await budget.brandContext(),brandId=context.intake?.brandId;
 if(!/^brand-[a-z0-9-]+$/.test(brandId||'')||!path.isAbsolute(context.dir||''))throw failure('REFERENCE_SCOPE_REQUIRED','Image references require a saved brand-scoped project.');
 const owner=JSON.parse(await fs.readFile(path.join(context.dir,'job.json'),'utf8'));
 if(owner.intake?.brandId!==brandId)throw failure('REFERENCE_SCOPE_MISMATCH','Reference staging does not match the saved project brand.');
 const remaining=budget.remainingMs?await budget.remainingMs():MAX_STAGE_MS;
 if(!Number.isFinite(remaining)||remaining<1)throw failure('REFERENCE_UPLOAD_TIMEOUT','No time remains for reference staging.');
 const deadline=Date.now()+Math.min(remaining,MAX_STAGE_MS),signal=AbortSignal.timeout(Math.max(1,Math.floor(deadline-Date.now())));
 return gate.run(async()=>{
  const refs=[];
  for(const raster of rasters){
   if(signal.aborted)throw signal.reason;
   if(!['png','jpeg','webp'].includes(raster.type)||!Buffer.isBuffer(raster.bytes)||!raster.bytes.length)throw failure('REFERENCE_INPUT_INVALID','A decoded raster is required for staging.');
   const hash=cdn.digest(raster.bytes),file=path.join(context.dir,'generation-references',hash+'.'+raster.type),scope=cdn.scope(file);
   if(!scope||!(await cdn.config(scope.root))?.enabled)throw failure('REFERENCE_CDN_DISABLED','Reference storage is unavailable; generation has not started.');
   await fs.mkdir(path.dirname(file),{recursive:true});
   const temporary=file+'.'+randomUUID()+'.pending';
   try{
    await fs.writeFile(temporary,raster.bytes,{flag:'wx'});
    try{await fs.link(temporary,file);}catch(e){if(e.code!=='EEXIST')throw e;if(cdn.digest(await fs.readFile(file))!==hash)throw failure('REFERENCE_SOURCE_CHANGED','Saved generation reference bytes changed.');}
   }finally{await fs.rm(temporary,{force:true});}
   const fetchImpl=transferFetch(deadline,raster.bytes.length);
   const receipt=await cdn.publish(file,{fetchImpl});
   if(receipt?.brandId!==brandId||receipt.sha256!==hash||receipt.bytes!==raster.bytes.length||!cdn.safeUrl(receipt.url))throw failure('REFERENCE_RECEIPT_INVALID','Generation reference receipt does not match its source.');
   // Recheck cached objects too. An old upload receipt is not proof that the
   // public bytes remain available and unchanged at this dispatch.
   const response=await fetchImpl(receipt.url,{redirect:'error'});
   if(!response.ok)throw failure('REFERENCE_UNAVAILABLE','Saved generation reference is unavailable (HTTP '+response.status+').');
   const actual=Buffer.from(await response.arrayBuffer());
   if(actual.length!==raster.bytes.length||cdn.digest(actual)!==hash)throw failure('REFERENCE_BYTES_CHANGED','CDN reference byte verification failed.');
   refs.push({assetId:raster.assetId,url:receipt.url,sha256:hash,bytes:receipt.bytes,brandId,verifiedAt:new Date().toISOString()});
  }
  return refs;
 },{signal});
}
module.exports={stage,transferFetch};
