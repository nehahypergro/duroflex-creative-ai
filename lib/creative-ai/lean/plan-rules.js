'use strict';
// Plan rules v1 (user decision, 10 Nov 2026, fixes 9, 11, 14 and 15 from the error list). New lean jobs pin
// planRulesVersion 1. One shared rule reaches the plan, the image brief and the review:
//  - 9: the whole product, logo, words and button stay inside the canvas with a margin (a deliberate
//       close-up detail page may crop the product);
//  - 14: no added words or numbers such as slide counters ("01 / 05"), page numbers or arrows;
//  - 15: on a portrait carousel slide, the key content sits inside the centred square a grid preview shows.
// And one planning check:
//  - 11: within a set (carousel, product-page pack, A+ page, print panels, landing modules) no two pages
//       share a headline. An A+ mobile image reuses its own desktop words, so pages of one A+ unit count as one;
//       display-banner sizes and PMax ratios deliberately repeat one message and are not checked.
// Earlier jobs keep their saved packets.
const VERSION=1;
const ID='composition-layout';
function isCarouselPortrait(s){const d=s.description||{},w=d.dimensions?.width,h=d.dimensions?.height;return !!(d.carousel||/carousel/i.test(d.name||''))&&w&&h&&h>w;}
function distinctSet(input,selection){
 if(selection.length<2||input.displayBanners)return false;
 if(selection.every(s=>/pmax-/.test(s.id)))return false;
 return true;
}
function section(input,selection){
 const carousel=selection.some(isCarouselPortrait),distinct=distinctSet(input,selection);
 const lines=['COMPOSITION v1. Keep the whole product, the complete logo, every word and any button inside the canvas with a clear margin from every edge; nothing important touches or runs off an edge. Only a page planned as a deliberate close-up detail view may crop the product.',
  'Keep the exact product\'s distinctive visible construction from its official photos (for example folding panels and straps, zips, piping, quilting, buttons or legs): name it in the art direction so the picture keeps it.',
  'Add no words, numbers or marks that are not in the planned copy: no slide or page counters (such as "01 / 05"), page numbers, pagination dots or arrows.'];
 if(carousel)lines.push('Carousel slide: keep the headline, the logo and any swipe prompt inside the centred square of the slide, which is what a grid preview shows.');
 if(distinct)lines.push('Each page of this set has its own headline and message; do not repeat a headline on another page (a mobile version of the same module reuses its own desktop words).');
 return {planRules:{version:VERSION,distinctHeadlines:distinct,carouselSquare:carousel},rule:{id:ID,tier:'contract',text:lines.join(' '),sourceIds:['user:error-fixes-20261110']}};
}
const headlineRole=role=>/head|title/i.test(role||'')&&!/product|name|cta|call/i.test(role||'');
const norm=t=>String(t||'').toLowerCase().replace(/[^a-z0-9ऀ-෿]+/g,' ').trim();
// Throws when two pages of a set share a headline (pages of one A+ unit count as one page).
function validate(plan,input){
 if(!input?.planRules?.distinctHeadlines)return;
 const unit=id=>input.aplus?.pages?.find(p=>p.id===id)?.unit||id,seen=new Map();
 for(const page of plan.pages)for(const c of page.copy||[]){
  if(!headlineRole(c.role))continue;const key=norm(c.text);if(!key)continue;
  const owner=seen.get(key);
  if(owner&&owner!==unit(page.id))throw Error('Repeated headline across pages: "'+c.text+'" is used on two pages of this set; give each page its own headline');
  if(!owner)seen.set(key,unit(page.id));
 }
}
module.exports={VERSION,ID,section,validate};
