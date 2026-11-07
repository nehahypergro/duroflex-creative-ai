'use strict';
// Explicit experiment selections reuse the main catalogue and guidebooks.
const model=require('../../../../public/creative-ai/studio-model');
const catalog=require('../../placement-knowledge/knowledge/catalog.json');
const playbooks=require('../../treatment-knowledge/format-playbooks');
const definitions=[
 {id:'instagram-story',name:'Instagram Story',profileId:'meta-instagram-story',formatId:'custom:studio-story-vertical',width:1080,height:1920,pages:1,guidelines:'One vertical Instagram Story artwork. Brief mobile reading: one focused benefit, clear product and concise CTA. Plan essential content away from platform interface areas using the applicable Story guidance. No invented interactive controls.'},
 {id:'retail-google',name:'Google Business Profile post',profileId:'related-business-profile-cover',formatId:'custom:studio-store-post',width:1080,height:1080,pages:1,guidelines:'Local business update post, not a cover image. Product discovery, concise message and visit-store action. No invented store details.'},
 {id:'retail-banner',name:'Store / campaign banner',profileId:'ooh-retail-sign',formatId:'custom:studio-store-banner',width:1080,height:1080,pages:1},
 {id:'retail-screen',name:'Retail screen image',profileId:'ooh-digital-screen-still',formatId:'custom:studio-retail-screen',width:1920,height:1080,pages:1},
 {id:'window',name:'Window artwork',profileId:'print-poster',formatId:'custom:studio-print-window-poster'},
 {id:'wobbler',name:'Shelf wobbler',profileId:'print-retail-shelf-talker',formatId:'custom:studio-print-wobbler'},
 {id:'shelf-talker',name:'Shelf talker',profileId:'print-retail-shelf-talker',formatId:'custom:studio-print-shelf-talker'},
 {id:'counter-card',name:'Product / counter card',profileId:'print-retail-shelf-talker',formatId:'custom:studio-print-counter-card'},
 {id:'wall',name:'Wall graphic',profileId:'ooh-retail-sign',formatId:'custom:studio-print-wall-graphic'},
 {id:'poster',name:'Poster · A3',profileId:'print-poster',formatId:'custom:studio-print-poster-a3'},
 {id:'leaflet',name:'Leaflet · A5 · front and back',profileId:'print-leaflet',formatId:'custom:studio-print-leaflet-a5'},
 {id:'dangler',name:'Dangler · rectangular · two sides',profileId:'print-retail-shelf-talker',formatId:'custom:studio-print-dangler'},
 {id:'flyer',name:'Flyer · A4',profileId:'print-flyer',formatId:'custom:studio-print-flyer-a4'},
 {id:'bifold',name:'Brochure · bi-fold',profileId:'print-brochure',formatId:'custom:studio-print-brochure-bifold'},
 {id:'trifold',name:'Brochure · tri-fold',profileId:'print-brochure',formatId:'custom:studio-print-brochure-trifold'},
 {id:'standee',name:'Standee',profileId:'print-roll-up-banner',formatId:'custom:studio-print-standee'},
 {id:'banner',name:'Website banner',profileId:'owned-promotional-banner',formatId:'custom:studio-web-banner',width:1920,height:640,pages:1},
 {id:'infographic',name:'Infographic',profileId:'owned-web-infographic',formatId:'custom:studio-marketing-infographic',width:1080,height:1350,pages:1},
 {id:'carousel',name:'Instagram carousel · 5 slides',profileId:'meta-instagram-carousel',formatId:'custom:studio-carousel-square',width:1080,height:1080,pages:5},
 {id:'push',name:'iOS push image',profileId:'notification-ios-rich-attachment',formatId:'custom:push-image-ios-1200x600',width:1200,height:600,pages:1,text:'none'}
];
function canvas(width,height){
 const ratio=width/height;
 if(Math.max(ratio,1/ratio)>3)throw Error('This format exceeds the image-model aspect limit');
 const scale=Math.sqrt(1536*1024/(width*height));
 const w=Math.round(width*scale/16)*16,h=Math.round(height*scale/16)*16;
 // Keep extreme 3:1 rounding inside the provider boundary.
 return `${Math.min(w,h*3)}x${Math.min(h,w*3)}`;
}
function format(id='flyer'){
 const def=definitions.find(d=>d.id===id);if(!def)throw Error('Unsupported experiment format');
 const preset=model.retailPrintPresets.find(p=>p.id===def.formatId);
 const base={...preset,...def},size=canvas(base.width,base.height);
 const pages=Array.from({length:base.pages},(_,i)=>({id:'page-'+(i+1),name:base.pages===2&&preset?'Face '+(i+1)+(['dangler','leaflet'].includes(base.id)?(i===0?' · front':' · back'):(i===0?' · outside':' · inside')):'Page '+(i+1),size}));
 const profile=catalog.profiles.find(p=>p.id===base.profileId);
 if(!profile)throw Error('Format profile unavailable');
 const library=playbooks.load(),pack=playbooks.select(library,{pin:{profileId:base.profileId},description:{formatId:base.formatId}})[0];
 if(!pack)throw Error('Format playbook unavailable');
 const rules=catalog.rules.filter(r=>profile.ruleIds.includes(r.id));
 return {id,name:base.name,profileId:base.profileId,formatId:base.formatId,pages,text:base.text||'embedded',
  requestedDimensions:{width:base.width,height:base.height},previewSize:size,
  structure:base.guidelines||'One complete flat artwork per page. For a set, maintain a coherent concept while giving each page a distinct purpose.',
  ...(preset?{print:{...preset.print,status:'Preset defaults; printer template and physical proof remain unverified'}}:{}),
  guidance:{catalogVersion:catalog.version,playbookVersion:library.version,
   mandatory:rules.filter(r=>r.tier==='mandatory').map(r=>({id:r.id,text:r.statement})),
   advice:rules.filter(r=>r.tier!=='mandatory'&&r.id!=='exact-copy').map(r=>({id:r.id,tier:r.tier,text:r.statement})),
   treatment:pack.rules.filter(r=>/-(purpose|copy|visual|action|sequence|avoid)$/.test(r.id)).map(r=>r.statement),
   productionUnknowns:profile.unknowns,
   interpretation:'Use advice to decide copy density, hierarchy, safe areas and viewing distance once. Preserve actual mandatory rules. Write new copy unless the brief locks wording. Do not pass this guidebook or alternative templates to generation.'}};
}
module.exports={format,formats:()=>definitions.map(d=>{const f=format(d.id);return {id:f.id,name:f.name,pages:f.pages.length,size:f.previewSize};})};
