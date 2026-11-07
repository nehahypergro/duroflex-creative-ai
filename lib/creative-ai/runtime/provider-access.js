'use strict';
// Access probes are free. Their failure must not be reported as a paid-model
// rejection or a missing credential without that evidence.
function diagnostic(access){
 const out={version:1,recordedAt:new Date().toISOString(),configured:access?.configured===true};
 for(const key of ['status','reasoningAvailable','imageAvailable'])if(['number','boolean'].includes(typeof access?.[key]))out[key]=access[key];
 for(const key of ['reasoningModel','imageModel'])if(typeof access?.[key]==='string'&&/^[\w.-]{1,100}$/.test(access[key]))out[key]=access[key];
 for(const key of ['missingReasoningModels','missingImageModels'])if(Array.isArray(access?.[key]))out[key]=access[key].filter(x=>typeof x==='string'&&/^[\w.-]{1,100}$/.test(x));
 if(access?.reason==='OPENAI_API_KEY is unavailable.')out.credentialUnavailable=true;
 return out;
}
function failure(access){
 const d=diagnostic(access);let message;
 if(d.credentialUnavailable)message='The provider credential is unavailable. Configure it securely on the server.';
 else if(d.status)message='Provider model-access check returned HTTP '+d.status+'. Generation has not started; inspect the access diagnostic before retrying.';
 else if(d.missingReasoningModels?.length||d.missingImageModels?.length||d.imageAvailable===false)message='Provider model-access check did not list required models: '+[...(d.missingReasoningModels||[]),...(d.missingImageModels?.length?d.missingImageModels:d.imageAvailable===false?[d.imageModel||'configured image model']:[])].join(', ')+'. Generation has not started.';
 else message='Provider model access could not be verified. Generation has not started; inspect the access diagnostic before retrying.';
 return Object.assign(Error(message),{code:'PROVIDER_ACCESS_CHECK_FAILED',accessDiagnostic:d});
}
module.exports={diagnostic,failure};
