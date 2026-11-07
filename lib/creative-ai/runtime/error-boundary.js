'use strict';
// Error paths must tolerate arbitrary thrown values and an already-started reply.
function normalize(value){
 if(value instanceof Error&&typeof value.message==='string')return value;
 const error=new Error(typeof value==='string'?value:'Unable to complete this operation.');
 if(value&&typeof value==='object')for(const key of ['code','status'])if(['string','number'].includes(typeof value[key]))error[key]=value[key];
 return error;
}
function send(res,value,{status,body}={}){
 if(res.destroyed||res.writableEnded)return;
 if(res.headersSent){res.destroy();return;}
 const error=normalize(value),candidate=status||error.status||(error.code==='ENOENT'?404:400),code=Number.isInteger(candidate)&&candidate>=400&&candidate<=599?candidate:500;
 try{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body||{error:error.message.slice(0,800)}));}catch{try{res.destroy();}catch{}}
}
module.exports={normalize,send};
