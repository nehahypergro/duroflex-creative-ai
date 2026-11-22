'use strict';
// People to scale v1 (22 Nov 2026, Neha: "sometimes the person is as big as the mattress … from the SKU we already
// know the width, height, length … I am not happy with random codes added [to the image brief]" → "Yes, planner
// writes it"). New lean jobs pin scaleCheckVersion 1:
//  - the PLANNER gets this product's stated size (word for word from its official page, read from the saved product
//    facts, never from pixels) and writes how people sit against it in its own spatial plan / art direction, which is
//    what reaches the image model (no fixed line is added to the image brief);
//  - the CHECKER gets a "People to scale" question in the same check call, with the same size. It is a layout finding,
//    so a clearly wrong scale gets the page's one redraw (layoutRedrawVersion 1).
// No paid call is added. Products with no stated size get general adult-size wording only.
const VERSION=1;
const ADULT='Typical adults are about 155–180 cm tall; seated, their knees are about 45–50 cm off the floor; one adult takes about 55–65 cm of seat width and about 50–60 cm of a mattress\'s width when lying down.';
const UNIT=/\d\s*(cm|mm|m|"|″|inch|inches|in)\b|\d\s*["″]/i;
const SIZE_WORD=/\b(dimensions?|size|length|width|depth|height|thickness)\b/i;
const DOUBT=/\b(conflict|conflicting|unresolved|unclear|uncertain)/i;
const clean=s=>String(s).replace(/\s+/g,' ').trim().replace(/[.;,]$/,'');
// Inch-only wording ("59\" x 22\" x 6\"") gets centimetres beside each number; wording with metric units stays as is.
function withCm(text){
 if(/(?<![a-z])(cm|mm)\b/i.test(text))return text;
 return text.replace(/(\d+(?:\.\d+)?)\s*(?:"|″|inch(?:es)?\b)/gi,(m,n)=>m+' ('+Math.round(Number(n)*2.54)+' cm)');
}
// The selected variant's own size options ("Dimension: 72 x 60 (183 cm x 152 cm); Height: 8 (20.3 cm)") come
// first; otherwise one product fact that states the dimensions and is not marked as conflicting.
function statedSize(facts=[]){
 const variant=facts.find(f=>f.id==='sku-selected-variant');
 const opts=variant&&/Exact saved options:\s*(.*)$/i.exec(variant.text);
 if(opts){const parts=opts[1].split(';').map(clean).filter(p=>UNIT.test(p)&&(SIZE_WORD.test(p.split(':')[0])||/\d\s*[x×]\s*\d/.test(p)));
  if(parts.length)return {text:withCm(parts.join('; ')).slice(0,240),factId:variant.id};}
 const fact=facts.find(f=>/^sku-/.test(f.id)&&f.id!=='sku-selected-variant'&&/\bdimensions?\b/i.test(f.text)&&UNIT.test(f.text)&&!DOUBT.test(f.text));
 return fact?{text:withCm(clean(fact.text)).slice(0,240),factId:fact.id}:null;
}
// The planner input (input.productScale). The planner writes the result into its own page plan.
function section(facts){
 const size=statedSize(facts);
 return {version:VERSION,statedSize:size?.text||null,sourceFactId:size?.factId||null,
  rule:(size?'Stated size of this exact product, from its official page: '+size.text+'. ':'The official page states no size for this product. ')+
   'If a person or pet appears on a page, plan their size, pose and camera distance so they are true to '+(size?'this size':'the product')+' and to the room. '+ADULT+
   ' Say in that page\'s spatial plan or art direction how the person sits against the product (for example where their head and feet fall along the mattress, or how much of the sofa one seated person fills), so the picture is drawn to scale. This is for picture scale only: do not print the size unless the copy cites the size fact.'};
}
// The checker's question (id people-scale, a layout finding).
function requirement(scale){
 return 'People and pets are drawn at a believable size against the product and the room. '+(scale?.statedSize?'This product\'s official page states its size as '+scale.statedSize+'. ':'')+ADULT+
  ' Flag clear_mismatch only when the scale is clearly wrong: a person as big as the mattress or sofa, a lying adult clearly longer or much shorter than the mattress allows, a head or body far too big or too small for the bed, sofa or pillow, a sofa seat at waist or chest height, one seated person filling a whole three-seater, or a person out of scale with doors, windows or other furniture. Perspective and foreshortening are not mismatches; if unsure, unable_to_verify. No person or pet in the image: no_mismatch.';
}
module.exports={VERSION,ADULT,statedSize,section,requirement,withCm};
