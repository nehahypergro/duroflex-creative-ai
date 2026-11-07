'use strict';
const policy=require('../../runtime/placement-logo-policy');
function resolve(format){
 const intake={placementPublishing:{[format.formatId]:{brandedHost:true}}};
 return {version:1,pages:format.pages.map((page,i)=>{
 const selected={description:{formatId:format.formatId,...(format.id==='carousel'?{carousel:{index:i+1,count:format.pages.length}}:{})}};
 const logo=format.text==='none'?{version:1,treatment:'omit',reason:'Image-only placement excludes added campaign identity.',preserveProductMarkings:true}:policy.resolvePolicy(intake,selected);
 return {id:page.id,logo,rule:{id:'placement-logo-'+page.id,text:page.id+': '+policy.guidance({}, {jobInputs:{logoPolicy:logo}})}};
 })};
}
function logoRequired(input,id){return input.requirements?input.requirements.pages.find(p=>p.id===id)?.logo.treatment!=='omit':input.format.text!=='none';}
function references(input,id,refs){return logoRequired(input,id)?refs:refs.slice(0,1);}
module.exports={resolve,logoRequired,references};
