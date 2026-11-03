'use strict';
// Retry only errors which establish that no connection to the provider was
// made. EPIPE/ECONNRESET/socket loss/timeouts after dispatch remain ambiguous.
module.exports=async function connectRetry(send,{sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 for(let attempt=0;attempt<2;attempt++){
  try{return await send();}catch(e){
   const cause=e.cause||e,code=cause.code;
   if(attempt||!['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','UND_ERR_CONNECT_TIMEOUT'].includes(code)||cause.socket?.bytesWritten>0)throw e;
   await sleep(500);
  }
 }
};
