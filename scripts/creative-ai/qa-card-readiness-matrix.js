#!/usr/bin/env node
'use strict';
// Free readiness matrix (15 Nov 2026, user request): every ready asset card x every saved product of
// Duroflex and Sleepyhead, rotating objective / message type / language, built the way the Studio
// brief page builds a draft (StudioModel), then sent to the real /creative-ai/api/studio/preflight
// route of an in-process server. No provider is reachable: any reasoning or image call fails the run.
// Usage: node scripts/creative-ai/qa-card-readiness-matrix.js --root <workspace copy> [--out file] [--cards a,b] [--brand Duroflex]
const path=require('path'),fs=require('fs');
const arg=k=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:null;};
const root=path.resolve(arg('root')||path.resolve(__dirname,'../..'));
const out=arg('out')||path.join(root,'work/qa-card-readiness-matrix.json');
const M=require(path.join(root,'public/creative-ai/studio-model.js'));
const OBJECTIVES=['Awareness','Consideration','Purchase','Engagement','Education'];
const LANGS=['English','Hindi','Hinglish','Kannada','Tamil','Telugu','Malayalam','Gujarati','Marathi','Bengali'];
const TYPES=[null,...M.messageTypes||['Benefit','Product launch','Offer / price / EMI','Proof / claim','Technology','Comparison','Store news']];
const noPaid={reason(){throw Error('PAID_CALL_ATTEMPTED reasoning');},generate(){throw Error('PAID_CALL_ATTEMPTED image');}};
function fill(o,d,i){
 // Mirror a person completing the card's required fields: first option for selects, plain text otherwise.
 for(let pass=0;pass<4;pass++){const recipe=M.staticRecipeForOutput(o,d);if(!recipe)return;const need=M.requiredAssetFields(o,d);let changed=false;
  for(const [name,,type,options] of recipe.fields){if(!need.includes(name))continue;const v=M.assetValues(o,d)[name];if(String(v||'').trim())continue;
   let value;if(type==='select')value=(options||[]).find(x=>x&&!/attached reference/i.test(x))||options?.[0];else if(type==='url')value='https://www.example.com/test-landing';else if(type==='number')value=/^(mobile|desktop)?(Width|Height)$|^mobile|^desktop/.test(name)?'1080':'600';else if(type==='date')value='2026-12-01';else value=name==='marketplaceName'?'Flipkart':'Test value for '+name;
   if(value==null)continue;o.staticValues={...(o.staticValues||{}),[name]:value};changed=true;}
  if(!changed)return;}
}
// Selects the brief page actually shows (studio.js legacyStaticSetup / staticSetup filters).
function visibleOptions(o,d,name,options){
 const v=M.assetValues(o,d);
 if(o.featureId===9&&['narrativeType','narrative','caption','destination'].includes(name))return [];
 if(name==='imageRatios'&&v.platform!=='PMax')return [];
 if(['categoryName','labelTreatment'].includes(name)&&v.websiteType!=='Category tile')return [];
 if(name==='rcsPreset'&&M.rcsImage(o)){const carousel=!!M.rcsPresets[o.staticValues?.rcsPreset]?.carousel;return options.filter(x=>!!M.rcsPresets[x]?.carousel===carousel);}
 return options;
}
// The brief page's own select handler (studio.js staticChange -> StudioModel.applyStaticChange).
const setField=(o,d,key,value)=>M.applyStaticChange(o,d,key,value);
function offer(d,o){
 // An Offer brief needs exact wording; supply it the way a person would on the brief page.
 d.details={...(d.details||{}),offer:'Flat 10% off',offerStart:'2026-11-20',offerEnd:'2026-11-30',terms:'T&C apply.'};
 o.staticValues={...(o.staticValues||{}),offer:'Flat 10% off',offerStart:'2026-11-20',offerEnd:'2026-11-30',terms:'T&C apply.',offerValidity:'Date range',promotionMode:'Yes'};
}
async function main(){
 const {createServer}=require(path.join(root,'server.js'));const {server,runtime}=createServer({root,resumeJobs:false,provider:noPaid});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const onlyCards=arg('cards')?.split(','),onlyBrand=arg('brand');
 const brands=(await runtime.brands.list()).filter(b=>!onlyBrand||b.name===onlyBrand);
 const cards=M.assetCatalogue.filter(c=>c.status==='ready'&&!c.preset?.tool&&(!onlyCards||onlyCards.includes(c.id)));
 const rows=[];let n=0;const started=Date.now();
 const preflight=async(d,row)=>{const t=Date.now(),res=await fetch(base+'/creative-ai/api/studio/preflight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:d})});
  const body=await res.json().catch(()=>({}));row.ms=Date.now()-t;row.status=res.status;row.stage='readiness';
  row.ok=res.status===200&&!(body.checks||[]).some(c=>c.status==='failed');if(!row.ok)row.error=body.error||JSON.stringify((body.checks||[]).filter(c=>c.status!=='passed')).slice(0,600);
  row.checks=(body.checks||[]).filter(c=>c.status!=='passed').map(c=>c.label+': '+c.status);if(body.blocked?.length){row.blocked=body.blocked.map(x=>x.name+': '+(x.reason||x.error||''));}
  if(body.summary)row.summary=body.summary;return body;};
 const build=(b,ids,p,{objective='Awareness',language='English',type=null}={})=>{const d=M.startAssetDraft(b.id,ids);d.intakeVersion=2;d.name=ids.join('+')+' test';
  d.brief=`${ids.map(id=>M.assetCard(id).name).join(', ')} for ${p.name}. ${objective}. Show the product's real benefits.`;d.objective=objective;
  let variant=M.defaultVariant(p);if(!variant&&p.variants?.length)variant=String(p.variants[0].id);M.selectBriefProduct(d,p,variant);
  d.language=language;for(const o of d.outputs)o.language=language;if(type)M.applyMessageType(d,type);
  if(!M.selectedProductRtbs(d,p).length&&!d.rtbs)d.rtbs='Comfortable support for everyday rest';return d;};
 const finish=async(d,b,products,brand,row)=>{for(const o of d.outputs){if(d.messageType==='Offer / price / EMI'||M.retailEntry?.(o)?.key==='price')offer(d,o);fill(o,d);}
  M.confirmRequirements(d);const ui=M.validateBrief(d,{products,brand});if(Object.keys(ui).length){row.stage='brief-page';row.ok=false;row.error=Object.values(ui).join(' | ');return null;}return preflight(d,row);};
 if(arg('mode')==='options'||arg('mode')==='campaign'){
  for(const b of brands){const brand=await runtime.brands.read(b.id);const products=await (await fetch(base+'/creative-ai/api/brands/'+b.id+'/products')).json();
   const mattress=products.find(p=>/mattress/i.test(p.category||'')),other=products.find(p=>!/mattress/i.test(p.category||''));const picks=[mattress,other].filter(Boolean);
   if(arg('mode')==='options')for(const card of cards)for(const p of picks){
    // Every select on the card's brief page, each option once (others at their default), including options that appear after a choice.
    const seen=new Set(),queue=[[]];
    while(queue.length){const path=queue.shift();const d=build(b,[card.id],p);const o=d.outputs[0];for(const [k,v] of path)setField(o,d,k,v);
     const recipe=M.staticRecipeForOutput(o,d);if(!recipe)continue;
     for(const [name,,type,options] of recipe.fields){if(type!=='select'||!options?.length||path.some(([k])=>k===name))continue;
      for(const v of visibleOptions(o,d,name,options)){const key=JSON.stringify([...path,[name,v]]);if(seen.has(name+'='+v))continue;seen.add(name+'='+v);
       const row={brand:b.name,card:card.id,product:p.name,option:[...path,[name,v]].map(([k,x])=>k+'='+x).join(', ')};
       try{const d2=build(b,[card.id],p);const o2=d2.outputs[0];for(const [k,x] of [...path,[name,v]])setField(o2,d2,k,x);if(/Offer|Yes|promotion/i.test(v))offer(d2,o2);await finish(d2,b,products,brand,row);}catch(e){row.ok=false;row.stage=row.stage||'build';row.error=String(e.message).slice(0,600);}
       rows.push(row);if(path.length<1)queue.push([...path,[name,v]]);}}}
   }
   if(arg('mode')==='campaign'){const ready=cards.map(c=>c.id).filter(id=>id!=='web-push-icon');let seed=7;const rnd=k=>{seed=(seed*1103515245+12345)%2147483648;return seed%k;};
    for(let i=0;i<Number(arg('count')||60);i++){const size=2+rnd(3),ids=[];while(ids.length<size){const id=ready[rnd(ready.length)];if(!ids.includes(id))ids.push(id);}const p=products[rnd(products.length)];
     const row={brand:b.name,card:ids.join('+'),product:p.name,option:'campaign of '+size};
     try{const d=build(b,ids,p,{objective:OBJECTIVES[i%5],language:LANGS[i%LANGS.length],type:TYPES[i%TYPES.length]});const body=await finish(d,b,products,brand,row);
      if(body&&row.ok){const kids=body.campaignChildren||body.children||[];row.children=kids.length;}}catch(e){row.ok=false;row.stage=row.stage||'build';row.error=String(e.message).slice(0,600);}
     rows.push(row);}}
  }
 }else
 for(const b of brands){const brand=await runtime.brands.read(b.id);const products=await (await fetch(base+'/creative-ai/api/brands/'+b.id+'/products')).json();
  for(const [ci,card] of cards.entries())for(const [pi,p] of products.entries()){
   const i=n++,row={brand:b.name,card:card.id,product:p.name,productId:p.id};
   try{
    const d=M.startAssetDraft(b.id,[card.id]);d.intakeVersion=2;d.name=card.name+' test';
    const objective=OBJECTIVES[(ci+pi)%5],language=LANGS[(ci*3+pi)%LANGS.length],type=TYPES[(ci+pi*2)%TYPES.length];
    d.brief=`${card.name} for ${p.name}. ${objective}. Show the product's real benefits.`;d.objective=objective;
    let variant=M.defaultVariant(p);if(!variant&&p.variants?.length)variant=String(p.variants[(ci+pi)%p.variants.length].id);
    M.selectBriefProduct(d,p,variant);
    d.language=language;for(const o of d.outputs)o.language=language;
    if(type)M.applyMessageType(d,type);
    if(!M.selectedProductRtbs(d,p).length&&!d.rtbs)d.rtbs='Comfortable support for everyday rest';
    for(const o of d.outputs){if(type==='Offer / price / EMI'||M.retailEntry?.(o)?.key==='price')offer(d,o);fill(o,d,i);}
    Object.assign(row,{objective,language,messageType:type||'(let us decide)',variant});
    M.confirmRequirements(d);
    const ui=M.validateBrief(d,{products,brand});if(Object.keys(ui).length){row.stage='brief-page';row.ok=false;row.error=Object.values(ui).join(' | ');rows.push(row);continue;}
    const t=Date.now(),res=await fetch(base+'/creative-ai/api/studio/preflight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:d})});
    const body=await res.json().catch(()=>({}));row.ms=Date.now()-t;row.status=res.status;row.stage='readiness';
    row.ok=res.status===200&&!(body.checks||[]).some(c=>c.status==='failed');
    if(!row.ok)row.error=body.error||JSON.stringify((body.checks||[]).filter(c=>c.status!=='passed')).slice(0,600);
    row.checks=(body.checks||[]).filter(c=>c.status!=='passed').map(c=>c.label+': '+c.status);
    if(body.blocked?.length)row.blocked=body.blocked.map(x=>x.name+': '+(x.reason||x.error||''));
   }catch(e){row.ok=false;row.stage=row.stage||'build';row.error=String(e.message).slice(0,600);}
   rows.push(row);
   if(rows.length%50===0)process.stderr.write(`${rows.length} done, ${rows.filter(r=>!r.ok).length} problems, ${Math.round((Date.now()-started)/1000)}s\n`);
  }}
 server.close();fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({at:new Date().toISOString(),root,rows},null,1));
 const bad=rows.filter(r=>!r.ok),groups={};for(const r of bad){const k=r.stage+' · '+String(r.error).replace(/[0-9a-f]{16,}/g,'#').replace(/\/[^ ']*\//g,'/…/').slice(0,160);(groups[k]=groups[k]||[]).push(r.brand+'/'+r.card+'/'+r.product.slice(0,24)+(r.option?' ['+r.option+']':''));}
 console.log(`${rows.length} combinations, ${rows.length-bad.length} passed, ${bad.length} problems`);
 for(const [k,v] of Object.entries(groups).sort((a,b)=>b[1].length-a[1].length))console.log(`\n[${v.length}] ${k}\n   e.g. ${v.slice(0,4).join('; ')}`);
 process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
