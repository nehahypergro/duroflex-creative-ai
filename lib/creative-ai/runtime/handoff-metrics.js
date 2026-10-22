'use strict';
const bytes=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value),'utf8');
function limits(config,request){
 const initial=request.maxOutputTokens??config.maxOutputTokens??25000,recovery=config.maxRecoveryOutputTokens??50000,timeout=config.reasoningTimeoutMs??240000;
 for(const [name,value]of Object.entries({maxOutputTokens:initial,maxRecoveryOutputTokens:recovery,reasoningTimeoutMs:timeout}))if(!Number.isSafeInteger(value)||value<=0)throw Error(name+' must be a positive safe integer');
 if(initial>recovery)throw Error('Initial output token limit exceeds configured recovery ceiling');
 if(timeout>2147483647)throw Error('Reasoning timeout exceeds supported timer range');
 return {initial,recovery,timeout};
}
function measure(body,serialized=JSON.stringify(body)){
 const content=(body.input||[]).flatMap(m=>m.content||[]),text=content.filter(c=>c.type==='input_text'),images=content.filter(c=>c.type==='input_image');
 return {version:1,requestBytes:bytes(serialized),instructionsBytes:bytes(body.instructions||''),schemaBytes:bytes(body.text?.format?.schema||{}),inputTextBytes:text.reduce((n,c)=>n+bytes(c.text),0),inputTextCharacters:text.reduce((n,c)=>n+c.text.length,0),imageCount:images.length,imageDataUrlBytes:images.reduce((n,c)=>n+bytes(c.image_url),0),tokenMeasurement:'Provider usage is authoritative; bytes and characters are not token counts.'};
}
module.exports={limits,measure};
