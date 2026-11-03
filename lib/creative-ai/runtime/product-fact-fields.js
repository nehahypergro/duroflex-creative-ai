'use strict';
const crypto=require('node:crypto');
const categories=['dimensions','materials','care','warranty','service','certification'];
function category(label){
 for(const [kind,re] of [['dimensions',/dimension|length|width|height|thickness|\bsize\b/i],['materials',/material|construction|composition/i],['care',/care|wash|clean/i],['warranty',/warranty|guarantee/i],['service',/delivery|installation|return|trial|service/i],['certification',/certif|verification|accredit/i]])if(re.test(label))return kind;
 return 'other';
}
function extract(html,clean){
 const out=[];
 for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(m=>clean(m[1]));
  if(cells.length===2&&cells.every(Boolean))out.push({label:cells[0],value:cells[1],origin:'official-page-table'});
 }
 for(const row of html.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi))if(clean(row[1])&&clean(row[2]))out.push({label:clean(row[1]),value:clean(row[2]),origin:'official-page-definition'});
 return out;
}
function build(profile){
 const entries=[],seen=new Set(),source={brandId:profile.brandId,productId:profile.id,snapshot:profile.snapshot,pageHash:profile.pageHash,url:profile.pageUrl};
 function add(label,value,variantId,origin){if(!label||!value)return;label=String(label);value=String(value);const key=JSON.stringify([label,value,variantId]);if(seen.has(key))return;seen.add(key);entries.push({id:'field-'+crypto.createHash('sha256').update(key).digest('hex').slice(0,20),category:category(label),label,value,variantId:variantId||null,status:'stated',source:{...source,origin}});}
 for(const f of profile.specificationFields||[])add(f.label,f.value,null,f.origin);
 for(const s of profile.contentSections||[])if(category(s.heading)!=='other')add(s.heading,s.text,null,'official-page-section');
 for(const v of profile.variants||[])for(const a of v.attributes||[])add(a.name,a.value,String(v.id),'saved-official-variant');
 const groups=new Map();for(const e of entries){const key=JSON.stringify([e.variantId,e.label.toLowerCase().trim()]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
 for(const group of groups.values())if(new Set(group.map(e=>e.value.toLowerCase().trim())).size>1)for(const e of group)e.status='conflicting';
 return {version:1,entries,missing:categories.filter(c=>!entries.some(e=>e.category===c)),basis:'Client-approved official source statements. Values retain full source wording and conditions; extraction does not resolve conflicts, infer units, independently certify claims or approve generated artwork.'};
}
function forVariant(catalog,variantId){const entries=catalog.entries.filter(e=>!e.variantId||String(e.variantId)===String(variantId));return {...catalog,entries,missing:categories.filter(c=>!entries.some(e=>e.category===c))};}
module.exports={extract,build,forVariant};
