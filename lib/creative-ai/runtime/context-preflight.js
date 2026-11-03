'use strict';
const {createHash}=require('crypto');
// Exact model IDs only. Never infer a window from a family prefix or alias.
// Sources checked 2026-10-13: https://developers.openai.com/api/docs/models/{model}
const MODELS=Object.freeze({...Object.fromEntries(['gpt-6-luna','gpt-6-sol','gpt-6.1-sol','gpt-6-astra'].map(model=>[model,Object.freeze({contextWindow:1050000,maxOutputTokens:128000,source:'https://developers.openai.com/api/docs/models/'+model,checkedAt:'2026-10-13'})])), 'gpt-5.4-mini':Object.freeze({contextWindow:400000,maxOutputTokens:128000,source:'https://developers.openai.com/api/docs/models/gpt-5.4-mini',checkedAt:'2026-10-15'})});
const fail=(code,message,details={})=>Object.assign(Error(message),{code,contextPreflight:details});
const positive=n=>Number.isSafeInteger(n)&&n>0;
function policy(model,config){
 const spec=MODELS[model];if(!spec)throw fail('INPUT_CONTEXT_MODEL_UNKNOWN','Input-context limits are not verified for '+model+'. Add a documented exact-model limit before dispatch.');
 const margin=config.contextSafetyTokens??4096,timeout=config.inputTokenCountTimeoutMs??30000;
 if(!Number.isSafeInteger(margin)||margin<0||margin>=spec.contextWindow||!positive(timeout)||timeout>2147483647)throw fail('INPUT_CONTEXT_CONFIG_INVALID','Invalid input-context safety margin or counting timeout.');
 return {...spec,margin,timeout};
}
// Count the same input, instructions, images, reasoning settings and structured
// response schema used by Responses. Output allowance is checked separately.
// Official contract: https://developers.openai.com/api/docs/guides/token-counting
function countBody(body){return Object.fromEntries(['model','instructions','input','text','reasoning','tools','tool_choice','parallel_tool_calls','previous_response_id','conversation','truncation'].filter(k=>body[k]!==undefined).map(k=>[k,body[k]]));}
async function check(body,config,budget,{requestKey,attempt,stage}={}){
 const started=performance.now(),spec=policy(body.model,config),outputTokens=body.max_output_tokens;
 if(!positive(outputTokens)||outputTokens>spec.maxOutputTokens)throw fail('INPUT_CONTEXT_OUTPUT_INVALID','Requested output exceeds the verified model output limit.');
 const remaining=budget.remainingMs?await budget.remainingMs():spec.timeout;
 if(remaining<1)throw Error('Job time budget reached');
 const payload=JSON.stringify(countBody(body)),requestHash=createHash('sha256').update(payload).digest('hex');
 const base={version:1,model:body.model,requestKey,requestHash,attempt,stage,contextWindow:spec.contextWindow,outputTokens,safetyTokens:spec.margin,source:spec.source,limitsCheckedAt:spec.checkedAt,method:'responses.input_tokens',countedAt:new Date().toISOString()};
 let inputTokens;const attempts=[],deadline=performance.now()+Math.min(spec.timeout,remaining);
 for(let n=0;n<3;n++){
  const available=Math.min(deadline-performance.now(),budget.remainingMs?await budget.remainingMs():Infinity);
  if(available<1){const diagnostic={...base,status:'unavailable',attempts,elapsedMs:Math.round(performance.now()-started)};await budget.preflight?.(diagnostic);throw fail('INPUT_CONTEXT_COUNT_UNAVAILABLE','Input-context counting timed out; generation was not dispatched.',diagnostic);}
  try{
   const response=await fetch('https://api.openai.com/v1/responses/input_tokens',{method:'POST',headers:{Authorization:'Bearer '+config.apiKey,Connection:'close','Content-Type':'application/json'},body:payload,signal:AbortSignal.timeout(Math.max(1,Math.floor(available)))});
   if(!response.ok){let body;try{body=await response.json();}catch{}const diagnostic={};for(const [key,name] of [['code','providerCode'],['type','providerType'],['param','providerParam']]){const value=body?.error?.[key];if(typeof value==='string'&&/^[a-zA-Z0-9_.\[\]-]{1,120}$/.test(value))diagnostic[name]=value;}throw Object.assign(Error('count endpoint returned HTTP '+response.status),{status:response.status,providerDiagnostic:diagnostic});}
   const result=await response.json();if(result.object!=='response.input_tokens'||!Number.isSafeInteger(result.input_tokens)||result.input_tokens<0)throw Error('count endpoint returned an invalid token count');
   inputTokens=result.input_tokens;attempts.push({number:n+1,status:'passed'});break;
  }catch(cause){
   const transient=[408,429,500,502,503,504].includes(cause.status)||['TimeoutError','AbortError'].includes(cause.name)||/^(fetch failed|network|socket hang up|ECONNRESET|ETIMEDOUT)/i.test(cause.message||'');
   // A small allowlist records useful diagnostics without provider bodies or secrets.
   const code=cause.cause?.code||cause.code;attempts.push({number:n+1,status:'unavailable',retryable:transient,...cause.providerDiagnostic,...(Number.isInteger(cause.status)?{httpStatus:cause.status}:{}),...(/^(ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT|UND_ERR_SOCKET)$/.test(code||'')?{transportCode:code}:{})});
   const waitMs=200*(n+1),left=Math.min(deadline-performance.now(),budget.remainingMs?await budget.remainingMs():Infinity);
   if(transient&&n<2&&left>waitMs+25){await new Promise(resolve=>setTimeout(resolve,waitMs));continue;}
   const diagnostic={...base,status:'unavailable',retryable:transient,attempts,elapsedMs:Math.round(performance.now()-started)};await budget.preflight?.(diagnostic);
   const invalidRequest=cause.status===400;throw Object.assign(fail(invalidRequest?'INPUT_CONTEXT_REQUEST_INVALID':'INPUT_CONTEXT_COUNT_UNAVAILABLE',invalidRequest?'Input-context preflight rejected the request'+(cause.providerDiagnostic?.providerParam?' parameter '+cause.providerDiagnostic.providerParam:'')+'. No generation was dispatched; correct the request instead of retrying the same payload.':'Input-context counting is unavailable; generation was not dispatched. Retry after the counting service is available.',diagnostic),{retryableReview:transient});
  }
 }
 const total=inputTokens+outputTokens+spec.margin,diagnostic={...base,attempts,inputTokens,totalReservedTokens:total,remainingTokens:spec.contextWindow-total,status:total>spec.contextWindow?'blocked':'passed',elapsedMs:Math.round(performance.now()-started)};
 await budget.preflight?.(diagnostic);
 if(total>spec.contextWindow)throw fail('INPUT_CONTEXT_EXCEEDED',`Input context is too large for ${body.model}: ${inputTokens} input + ${outputTokens} output + ${spec.margin} safety tokens exceeds ${spec.contextWindow}. Reduce this stage's selected context; no source was truncated and generation was not dispatched.`,diagnostic);
 return diagnostic;
}
module.exports={check,policy,countBody,MODELS};
