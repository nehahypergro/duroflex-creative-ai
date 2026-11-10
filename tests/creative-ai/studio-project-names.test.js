'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
test('automatic names use a short product and asset without changing saved product evidence',()=>{for(const [productName,title] of [['Duropedic Airboost 6.8 Arctic Ice Mattress | 1 lakh+ fibres | 100 nights trial','Airboost 6.8 · Display'],['Sleepyhead Napster Mini 2 Seater Sofa | Washable cover','Napster Mini · Display']]){const p={productSummary:{name:productName},intake:{productName,campaignName:productName},placements:[{id:'display-240',name:'Display · vertical rectangle · 240×400'}]},before=JSON.stringify(p);assert.equal(M.projectTitle(p),title);assert.equal(JSON.stringify(p),before);}});
test('campaigns and collection names describe the assignment, not every slot',()=>{assert.equal(M.projectTitle({productName:'Duroflex Airboost 6.8 Arctic Ice Mattress',outputs:[M.output(1),M.output(9)]},{automatic:true}),'Airboost 6.8 · Campaign');assert.equal(M.projectTitle({productName:'Sleepyhead Napster Mini Sofa',outputs:[M.output(9)]},{automatic:true}),'Napster Mini · Carousel');assert.equal(M.projectTitle({focus:'brand',outputs:[M.output(6)]},{automatic:true}),'Brand · A+ content');});
test('intentional names and browser renames always win',()=>{const p={intake:{campaignName:'Diwali launch',productName:'Duroflex Airboost Mattress'}};assert.equal(M.projectTitle(p),'Diwali launch');assert.equal(M.projectTitle(p,{override:'My exact name'}),'My exact name');assert.equal(M.projectTitle({manualName:true,name:'Customer chosen name',productName:'Airboost',outputs:[M.output(9)]},{automatic:true}),'Customer chosen name');});
test('empty and long input have bounded usable automatic names',()=>{assert.equal(M.projectTitle({outputs:[]},{automatic:true}),'New creative');assert.ok(M.projectTitle({productName:'X'.repeat(200),outputs:[M.output(9)]},{automatic:true}).length<=64);});
test('brief focus is a complete short message or selected feature, never a cut-off claim',()=>{
 const base={productName:'Duroflex Airboost 6.8 Arctic Ice Mattress',outputs:[M.output(9)]};
 // Naming v2 (10 Nov 2026): the brief focus no longer goes into the automatic name.
 assert.equal(M.projectTitle({...base,message:'Firmness choice'},{automatic:true}),'Airboost 6.8 · Carousel');
 assert.equal(M.projectBriefFocus({message:'Highlight the reversible latex topper.'}),'Reversible latex topper');
 assert.equal(M.projectBriefFocus({message:'Explain how to choose the right mattress for a family with different preferences',selectedRtbs:['Reversible latex topper']}),'Reversible latex topper');
 assert.equal(M.projectBriefFocus({selectedRtbs:['Support for back pain only when used with the matching foundation.']}),'');
 assert.equal(M.projectBriefFocus({message:'Do not show people',brief:'Make an Instagram post'}),'');
 assert.equal(M.projectBriefFocus({intake:{brief:'Supplied instructions\nMain message: Small-space living\nAudience: young adults'}}),'Small-space living');
 assert.equal(M.projectBriefFocus({message:'बेहतर नींद का अनुभव'}),'बेहतर नींद का अनुभव');
 assert.equal(M.projectTitle({...base,message:'Firmness choice',manualName:true,name:'My launch'},{automatic:true}),'My launch');
});
test('duplicate names are numbered deterministically within each brand while manual names are reserved',()=>{
 const make=(id,brandId='duroflex',extra={})=>({id,brandId,name:'Airboost · Firmness choice · Carousel',createdAt:'2026-10-29T00:00:0'+id+'Z',...extra});
 const p=[make('3'),make('1'),make('2'),make('4','sleepyhead')],before=JSON.stringify(p),names=M.disambiguateProjectNames(p);
 assert.equal(names.find(p=>p.id==='1').name,'Airboost · Firmness choice · Carousel');
 assert.match(names.find(p=>p.id==='2').name,/ · try 2$/);assert.match(names.find(p=>p.id==='3').name,/ · try 3$/);
 assert.equal(names.find(p=>p.id==='4').name,p[0].name);
 assert.deepEqual(M.disambiguateProjectNames([...p].reverse()).sort((a,b)=>a.id.localeCompare(b.id)),names.sort((a,b)=>a.id.localeCompare(b.id)));
 assert.equal(JSON.stringify(p),before);
 const locked=M.disambiguateProjectNames([make('1'),make('2','duroflex',{nameLocked:true})]);
 assert.match(locked[0].name,/ · try 2$/);assert.equal(locked[1].name,p[0].name);
 assert.equal(M.nextProjectName('Diwali launch',['diwali launch','Diwali launch · try 2']),'Diwali launch · try 3');
});
test('a submitted draft and its generated job share a title; a separate copy does not',()=>{
 const draft={id:'draft-a',brandId:'duroflex',name:'Airboost · Firmness choice · Carousel',createdAt:'2026-10-29T01:00:00Z'};
 const job={...draft,id:'job-a',createdAt:'2026-10-29T02:00:00Z',intake:{sourceStudioDraftId:draft.id}};
 const copy={...job,id:'copy-a',collectionCopy:true,createdAt:'2026-10-29T03:00:00Z'};
 const result=M.disambiguateProjectNames([draft,job,copy]);assert.equal(result[0].name,result[1].name);assert.equal(result[2].name,draft.name+' · try 2');
});

// Naming v2 (user decision, 10 Nov 2026): "Posture Perfect · Doctor recommended · A+ content (8)" told nothing
// ("(8)") and showed a feature that was not in the brief. Automatic names are Product · Format · Goal · date.
for(const [brand,product,card] of [['Duroflex','Posture Perfect Pocket Spring Orthopedic Mattress','amazon-aplus'],['Sleepyhead','Napster Mini Mattress','linkedin-carousel']])test(brand+': automatic names read Product · Format · Goal · date',()=>{
 const d=M.startAssetDraft('brand-'+brand.toLowerCase(),[card]);Object.assign(d,{productName:product,objective:'Purchase',createdAt:'2026-11-10T06:00:00Z',selectedRtbs:['Doctor recommended']});
 const title=M.projectTitle(d,{automatic:true});assert.match(title,new RegExp('^'+(brand==='Duroflex'?'Posture Perfect':'Napster Mini')+' · '+M.assetCard(card).name.replace(/[+]/g,'\\+')+' · Purchase · 10 Nov$'));
 assert.doesNotMatch(title,/Doctor recommended/);
});
