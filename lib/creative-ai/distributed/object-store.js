'use strict';
const crypto=require('node:crypto');
class ObjectStore{
 constructor(client,bucket,{maxBytes=160*1024*1024,timeoutMs=60000}={}){if(!bucket)throw Error('Private artifact bucket is required');this.client=client;this.bucket=bucket;if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw Error('Invalid storage timeout');this.maxBytes=maxBytes;this.timeoutMs=timeoutMs;}
 completionKey(scope,r){if(!/^brand-[a-z0-9-]+\/creative-[a-z0-9-]+$/.test(scope)||!['image','reasoning'].includes(r.kind)||!/^[a-f0-9]{64}$/.test(r.request_key)||!/^[a-f0-9-]{36}$/.test(r.lease_token)||scope.split('/')[1]!==r.job_id)throw Error('Invalid completion scope');return 'creative-execution/'+scope+'/completions/'+r.kind+'-'+r.request_key+'-'+r.lease_token;}
 async saveCompletion(scope,r,response){
  const {PutObjectCommand}=require('@aws-sdk/client-s3'),Key=this.completionKey(scope,r),Body=Buffer.from(JSON.stringify({version:1,inputHash:r.input_hash,leaseToken:r.lease_token,response}));
  try{await this.client.send(new PutObjectCommand({Bucket:this.bucket,Key,Body,ContentType:'application/json',IfNoneMatch:'*'}),{abortSignal:AbortSignal.timeout(this.timeoutMs)});}
  catch(e){if(e?.$metadata?.httpStatusCode!==412)throw e;const existing=await this.loadCompletion(scope,r);if(JSON.stringify(existing)!==JSON.stringify(response))throw Error('Completion evidence conflict');}
 }
 async loadCompletion(scope,r){
  const {GetObjectCommand}=require('@aws-sdk/client-s3');let result;const signal=AbortSignal.timeout(this.timeoutMs);
  try{result=await this.client.send(new GetObjectCommand({Bucket:this.bucket,Key:this.completionKey(scope,r)}),{abortSignal:signal});}catch(e){if(e?.name==='NoSuchKey'||e?.$metadata?.httpStatusCode===404)return null;throw e;}
  const body=require('node:stream').Readable.from(result.Body),abort=()=>body.destroy(signal.reason),chunks=[];let size=0;signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  try{for await(const chunk of body){size+=chunk.length;if(size>8192)throw Error('Completion record too large');chunks.push(chunk);}}finally{signal.removeEventListener('abort',abort);body.destroy();result.Body.destroy?.();}
  const record=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(record.version!==1||record.inputHash!==r.input_hash||record.leaseToken!==r.lease_token)throw Error('Completion identity mismatch');
  // Verify actual saved bytes before completing a database row.
  await this.get(record.response,scope);return record.response;
 }

 async put(scope,bytes){const {PutObjectCommand}=require('@aws-sdk/client-s3');if(!/^brand-[a-z0-9-]+\/creative-[a-z0-9-]+$/.test(scope))throw Error('Invalid private artifact scope');bytes=Buffer.from(bytes);if(bytes.length>this.maxBytes)throw Error('Artifact exceeds bounded storage size');const hash=crypto.createHash('sha256').update(bytes).digest('hex'),key='creative-execution/'+scope+'/'+hash;await this.client.send(new PutObjectCommand({Bucket:this.bucket,Key:key,Body:bytes,ContentType:'application/octet-stream',ChecksumSHA256:Buffer.from(hash,'hex').toString('base64')}),{abortSignal:AbortSignal.timeout(this.timeoutMs)});return {version:1,key,sha256:hash,bytes:bytes.length};}
 async get(ref,scope){const {GetObjectCommand}=require('@aws-sdk/client-s3');if(!/^brand-[a-z0-9-]+\/creative-[a-z0-9-]+$/.test(scope)||!ref||ref.key!=='creative-execution/'+scope+'/'+ref.sha256||!/^[a-f0-9]{64}$/.test(ref.sha256)||!Number.isInteger(ref.bytes)||ref.bytes<0||ref.bytes>this.maxBytes)throw Error('Invalid artifact reference');const signal=AbortSignal.timeout(this.timeoutMs),response=await this.client.send(new GetObjectCommand({Bucket:this.bucket,Key:ref.key}),{abortSignal:signal}),body=require('node:stream').Readable.from(response.Body),abort=()=>{body.destroy(signal.reason);response.Body.destroy?.(signal.reason);};signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();const chunks=[];let length=0;try{for await(const chunk of body){length+=chunk.length;if(length>ref.bytes)throw Error('Artifact size mismatch');chunks.push(chunk);}}finally{signal.removeEventListener('abort',abort);body.destroy();response.Body.destroy?.();}const bytes=Buffer.concat(chunks);if(bytes.length!==ref.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==ref.sha256)throw Error('Artifact integrity mismatch');return bytes;}
}
module.exports={ObjectStore};
