'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),catalog=require('../../../config/client-error-codes.json');
const technical={PRODUCT_IDENTITY_REQUIRED:'CA-102',REFERENCE_ID_CONFLICT:'CA-102',REASONING_TIMEOUT:'CA-202',REASONING_PENDING:'CA-202',INPUT_CONTEXT_COUNT_TIMEOUT:'CA-202',PROVIDER_CREDITS_EXHAUSTED:'CA-201',INPUT_CONTEXT_REQUEST_INVALID:'CA-101',IMAGE_PROMPT_LIMIT:'CA-101',INVALID_AGENT_JSON:'CA-204',REASONING_OUTPUT_LIMIT:'CA-204',ENOSPC:'CA-507',ENOENT:'CA-404'};
function classify(error,status,route='',method='GET'){
 if(technical[error?.code])return technical[error.code];
 if([401,403,404,409,429,507].includes(status))return 'CA-'+status;
 if(status===504||['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT'].includes(error?.code))return 'CA-202';
 if([502,503].includes(status))return 'CA-201';
 if(/\/export(?:\/|$)/.test(route))return 'CA-302';
 if(method!=='GET'&&/\/editable\//.test(route)&&!route.endsWith('/convert'))return 'CA-301';
 if(status===422||status===400)return 'CA-101';
 return 'CA-900';
}
function record(root,error,{status,route,method}){
 const clientCode=classify(error,status,route,method),reference='CAI-'+crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase(),at=new Date().toISOString();
 const incident={version:1,reference,clientCode,httpStatus:status,at,route,method,internalCode:error?.code||null,reason:String(error?.message||'Unknown failure').slice(0,4000)};
 try{const dir=path.join(root,'output/creative-ai/incidents');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,reference+'.json'),JSON.stringify(incident,null,2),{flag:'wx'});return {clientCode,reference,httpStatus:status,at};}
 catch{return {clientCode,httpStatus:status,diagnosticRecorded:false};}
}
module.exports={catalog,classify,record};
