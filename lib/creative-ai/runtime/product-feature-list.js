'use strict';
// Read literal list items under an explicit Features heading. No inferred claims.
function extract(html,clean){
 const source=String(html||'').replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi,''),out=[];
 const headings=/<(?:h[1-6]|div)\b[^>]*>\s*(?:Product\s+)?Features\s*(?:<span\b[^>]*>[\s\S]*?<\/span>)?\s*<\/(?:h[1-6]|div)>/gi;
 for(const h of source.matchAll(headings)){
  const tail=source.slice(h.index+h[0].length,h.index+h[0].length+12000),list=/<[ou]l\b[^>]*>([\s\S]*?)<\/[ou]l>/i.exec(tail);
  if(!list||list.index>2000||/<(?:h[1-6]|summary)\b/i.test(tail.slice(0,list.index)))continue;
  for(const item of list[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){const text=clean(item[1]);if(text&&text.length<=2000)out.push(text);}
 }
 // "Why <product>?" sections (live test, 17 Nov 2026): the Duroflex Airboost pages have no Features list; their
 // benefits are short headings in one section ("1 Lakh+ Airknit Fibres", "3X Breathability", "5-Zone support"), so
 // the product had no RTBs. Used only when no Features list exists; the headings are taken word for word.
 if(!out.length)for(const h of source.matchAll(/<h[2-3]\b[^>]*>\s*Why\s+[^<?]{1,40}\?\s*<\/h[2-3]>/gi)){
  const rest=source.slice(h.index+h[0].length,h.index+h[0].length+20000),end=rest.search(/<\/section>/i),section=end<0?'':rest.slice(0,end);
  const items=[...section.matchAll(/<h[34]\b[^>]*>([\s\S]*?)<\/h[34]>/gi)].map(m=>clean(m[1])).filter(t=>t&&t.length<=80&&!/\?/.test(t));
  if(items.length>=2&&items.length<=8){out.push(...items);break;}
 }
 return [...new Set(out)];
}
// Saved products whose features were read before VERSION 2 are re-read from their saved page.
const VERSION=2;
module.exports={extract,VERSION};
