'use strict';
// A deterministic view of already-researched evidence, never a model summary.
// Full source registries remain in the job; prose, qualifiers and rules are intact.
const fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto');
const VERSION=1,hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const roles=new Set(['strategy','concepts','copy','art','reconciliation','review']);
function expand(value,shared){
 if(Array.isArray(value))return value.map(v=>expand(v,shared));
 if(value&&typeof value==='object'){
  if(Object.keys(value).length===1&&value.sharedTextId){if(!Object.hasOwn(shared,value.sharedTextId))throw Error('Missing shared context text');return shared[value.sharedTextId];}
  return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,expand(v,shared)]));
 }return value;
}
function compile(role,input){
 if(!roles.has(role)||!input.brandKnowledge?.brandId)return {input:structuredClone(input),packet:null};
 const out=expand(input,input.sharedText||{});delete out.sharedText;delete out.sharedTextInstructions;
 const scope=out.brandKnowledge,sourceMap=new Map();
 function inventory(v){if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(k==='sources'&&Array.isArray(x))for(const s of x)sourceMap.set(s.id,s);else if(x&&typeof x==='object')inventory(x);}}inventory(out);
 const brandSources=new Set([...sourceMap.values()].filter(s=>!['product','user'].includes(s.kind)&&!/^source-(selected|protected)-/.test(s.id)).map(s=>s.id));
 const fields={};
 function visit(v,parts=[]){if(!v||typeof v!=='object')return;for(const [key,rows]of Object.entries(v)){
  const location=[...parts,key];
  if(Array.isArray(rows)&&['sources','findings','facts','assets','requirements','preferences','visualRules'].includes(key)){
   const stable=[],dynamic=[];
   for(const row of rows){
    const isStatic=key==='sources'?brandSources.has(row.id):row&&typeof row==='object'&&row.sourceIds?.length&&row.sourceIds.every(id=>brandSources.has(id))&&(key!=='facts'||row.kind==='brand')&&(key!=='assets'||row.kind!=='product');
    let value=row;
    // URLs/dates resolve by ID in the full saved registry. Keep source status,
    // labels and every authority/coverage note; product/user URLs stay in full.
    if(key==='sources'&&isStatic){const {reference,collectedAt,brandId,...decisionSource}=row;value=decisionSource;}
    (isStatic?stable:dynamic).push(value);
   }
   if(stable.length){const field=location.join('.');fields[field]=stable;v[key]={brandContextPath:field,items:dynamic};}
  }else if(rows&&typeof rows==='object')visit(rows,location);
 }}visit(out);
 if(!Object.keys(fields).length)return {input:out,packet:null};
 const packet={version:VERSION,role,brandId:scope.brandId,revision:scope.revision,fields};
 out.brandContextUsage='For each {brandContextPath,items}, combine brandContext.fields[brandContextPath] with items to read that evidence array. All rule and finding text is preserved. Brand source URLs and collection dates resolve by ID in the complete local archive; source authority and coverage notes remain here. These references do not create new facts or approvals.';
 return {input:out,packet};
}
async function prepare(role,input,directory){
 const result=compile(role,input);if(!result.packet)return {...result,metadata:{status:'not-applicable'}};
 const key=hash(result.packet),metadata={version:VERSION,role,key,status:'compiled',characters:JSON.stringify(result.packet).length};
 if(directory){
  const file=path.join(directory,key+'.json');let saved;
  try{saved=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(saved){if(saved.key!==key||hash(saved.packet)!==key)throw Error('Saved role context changed.');result.packet=saved.packet;metadata.status='hit';}
  else{await fs.mkdir(directory,{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.pending';await fs.writeFile(temp,JSON.stringify({key,packet:result.packet})+'\n');await fs.rename(temp,file);metadata.status='created';}
 }
 result.input.brandContext=require('./focused-context').shareText(result.packet);
 return {...result,metadata};
}
module.exports={compile,prepare,expand,VERSION};
