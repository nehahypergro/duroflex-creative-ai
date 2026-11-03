'use strict';
const fs=require('fs'),path=require('path');
const hostname=value=>new URL(value).hostname.toLowerCase().replace(/^www\./,'');
function groupPolicy(root){
 const config=JSON.parse(fs.readFileSync(path.join(root,'workspace.json'),'utf8'));
 const byId=new Map(config.brands.map(b=>[b.id,b]));
 function brand(id,url){const b=byId.get(id);if(!b)throw Error('Choose Duroflex or Sleepyhead in this group workspace.');if(url&&hostname(url)!==hostname(b.brandUrl))throw Error('The website does not belong to the selected brand.');return b;}
 function intake(value){brand(value.brandId,value.brandUrl);const b=byId.get(value.brandId);for(const field of ['productPageUrl','landingPageUrl'])if(value[field]&&hostname(value[field])!==hostname(b.brandUrl))throw Error(field+' must belong to '+b.name+'.');return value;}
 function mount(runtime){
  const readBrand=runtime.brands.read.bind(runtime.brands);runtime.brands.read=async id=>{brand(id);return readBrand(id);};
  const listBrands=runtime.brands.list.bind(runtime.brands);runtime.brands.list=async()=> (await listBrands()).filter(b=>byId.has(b.id));
  runtime.brands.create=async()=>{throw Error('This dedicated studio supports Duroflex and Sleepyhead. Add group brands through workspace configuration.');};
  for(const store of [runtime.store,runtime.researchSessions.store]){const read=store.read.bind(store);store.read=async(id,options)=>{const j=await read(id,options);brand(j.intake.brandId,j.intake.brandUrl);return j;};}
  const create=runtime.createRequest.bind(runtime);runtime.createRequest=value=>create(intake(value));
  const research=runtime.researchSessions.createRequest.bind(runtime.researchSessions);runtime.researchSessions.createRequest=value=>research(intake(value));
 }
 return {config,brand,intake,mount};
}
module.exports={groupPolicy};
