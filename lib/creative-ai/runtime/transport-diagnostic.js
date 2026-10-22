'use strict';
// Do not persist error messages, headers, bodies or URLs: causes can contain
// credentials or private request data. A lost response never proves no charge.
async function record(budget,kind,key,error,{started,stage,model}={}){
 const codes=new Set(),seen=new Set();function visit(e,depth=0){if(!e||typeof e!=='object'||seen.has(e)||depth>4)return;seen.add(e);if(typeof e.code==='string'&&/^[A-Z][A-Z0-9_]{1,60}$/.test(e.code))codes.add(e.code);visit(e.cause,depth+1);if(Array.isArray(e.errors))e.errors.slice(0,10).forEach(x=>visit(x,depth+1));}visit(error);
 const value={version:1,stage:stage||kind,model,recordedAt:new Date().toISOString(),elapsedMs:Number.isFinite(started)?Math.round(performance.now()-started):null,errorName:['Error','TypeError','TimeoutError','AbortError','SyntaxError'].includes(error.name)?error.name:'Error',causeCodes:[...codes],chargeStatus:'unknown',automaticRetry:false,responseSaved:false};
 try{await budget.transportFailure?.(kind,key,value);}catch{error.diagnosticSaveFailed=true;}
 return value;
}
module.exports={record};
