'use strict';
const crypto=require('crypto');
const DEFAULT_IMAGE_LIMIT=8;
// Stream strings into the digest; do not duplicate base64 payloads in JSON.
function hash(value){
 const digest=crypto.createHash('sha256');
 function visit(v){
  digest.update(typeof v+':');
  if(v===null||typeof v!=='object'){const text=String(v);digest.update(text.length+':');digest.update(text);return;}
  if(Array.isArray(v)){digest.update('array:'+v.length+':');for(const item of v)visit(item);}
  else {const keys=Object.keys(v).sort();digest.update('object:'+keys.length+':');for(const key of keys){visit(key);visit(v[key]);}}
 }
 visit(value);return digest.digest('hex');
}
const failure=(code,message)=>Object.assign(Error(message),{code});
// Exactly one safe local repair, followed by fresh validation. No paid calls.
async function run({stage,value,check,repair,record}){
 const attempts=[];let current=value;
 for(let attempt=0;attempt<2;attempt++){
  let error;
  try{await check(current);}catch(cause){error=cause;}
  attempts.push({attempt,status:error?'failed':'passed',...(error?{code:error.code||'LOCAL_CHECK_FAILED'}:{}),inputHash:hash(current)});
  if(!error){const report={version:1,stage,status:'passed',repaired:attempt>0,attempts,paidDispatch:false};await record?.(report);return {value:current,report};}
  if(attempt===0&&repair){
   try{const next=await repair(current,error);if(next!==undefined&&hash(next)!==hash(current)){current=next;continue;}}
   catch(cause){error=cause;}
  }
  const report={version:1,stage,status:'blocked',repaired:attempt>0,attempts,paidDispatch:false};
  error.deterministicPreflight=report;
  try{await record?.(report);}catch{error.diagnosticSaveFailed=true;}
  throw error;
 }
}
function references(rows,{limit=Infinity,idKey='id'}={}){
 if(!Array.isArray(rows))throw failure('REFERENCE_LIST_INVALID','Image references must be an array');
 const seen=new Map();for(const row of rows){
  if(!row||typeof row[idKey]!=='string'||!row[idKey])throw failure('REFERENCE_ID_MISSING','Image references require an explicit ID');
  const before=seen.get(row[idKey]);if(before){if(hash(before)!==hash(row))throw failure('REFERENCE_ID_CONFLICT','The same reference ID has conflicting content; select the exact reference.');throw failure('REFERENCE_DUPLICATE','The same image reference was attached more than once.');}seen.set(row[idKey],row);
 }
 if(rows.length>limit)throw failure('REFERENCE_CAPACITY','Too many distinct references; select references explicitly before dispatch.');
}
function deduplicate(rows,error,{idKey='id'}={}){
 if(error.code!=='REFERENCE_DUPLICATE')return undefined;
 const seen=new Map(),out=[];for(const row of rows){if(seen.has(row[idKey])){if(hash(seen.get(row[idKey]))!==hash(row))return undefined;}else{seen.set(row[idKey],row);out.push(row);}}return out;
}
async function images(rows,{stage='reasoning-references',limit=DEFAULT_IMAGE_LIMIT,idKey='id',record}={}){
 return run({stage,value:rows,check:v=>references(v,{limit,idKey}),repair:(v,e)=>deduplicate(v,e,{idKey}),record});
}
async function prompt(text,{record}={}){
 let compiled;
 const result=await run({stage:'image-prompt',value:text,
  check:v=>{if(typeof v!=='string'||!v.trim())throw failure('IMAGE_PROMPT_EMPTY','An image prompt is required');if([...v].length>32000)throw failure('IMAGE_PROMPT_LIMIT','Image prompt requires local compaction.');},
  repair:(v,e)=>{if(e.code!=='IMAGE_PROMPT_LIMIT')return undefined;compiled=require('./image-prompt').prepare(v);return compiled.text;},record});
 return {...result,compiled:compiled||require('./image-prompt').prepare(result.value)};
}
module.exports={DEFAULT_IMAGE_LIMIT,run,images,prompt,references,deduplicate};
