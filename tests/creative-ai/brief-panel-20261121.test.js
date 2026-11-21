'use strict';
// Regression (Neha, 21 Nov 2026): the brief beside a design showed only the ask, a few tags and, under "Show full
// brief", the brief text plus Product / Audience / Message. Every other saved field (funnel stage, communication goal,
// reasons to believe, look and feel, references, the format's own fields such as the offer wording, planning) was
// missing. Failing before: M.briefDetails did not exist and the panel listed three rows only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../../public/creative-ai/studio-model.js');

const BRANDS=[
 {brandId:'brand-duroflex-test',brand:'Duroflex',product:{id:'product-d1',name:'Test Orthopaedic Mattress',variants:[{id:'101',name:'Queen / 72 x 60'}]}},
 {brandId:'brand-sleepyhead-test',brand:'Sleepyhead',product:{id:'product-s1',name:'Test Three Seater Sofa',variants:[{id:'202',name:'Coco Brown / 3 Seater'}]}},
];
function brief(x){
 return {brandId:x.brandId,brief:'Purchase campaign for the '+x.product.name+'. Make a PMax image set.',objective:'Purchase',funnelStage:'BOFU',messageType:'Benefit',
  message:'Get first-home couples to buy now by showing everyday comfort',audience:'First-home couples',customerAge:'25–34',markets:'Tier 1 / metros',occasion:'Diwali',language:'English',
  focus:'product',productId:x.product.id,productName:x.product.name,variant:x.product.variants[0].id,productUrl:'https://example.test/'+x.product.id,
  selectedRtbs:['Zero motion transfer','10-year warranty'],mandatoryInfo:'T&C apply',people:'Decide from the brief',setting:'Living room',lighting:'Decide from the brief',
  details:{creativeDirection:'Warm and calm'},references:[{id:'ref-1',name:'store-window.jpg'}],
  outputs:[{id:'o1',featureId:1,name:'PMax image set',width:1200,height:628,staticValues:{platform:'PMax',offer:'Flat 20% off',terms:'None'}}],
  planning:{strategy:{proposition:'Comfort you notice',approach:''},concepts:[],team:'Brand team',deadline:''}};
}
const flat=r=>Object.fromEntries(r.groups.flatMap(g=>g.rows));

for(const x of BRANDS)test(x.brand+': the brief panel lists every saved brief field, grouped',()=>{
 assert.equal(typeof M.briefDetails,'function');
 const r=M.briefDetails(brief(x),{},{item:{featureId:1,name:'PMax landscape image'},products:[x.product]}),rows=flat(r);
 assert.match(r.brief,/PMax image set/);
 assert.deepEqual(r.groups.map(g=>g.title),['Campaign','Look and feel','References','This format · PMax image set','Planning']);
 for(const [k,v] of Object.entries({Product:x.product.name,Variant:x.product.variants[0].name,Objective:'Purchase','Funnel stage':'BOFU','Message type':'Benefit','Age group':'25–34',Markets:'Tier 1 / metros',Occasion:'Diwali','Reasons to believe':'Zero motion transfer; 10-year warranty','Mandatory information':'T&C apply',Setting:'Living room','Creative direction':'Warm and calm','Reference 1':'store-window.jpg','Exact offer / price wording':'Flat 20% off','Image destination':'PMax',Size:'1200 × 628 px',Proposition:'Comfort you notice',Team:'Brand team'}))assert.equal(rows[k],v,k);
 assert.equal(rows['Communication goal'],'Get first-home couples to buy now by showing everyday comfort');
 // Empty fields are named once, never shown as blank rows; optional printer notes and planning blanks stay out.
 const campaign=r.groups.find(g=>g.title==='Campaign');assert.ok(campaign.missing.includes('Background / customer insight'));assert.ok(!campaign.rows.some(([,v])=>!v));
 assert.ok(r.groups.find(g=>g.title.startsWith('This format')).missing.includes('Main benefit'));
 assert.equal(r.groups.find(g=>g.title==='Planning').missing.length,0);
});

test('engine default wording and unknown variant ids are not shown as the brief',()=>{
 const x=BRANDS[0],b={...brief(x),desiredAction:'Choose the next action appropriate to this asset’s purpose and supplied brief; honour any CTA.'},rows=flat(M.briefDetails(b,{},{item:{featureId:1},products:[]}));
 assert.equal(rows['What people should do'],undefined);assert.equal(rows.Variant,undefined);
 assert.ok(!M.briefDetails(b,{},{products:[]}).groups.find(g=>g.title==='Campaign').missing.includes('Variant'));
});

test('a campaign brief names the other formats; the panel renders the grouped brief',()=>{
 const x=BRANDS[1],b=brief(x);b.outputs.push({id:'o2',featureId:11,name:'Brochure / Leaflet',width:1790,height:1276,staticValues:{retailPreset:'brochure'}});
 const r=M.briefDetails(b,{},{item:{featureId:1,name:'PMax image set'},products:[x.product]});
 assert.deepEqual(r.groups.find(g=>g.title==='Other formats in this brief').rows,[['Brochure / Leaflet','1790 × 1276 px']]);
 const src=fs.readFileSync(path.join(__dirname,'../../public/creative-ai/studio.js'),'utf8');
 assert.match(src,/M\.briefDetails\(b,intake,\{item,products:state\.products\}\)/);assert.match(src,/class="brief-field-group"/);assert.match(src,/class="brief-missing"/);
});

// The page only receives the job view's briefSummary; before, it carried brief text, product, audience, objective,
// language, message type and offer only, so the panel could not show the rest.
for(const x of BRANDS)test(x.brand+': the job view sends every brief-form field, never pictures or readings',()=>{
 const S=require('../../lib/creative-ai/runtime/brief-summary'),b={...brief(x),creativeReference:{name:'old-banner.png',use:['layout'],imageData:'data:image/png;base64,AAAA'},briefReading:{result:{ask:'Sell the '+x.product.name}},references:[{id:'ref-1',name:'store-window.jpg',imageData:'data:image/png;base64,BBBB'}]};
 const s=S.summary({intake:{brandId:x.brandId},submittedBrief:b});
 for(const k of ['funnelStage','message','customerAge','markets','occasion','mandatoryInfo','people','setting','lighting'])assert.equal(s[k],b[k],k);
 assert.deepEqual(s.selectedRtbs,b.selectedRtbs);assert.equal(s.outputs[0].staticValues.offer,'Flat 20% off');assert.equal(s.planning.team,'Brand team');assert.equal(s.ask,'Sell the '+x.product.name);
 assert.deepEqual(s.creativeReference,{name:'old-banner.png',use:['layout']});assert.deepEqual(s.references,[{id:'ref-1',name:'store-window.jpg'}]);
 assert.doesNotMatch(JSON.stringify(s),/base64|briefReading/);
 const r=M.briefDetails(s,{},{item:{featureId:1},products:[x.product]});assert.ok(r.groups.some(g=>g.title.startsWith('This format')));
});

test('the format size is not repeated when the picture already shows its own size',()=>{
 const x=BRANDS[0],r=M.briefDetails(brief(x),{},{item:{featureId:1,name:'PMax landscape image',dimensions:{width:1200,height:628}},products:[x.product]});
 const f=r.groups.find(g=>g.title.startsWith('This format'));assert.ok(!f.rows.some(([k])=>k==='Size'));assert.ok(!f.missing.includes('Size'));
});
