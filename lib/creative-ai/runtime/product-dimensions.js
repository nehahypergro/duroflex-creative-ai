'use strict';
function dimensions(input){
 if(input===undefined||input?.status==='unknown'){if(input&&['length','width','height'].some(k=>input[k]!==undefined&&input[k]!==null&&input[k]!==''))throw Error('Unknown dimensions cannot include measurements.');return {status:'unknown',length:null,width:null,height:null,unit:null,centimetres:null,source:'Dimensions not confirmed; never infer them from an image.'};}
 if(!input||input.status!=='specified'||!['mm','cm','in'].includes(input.unit))throw Error('Choose known dimensions with mm, cm or inches, or mark dimensions unknown.');
 const numbers={};for(const key of ['length','width','height']){const n=input[key];if(key==='height'&&(n===null||n===undefined||n==='')){numbers[key]=null;continue;}if(typeof n!=='number'||!Number.isFinite(n)||n<0.000001||n>100000)throw Error('Product '+key+' must be a positive number (up to 100000).');numbers[key]=n;}
 if(typeof input.source!=='string'||!input.source.trim()||input.source.length>500)throw Error('Provide the product specification or source for these dimensions (up to 500 characters).');const factor={mm:.1,cm:1,in:2.54}[input.unit];return {status:'specified',...numbers,unit:input.unit,centimetres:Object.fromEntries(Object.entries(numbers).map(([k,v])=>[k,v===null?null:Number((v*factor).toPrecision(12))])),source:input.source.trim()};
}
module.exports={dimensions};
