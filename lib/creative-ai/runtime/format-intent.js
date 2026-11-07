'use strict';
// A new-job planning contract. It describes use, not a visual template or a
// subjective diversity gate. Historical jobs do not acquire new instructions.
const principle='FORMAT PURPOSE v1: A campaign shares its proposition and brand identity, not a shared room, headline or layout by default. Independent assets need an approach suited to their use, audience attention and action. Related pages/ratio variants within a coordinated set share an intentional visual system, with distinct page purposes. Preserve explicit client continuity requests, locked wording, exact SKU, mandatory brand rules and claim qualifiers. Do not change colours or words merely to manufacture difference. Explain purposeful choices in existing rationale/format implications; earlier generated artwork is not a brand requirement.';
function purpose(name){
 if(/push/i.test(name))return 'One immediately recognisable visual at notification size; detailed message and action belong outside the image.';
 if(/brochure|leaflet|flyer|one.pager|sales.*page|cheat.?sheet/i.test(name))return 'Close reading and consideration: organise supported benefits and product details into a deliberate information hierarchy; use the available faces/panels, not a resized hero advertisement.';
 if(/wobbler|shelf|counter|product.*panel|price.*card/i.test(name))return 'At-product decision support: identify the product and communicate a useful supported reason to consider it; short, scannable information, not a website CTA template.';
 if(/standee|roll.up|screen/i.test(name))return 'Attract attention in a store, then invite product exploration or trial; choose a distance-readable hierarchy and a relevant action. Do not fabricate store details.';
 if(/window|poster|signage|store.*banner|campaign.*banner/i.test(name))return 'Be noticed quickly from a distance: one dominant message and recognisable product/brand; output flat artwork, not a photograph of an installed sign.';
 if(/gallery|product images|a\+|marketplace|commerce/i.test(name))return 'Support product evaluation: give each view/module an evidence-backed job, ranging from overall identity to supported detail; obey native versus embedded text policy.';
 if(/carousel|story|stories/i.test(name))return 'Capture attention and develop the message in the requested sequence or viewing context; a set is not repeated copies of its opening slide.';
 if(/email|whatsapp|rcs/i.test(name))return 'Deliver one relevant customer message with a clear next action; use native accompanying copy where supported instead of packing detail into the picture.';
 return 'Choose the communication role, reading context, message hierarchy and action for this specific format before selecting its scene and composition.';
}
function describe(selections){return selections.map(s=>{
 const d=s.description||{},explicit=s.jobInputs?.formatIntent,set=d.carousel||d.pdp||d.printSet||d.assetSet;
 const familyId=explicit?.familyId||set?.id||s.id;
 return {placementId:s.id,name:d.name||s.id,familyId,relationship:explicit?.relationship||(set?'coordinated-set':'independent'),page:explicit?.page||set?.index||1,pages:explicit?.pages||set?.count||1,purpose:purpose(d.name||s.id),...(explicit?{requestedDirection:explicit.direction,textPolicy:explicit.textPolicy,exactCopy:explicit.exactCopy}:{}),...(s.jobInputs?.assetPagePlan?{pagePlan:s.jobInputs.assetPagePlan}:{})};
});}
function guidance(selections){return principle+'\nPlacement purposes: '+JSON.stringify(describe(selections).map(({requestedDirection,exactCopy,pagePlan,...summary})=>summary));}
function chunks(label,value){const text=typeof value==='string'?value:JSON.stringify(value);if(!text)return [];const parts=[];for(let n=0;n<text.length;n+=1600)parts.push(label+' (part '+(parts.length+1)+'): '+text.slice(n,n+1600));return parts;}
function apply(input,intake,selections){
 if(intake.formatIntentVersion!==1)return input;
 const rows=describe(selections);
 return {...input,assignment:{...input.assignment,formats:input.assignment.formats.map(f=>{
  const row=rows.find(p=>p.placementId===f.id);if(!row)throw Error('Missing format intent for '+f.id);
  const {requestedDirection,exactCopy,pagePlan,...summary}=row;
  const constraints=[...f.constraints,principle,...chunks('Placement purpose',summary),...chunks('Current asset brief',requestedDirection),...chunks('Current exact copy',exactCopy),...chunks('Ordered page plan',pagePlan)];
  if(constraints.length>100||constraints.some(c=>c.length>2000))throw Error('Placement requirements exceed the strategy contract: '+f.id);
  return {...f,constraints};
 })}};
}
module.exports={principle,purpose,describe,guidance,apply};
