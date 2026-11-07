#!/usr/bin/env node
'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),flow=require('../../lib/creative-ai/experiments/lean-planner');
const dir=path.join(root,'work/lean-retail-airboost-20261106');
const ids=['retail-google','retail-banner','retail-screen','window','standee','wobbler','shelf-talker','counter-card','wall','poster','flyer','leaflet','bifold','trifold'];
async function main(){await fs.mkdir(dir,{recursive:true});let handle;try{handle=await fs.open(path.join(dir,'runner.lock'),'wx');}catch{throw Error('Retail runner lock exists; inspect before resuming');}
const state={startedAt:new Date().toISOString(),reused:['lean-airboost-dangler-astra-20261106-01'],pendingInput:['price-offer-board'],planningOnly:['dealer-partner-toolkit','store-city-language-versions','gt-coco-catalogue'],runs:[]};
const save=()=>fs.writeFile(path.join(dir,'status.json'),JSON.stringify(state,null,2));
try{
for(const id of ids){const f=flow.formats().find(f=>f.id===id);const brief=`Create ${f.name} for Duroflex Airboost 6.8 Arctic Ice, Queen 78 x 60 inches, 8 inches, for an evergreen retail product-discovery campaign. Help shoppers understand the supported firmness choice and latex comfort, and encourage an informed store conversation. Choose a distinct format-appropriate headline and composition; do not reuse the dangler headline or force a bedroom scene into every format. Use the supplied exact SKU evidence and applicable Duroflex guidance, named approved Poppins fonts and authentic logo as permitted. Decide copy volume from viewing distance and purpose: signage must be very concise, while handouts and brochure panels may explain verified benefits. Preserve all required pages with complementary roles and shared identity. Print outputs are flat artwork, never photographed mockups; respect folds, mounting keep-outs and safe areas. Do not invent price, offer, store address, contact details, partner identities or QR codes. Use an appropriate generic in-store CTA or the official website. Explicitly plan spatial placement and hierarchy.`;
const run=await flow.create(root,brief,'airboost-retail-'+id+'-20261106-01',id);state.runs.push({id:run.id,formatId:id,status:run.status});}
await save();let cursor=0;async function worker(){while(cursor<state.runs.length){const row=state.runs[cursor++];if(row.status!=='queued')continue;row.status='running';await save();try{const run=JSON.parse(await fs.readFile(path.join(flow.outputRoot(root),row.id,'run.json')));await flow.execute(root,run);const done=JSON.parse(await fs.readFile(path.join(flow.outputRoot(root),row.id,'run.json')));row.status=done.status;row.error=done.error;}catch(e){row.status='interrupted';row.error=e.message;}await save();console.log(JSON.stringify(row));}}
await Promise.all([worker(),worker()]);state.finishedAt=new Date().toISOString();await save();
}finally{await handle.close();await fs.unlink(path.join(dir,'runner.lock'));}}
main().catch(e=>{console.error(e);process.exitCode=1;});
