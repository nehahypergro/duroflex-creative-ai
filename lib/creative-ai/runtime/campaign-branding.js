'use strict';
const fs=require('./artifact-fs'),path=require('path'),sharp=require('sharp');
const {createHash}=require('crypto');
const brands={
 'brand-1923d633-e03e-44cc-84b2-bbfb5c152710':{name:'Duroflex',host:'duroflexworld.com',file:'duroflex-logo.png'},
 'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de':{name:'Sleepyhead',host:'mysleepyhead.com',file:'sleepyhead-logo.png'},
};
async function load(runtime,job){
 const spec=brands[job.intake.brandId];if(!spec)return null;
 const brand=await runtime.brands.read(job.intake.brandId);
 const host=url=>new URL(url).hostname.replace(/^www\./,'');
 if(brand.id!==job.intake.brandId||brand.name!==spec.name||host(brand.brandUrl)!==spec.host||host(job.intake.brandUrl)!==spec.host)throw Error('Presentation logo does not match this campaign brand.');
 const source='public/creative-ai/'+spec.file;
 let bytes;try{bytes=await fs.readFile(path.join(runtime.root,source));}catch(e){if(e.code==='ENOENT')throw Error(spec.name+' presentation logo is unavailable. Restore the saved brand logo and retry.');throw e;}
 const meta=await sharp(bytes).metadata();if(meta.format!=='png'||!meta.width||!meta.height)throw Error('The saved presentation logo is not a valid PNG.');
 return {brandId:brand.id,name:brand.name,source,sha256:createHash('sha256').update(bytes).digest('hex'),width:meta.width,height:meta.height,bytes};
}
function metadata(logo){if(!logo)return null;const {bytes,...value}=logo;return value;}
function fit(logo,maxWidth,maxHeight){const scale=Math.min(maxWidth/logo.width,maxHeight/logo.height);return {width:logo.width*scale,height:logo.height*scale};}
module.exports={load,metadata,fit};
