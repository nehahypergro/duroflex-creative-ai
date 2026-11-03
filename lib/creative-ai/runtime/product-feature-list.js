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
 return [...new Set(out)];
}
module.exports={extract};
