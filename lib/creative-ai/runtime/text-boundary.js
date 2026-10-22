'use strict';
// Use only at HTML intake. Saved copy and URLs must never be decoded again.
function decodeHtmlOnce(input){
 const named={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:'\u00a0',times:'×',ndash:'–',mdash:'—',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”'};
 return String(input??'').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(raw,key)=>{
  if(key[0]!=='#')return named[key]??raw;
  const n=/^#x/i.test(key)?parseInt(key.slice(2),16):Number(key.slice(1));
  return Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):raw;
 });
}
// Unicode decimal digits denote the same numeric value across scripts. Keep
// punctuation and multiplicity; this is not locale-specific price conversion.
function numericTokens(text){
 const digits=text.replace(/\p{Decimal_Number}/gu,c=>{
  const cp=c.codePointAt(0);let start=cp;
  while(start>0&&/\p{Decimal_Number}/u.test(String.fromCodePoint(start-1)))start--;
  return String((cp-start)%10);
 }).replace(/\u066b/g,'.').replace(/\u066c/g,',');
 return (digits.match(/\d+(?:[.,]\d+)?/g)||[]).sort();
}
module.exports={decodeHtmlOnce,numericTokens};
