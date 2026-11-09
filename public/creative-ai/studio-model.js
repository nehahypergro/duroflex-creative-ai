/* Shared, provider-free UI contracts. Also loaded directly by the offline tests. */
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.StudioModel = value;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  // Presentation-only artwork, separate from generation contracts.
  const catalogueVisuals=(function(){
// Channel marks are presentation-only; no external requests or generation changes.
function channelBadge(type){
 const stroke=body=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
 const badges={
 instagram:['Instagram','#d43383',stroke('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>')],
 linkedin:['LinkedIn','#0a66c2','<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="3" fill="currentColor"/><g fill="white"><circle cx="5.7" cy="6" r="1.7"/><path d="M4 9h3.5v11H4zM10 9h3.3v1.5C15.5 7.7 20 8.2 20 13v7h-3.4v-6.5c0-2.7-3.3-2.6-3.3 0V20H10z"/></g></svg>'],
 whatsapp:['WhatsApp','#159b70',stroke('<path d="M4 17a9 9 0 1 1 4 4l-5 1Z"/><path d="m8 7 2 3-1 1c1 2 2 3 4 4l1-1 3 1c-1 4-5 2-8-1S5 9 8 7Z"/>')],
 amazon:['Amazon','#28333e','<svg viewBox="0 0 24 24"><text x="6" y="17" font-family="Georgia,serif" font-weight="bold" font-size="23" fill="currentColor">a</text><path d="M3 19q8 5 17-1m-4 0 4-.4-.5 3" fill="none" stroke="#ed9b30" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
 ads:['Google Ads','#4285f4','<svg viewBox="0 0 24 24"><path d="M10.5 5.2 3.8 17" stroke="#fbbc04" stroke-width="7" stroke-linecap="round"/><path d="m11.6 5.2 8 13" stroke="#4285f4" stroke-width="7" stroke-linecap="round"/><circle cx="3.8" cy="17" r="3.5" fill="#34a853"/></svg>'],
 business:['Google Business Profile','#4285f4','<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="14" rx="2" fill="#4285f4"/><path d="M3 2h18l3 7c0 4-6 4-6 0 0 4-6 4-6 0 0 4-6 4-6 0 0 4-6 4-6 0Z" fill="#8ab4f8"/><path d="M6 2h5l1 7c0 4-6 4-6 0ZM16 2h5l3 7c0 4-6 4-6 0Z" fill="#1967d2"/><text x="13" y="20" fill="white" font-family="Arial" font-size="10" font-weight="bold">G</text></svg>'],
 web:['Website','#6888b5',stroke('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M6 6.5h.1M10 6.5h.1"/>')],
 email:['Email','#509e92',stroke('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/>')],
 chat:['RCS','#509e92',stroke('<path d="M21 15a3 3 0 0 1-3 3H9l-6 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z"/><path d="M7 8h10M7 12h7"/>')],
 bell:['Push notification','#509e92',stroke('<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4"/>')]
 };
 const key=['post','story','carousel'].includes(type)?'instagram':['linkedin','document','storypages'].includes(type)?'linkedin':['feature','lifestyle','brandstory','premium'].includes(type)?'amazon':type==='pmax'?'ads':type==='local'?'business':type==='whatsapp'?'whatsapp':type==='email'?'email':type==='rcs'?'chat':['push','icon'].includes(type)?'bell':['banner','tile','blog'].includes(type)?'web':null;
 if(!key)return '';const [name,colour,svg]=badges[key];return `<span class="catalogue-channel-badge" style="color:${colour}" aria-hidden="true" title="${name}">${svg}</span>`;
}
const catalogueGroups=[
{id:'social',name:'Social & campaigns',colour:'#c580b1',tint:'#fff0f8',items:[['Instagram post','1080 × 1080','post'],['Instagram Story','1080 × 1920','story'],['Instagram carousel','Multiple slides','carousel'],['PMax image set','Landscape, square & portrait','pmax']]},
{id:'web',name:'Website & marketplaces',colour:'#82a8dc',tint:'#eaf3ff',items:[['Website banner','1920 × 640','banner'],['Product image gallery','PDP · individual images or set','gallery'],['Marketplace A+','Premium page · one story','aplus'],['A+ feature image','300 × 300','feature'],['A+ lifestyle header','970 × 600','lifestyle'],['Amazon Brand Story','Background & story cards','brandstory'],['Basic A+ page','Header, overlay & images','premium'],['Homepage category tile','Choose dimensions','tile']]},
{id:'retail',name:'Retail & local',colour:'#9694d9',tint:'#eeedff',items:[['Google Business post','Update, offer or event','local'],['Store / campaign banner','Choose size & orientation','storebanner'],['Retail screen','Landscape or portrait','screen'],['Window artwork','Glass panels & safe areas','window'],['Standee','Physical size & base clearance','standee'],['Wobbler / shelf / dangler','Choose a placement','wobbler'],['Product / counter card','Physical size & orientation','counter'],['Wall graphic','Seams & obstructions','wall'],['Price / offer board','Prices, terms & expiry','price'],['Poster / flyer','Physical size & orientation','poster'],['Brochure / leaflet','Panels & folds','brochure'],['Dealer / partner toolkit','Planning brief','kit'],['Store / city / language versions','Planning brief','variants'],['GT / COCO catalogue','Planning brief','catalogue']]},
{id:'messaging',name:'Customer messaging',colour:'#7cbaad',tint:'#e6fbf5',items:[['WhatsApp visual','Share card or Status','whatsapp'],['Email header / hero','Image only','email'],['RCS card images','Single card or carousel','rcs'],['Push notification image','Android, iPhone or web','push'],['Push notification icons','Use saved brand artwork','icon']]},
{id:'corporate',name:'Corporate & PR',colour:'#ae91d5',tint:'#f3eaff',items:[['LinkedIn post','Square, portrait or landscape','linkedin'],['LinkedIn feature carousel','PDF + images','document'],['LinkedIn story carousel','PDF + images','storypages'],['Blog / link preview','Choose dimensions','blog']]}
,{"id": "partners", "name": "Partners & alliances", "colour": "#c580b1", "tint": "#fff0f8", "items": [["Co-branded visual", "Two brands \u00b7 one composition", "cobrand"], ["Alliance announcement", "Introduce the partnership", "alliance"], ["Partner social set", "Coordinated image series", "partnerset"], ["Partner toolkit", "Grouped partner assets", "kit"]], "additional": true},{"id": "employee", "name": "Employee & corporate", "colour": "#a98bd4", "tint": "#f0eaff", "items": [["Leadership visual", "Portrait, name & title", "portrait"], ["Hiring visual", "Role & team announcement", "hiring"], ["Employer branding", "People & workplace culture", "team"], ["Award / milestone", "Recognition & achievements", "award"], ["Employee share card", "Campaign image for sharing", "share"], ["Employee Status", "Vertical employee image", "employeestatus"], ["Packaging / branding still", "Preserve packaging details", "package"], ["Internal portal visual", "Employee news & updates", "portal"]], "additional": true},{"id": "editorial", "name": "Editorial & community", "colour": "#82a8dc", "tint": "#eaf3ff", "items": [["Article illustration", "Visual story for an article", "illustration"], ["Blog hero", "Lead image for a story", "blog"], ["Simple infographic", "Facts, steps or a process", "infographic"], ["Community post", "Square or portrait image", "community"]], "additional": true},{"id": "press", "name": "Press imagery", "colour": "#d58da6", "tint": "#fff0f5", "items": [["Product press image", "Product photography for media", "pressproduct"], ["Leadership press image", "Portrait for media use", "pressportrait"], ["Product seeding pack", "Ordered press image set", "presskit"], ["Demo / review visual", "Explain the product in use", "demo"]], "additional": true},{"id": "training", "name": "Training & sales", "colour": "#7bb6a8", "tint": "#e8fbf6", "items": [["Training deck", "Product learning \u00b7 slide set", "deck"], ["Product cheat sheet", "Key facts on one page", "cheatsheet"], ["Sales one-pager", "A concise product overview", "salespage"], ["Mobile reference card", "Quick answers on a phone", "mobilecard"], ["Comparison battlecard", "Supplied comparison facts", "battlecard"], ["FAQ / process visual", "Questions, steps & answers", "process"]], "additional": true}
];
const R=(x,y,w,h,fill='white',rx=2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`,L=(x,y,w)=>`<path d="M${x} ${y}h${w}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".65"/>`,frame=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="white" stroke="currentColor" stroke-width="1.15"/>`,pic=(x,y,w,h)=>R(x,y,w,h,'currentColor')+`<path d="M${x+2} ${y+h-2}l${w*.28} ${-h*.45} ${w*.2} ${h*.21} ${w*.21} ${-h*.32} ${w*.22} ${h*.56}" fill="none" stroke="white" stroke-width="1.1" opacity=".75"/><circle cx="${x+w*.75}" cy="${y+h*.25}" r="1.4" fill="white" opacity=".8"/>`;
function drawing(type){switch(type){
case'post':return frame(13,8,38,39)+pic(17,12,30,23)+L(17,40,22)+L(17,43,13);
case'story':return frame(22,3,23,49)+pic(25,10,17,31)+L(26,7,12)+R(28,45,10,2,'currentColor');
case'carousel':return `<g transform="rotate(12 40 30)">${frame(28,11,27,35)}</g><g transform="rotate(-7 28 28)">${frame(18,8,28,37)}</g>`+frame(8,13,29,37)+pic(12,17,21,23)+L(12,44,15);
case'pmax':return frame(4,22,33,22)+pic(7,25,27,16)+frame(37,5,20,36)+pic(40,8,14,30)+frame(23,13,23,23)+pic(26,16,17,17);
case'banner':return frame(3,13,58,29)+L(7,17,4)+L(14,17,3)+pic(7,21,26,17)+L(38,25,17)+L(38,30,11)+R(38,34,10,3,'currentColor');
case'gallery':return frame(5,8,36,38)+pic(9,12,28,24)+L(9,41,19)+[9,22,35].map(y=>pic(45,y,13,10)).join('');
case'aplus':return frame(12,3,40,50)+pic(16,7,32,14)+[16,27,38].map(x=>pic(x,25,10,10)).join('')+L(16,40,30)+L(16,45,21);
case'feature':return [0,1,2].map(i=>frame(4+i*20,17,17,27)+pic(7+i*20,20,11,13)+L(7+i*20,37,10)).join('')+`<rect x="23" y="16" width="19" height="29" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>`;
case'lifestyle':return frame(5,10,54,37)+pic(9,14,46,23)+L(9,41,25);
case'brandstory':return R(3,8,58,39,'currentColor',3)+R(7,12,15,31,'white')+`<circle cx="14.5" cy="22" r="4" fill="currentColor"/>`+L(10,32,9)+frame(27,15,14,29)+pic(29,18,10,16)+frame(44,15,14,29)+pic(46,18,10,16);
case'premium':return frame(3,8,58,39)+pic(7,12,50,31)+`<g fill="white" stroke="currentColor"><circle cx="21" cy="25" r="4"/><circle cx="44" cy="33" r="4"/></g>`+L(19,25,4)+L(42,33,4);
case'tile':return frame(9,8,45,39)+pic(13,12,37,23)+L(20,41,23);
case'local':return frame(12,12,39,38)+pic(16,24,31,16)+L(16,44,21)+`<path d="M11 12h41l-4-7H15Z" fill="currentColor"/><path d="M12 13v5q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0v-5" fill="white" stroke="currentColor"/>`;
case'storebanner':return `<path d="M6 9v41M58 9v41" stroke="currentColor"/>`+frame(6,15,52,24)+pic(10,19,22,16)+L(37,23,16)+L(37,29,12);
case'screen':return frame(3,8,58,35)+pic(7,12,50,27)+`<path d="M32 43v7M21 51h22" stroke="currentColor" stroke-width="2"/>`;
case'window':return frame(9,5,46,47)+pic(12,8,40,40)+`<path d="M32 6v45M10 28h44" stroke="white" stroke-width="3"/><path d="M15 13l9-3M41 36l9-3" stroke="white" opacity=".6"/>`;
case'standee':return frame(19,4,27,45)+pic(22,8,21,25)+L(22,37,17)+L(22,41,12)+R(15,48,35,5,'currentColor');
case'wobbler':return R(3,41,58,6,'currentColor')+`<path d="M36 41q-9-9 0-18" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="33" cy="18" r="15" fill="white" stroke="currentColor" stroke-width="1.3"/>`+L(25,15,16)+L(27,20,12)+R(29,25,8,3,'currentColor');
case'counter':return `<path d="M13 45l8-34h24l9 34Z" fill="white" stroke="currentColor"/>`+pic(24,15,17,17)+L(22,37,20)+`<path d="M45 11l-6 34" stroke="currentColor" opacity=".5"/>`;
case'wall':return frame(4,8,57,39)+pic(7,11,51,33)+`<path d="M22 9v37M42 9v37" stroke="white" stroke-dasharray="2 2"/><path d="M45 47V28h10v19" fill="white" stroke="currentColor"/>`;
case'price':return frame(10,5,44,47)+L(16,14,30)+`<text x="17" y="34" font-size="18" fill="currentColor" font-family="sans-serif">₹</text>`+L(31,29,16)+L(16,42,26);
case'poster':return frame(15,5,34,47)+L(20,13,23)+pic(20,18,24,23)+L(20,46,17);
case'brochure':return `<path d="M5 10l18-4 18 5 18-4v39l-18 4-18-5-18 4Z" fill="white" stroke="currentColor"/><path d="M23 6v39M41 11v39" stroke="currentColor" stroke-dasharray="2 2"/>`+pic(9,15,10,17)+L(9,37,10)+pic(27,16,10,22)+pic(45,14,10,16)+L(45,36,9);
case'kit':return frame(6,16,48,33)+frame(14,8,30,35)+pic(18,12,22,22)+R(6,32,48,17,'currentColor')+R(23,36,15,3,'white');
case'variants':return [0,1,2].map(i=>frame(5+i*19,9+i*3,17,32)+pic(8+i*19,13+i*3,11,16)+L(8+i*19,34+i*3,10)).join('');
case'catalogue':return `<path d="M4 10q14-6 28 0q14-6 28 0v38q-14-6-28 0q-14-6-28 0Z" fill="white" stroke="currentColor"/><path d="M32 10v38" stroke="currentColor"/>`+[9,36].map(x=>pic(x,15,19,18)+L(x,38,17)).join('');
case'whatsapp':return frame(10,5,43,42)+pic(14,10,35,24)+L(14,39,23)+`<path d="M15 46l-4 7 13-7" fill="white" stroke="currentColor"/>`;
case'email':return `<path d="M5 21l27-16 27 16v29H5Z" fill="white" stroke="currentColor"/>`+frame(14,7,36,34)+pic(18,12,28,15)+L(18,32,21)+`<path d="M5 21l27 20 27-20M5 50l20-15M59 50L39 35" fill="none" stroke="currentColor"/>`;
case'rcs':return frame(9,6,29,43)+pic(12,10,23,21)+L(13,36,20)+R(13,42,19,3,'currentColor')+frame(41,6,17,43)+pic(44,10,11,21)+L(44,36,10);
case'push':return frame(19,2,27,52)+L(25,7,14)+frame(5,15,54,27)+R(9,19,5,5,'currentColor')+L(17,21,35)+pic(9,27,46,11);
case'icon':return frame(21,3,25,49)+R(5,16,27,27,'currentColor',7)+`<path d="M13 30q-1-10 6-10t6 10l2 3H11Z" fill="white"/><circle cx="19" cy="36" r="2" fill="white"/>`;
case'linkedin':return frame(6,9,52,38)+R(10,13,8,8,'currentColor')+`<text x="11" y="19" font-size="6" font-weight="bold" fill="white">in</text>`+L(22,15,29)+L(22,20,17)+pic(10,25,44,17);
case'document':return frame(27,7,26,39)+frame(11,12,28,40)+pic(15,17,20,20)+L(15,42,16)+L(15,47,11);
case'storypages':return [0,1,2].map(i=>frame(4+i*20,11,17,35)+pic(7+i*20,15,11,17)+`<text x="${10+i*20}" y="41" font-size="6" fill="currentColor">${i+1}</text>`).join('');
case'blog':return frame(6,7,52,42)+L(11,13,20)+pic(10,18,44,18)+L(11,41,36)+L(11,45,25);

case'cobrand':return frame(5,9,54,39)+R(10,14,19,10,'currentColor')+R(35,14,19,10,'currentColor')+`<path d="M30 19h4M32 17v4" stroke="currentColor"/>`+pic(10,29,44,14);
case'alliance':return frame(7,7,50,43)+`<circle cx="24" cy="25" r="10" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="39" cy="25" r="10" fill="none" stroke="currentColor" stroke-width="4"/>`+L(16,42,33);
case'partnerset':return frame(25,5,31,38)+frame(15,9,31,38)+frame(5,13,31,38)+R(9,17,9,6,'currentColor')+R(22,17,9,6,'currentColor')+pic(9,28,23,17);
case'portrait':case'pressportrait':return frame(13,5,38,47)+`<circle cx="32" cy="19" r="8" fill="currentColor"/><path d="M19 37c0-15 26-15 26 0Z" fill="currentColor"/>`+L(19,43,26)+L(23,47,18)+(type==='pressportrait'?R(43,33,15,12,'currentColor')+`<circle cx="50" cy="39" r="3" fill="white"/>`:'');
case'hiring':return frame(8,7,49,42)+R(17,19,27,18,'currentColor')+`<path d="M24 19v-5h13v5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M26 28h9m-4-4v8" stroke="white" stroke-width="2"/>`+L(17,42,27);
case'team':return frame(5,9,54,39)+[18,32,46].map((x,i)=>`<circle cx="${x}" cy="${i===1?20:23}" r="5" fill="currentColor"/><path d="M${x-8} 39v-3c0-12 16-12 16 0v3Z" fill="currentColor" opacity="${i===1?1:.6}"/>`).join('');
case'award':return frame(9,6,46,45)+`<path d="M22 14h20v9c0 13-20 13-20 0ZM22 17h-6v5q0 8 9 8M42 17h6v5q0 8-9 8" fill="currentColor" stroke="currentColor"/><path d="M32 33v9m-8 2h16" stroke="currentColor" stroke-width="3"/>`;
case'share':return frame(8,8,38,40)+pic(12,12,30,24)+L(12,42,18)+`<circle cx="48" cy="35" r="12" fill="currentColor"/><path d="M41 38q0-8 10-8v-4l6 7-6 5v-4q-6 0-10 4Z" fill="white"/>`;
case'employeestatus':return frame(20,3,25,50)+`<circle cx="32" cy="19" r="6" fill="currentColor"/><path d="M24 35c0-12 16-12 16 0Z" fill="currentColor"/>`+L(25,41,15)+L(28,46,9);
case'package':return `<path d="M10 18l22-10 22 10v26l-22 9-22-9Z" fill="white" stroke="currentColor" stroke-width="1.5"/><path d="M10 18l22 10 22-10M32 28v25M22 13l22 10" fill="none" stroke="currentColor"/>`+`<path d="M16 29l10 4v8l-10-4Z" fill="currentColor"/>`;
case'portal':return frame(4,7,56,43)+L(9,12,6)+R(8,18,11,27,'currentColor')+pic(23,18,32,16)+L(23,39,30)+L(23,44,20);
case'illustration':return frame(6,7,52,42)+`<circle cx="23" cy="23" r="10" fill="currentColor" opacity=".3"/><path d="M12 42l17-26 20 26Z" fill="currentColor"/><path d="M44 12l4 9 9 4-9 3-4 9-3-9-9-3 9-4Z" fill="white" stroke="currentColor"/>`;
case'infographic':return frame(8,4,48,48)+L(14,12,34)+[13,27,41].map((x,i)=>R(x,36-i*7,9,10+i*7,'currentColor')).join('')+L(14,48,34);
case'community':return frame(6,8,43,34)+pic(10,12,35,22)+`<path d="M15 42v7l9-7" fill="white" stroke="currentColor"/><circle cx="49" cy="39" r="11" fill="currentColor"/><path d="M43 38h12m-9 5h6" stroke="white" stroke-width="2"/>`;
case'pressproduct':return frame(5,8,54,41)+pic(9,12,46,30)+R(37,34,23,17,'currentColor')+`<circle cx="48" cy="42" r="5" fill="white"/><circle cx="48" cy="42" r="3" fill="currentColor"/>`;
case'presskit':return frame(14,5,35,36)+pic(18,9,27,23)+`<path d="M5 26h18l5 5h31v21H5Z" fill="currentColor"/>`+R(24,39,15,3,'white');
case'demo':return frame(4,9,56,38)+pic(8,13,25,27)+`<path d="M41 21l10 7-10 7Z" fill="currentColor"/>`+L(38,40,17);
case'deck':return frame(11,5,47,34)+frame(5,11,47,34)+pic(9,15,23,21)+L(36,19,11)+L(36,24,8)+`<path d="M29 45v7m-10 0h20" stroke="currentColor" stroke-width="2"/>`;
case'cheatsheet':return frame(13,4,38,48)+L(19,12,26)+[20,30,40].map(y=>R(19,y,5,5,'currentColor')+L(28,y+2,17)).join('');
case'salespage':return frame(13,4,38,48)+L(19,12,26)+pic(19,17,26,17)+L(19,40,26)+L(19,45,16);
case'mobilecard':return frame(20,3,25,50)+L(25,8,15)+[16,27,38].map(y=>R(24,y,17,8,'currentColor')).join('')+R(29,49,7,1,'currentColor');
case'battlecard':return frame(5,7,54,43)+R(9,11,46,9,'currentColor')+`<path d="M30 20v26M9 28h46M9 37h46" stroke="currentColor" opacity=".5"/>`+L(12,24,12)+L(35,24,15)+L(12,33,12)+L(35,33,10)+L(12,42,12)+L(35,42,15);
case'process':return frame(7,5,50,46)+[15,29,43].map((y,i)=>`<circle cx="17" cy="${y}" r="5" fill="currentColor"/><text x="15" y="${y+2}" fill="white" font-size="6">${i+1}</text>`+L(28,y,22)).join('')+`<path d="M17 20v4m0 10v4" stroke="currentColor"/>`;

default:return frame(14,9,36,38)} }

  function group(id){return catalogueGroups.find(g=>g.id===(id==='website'?'web':id));}
  function render(id,index){const g=group(id),item=g?.items[index];if(!item)return '';return `<span class="catalogue-thumb" style="--catalogue-tint:${g.tint};color:${g.colour}"><svg aria-hidden="true" viewBox="0 0 64 56">${drawing(item[2])}</svg>${channelBadge(item[2])}</span>`;}
  return {render,additional:catalogueGroups.filter(g=>g.additional).map(g=>({id:g.id,name:g.name,items:g.items}))};
  })();
  const formatPreviews = (function(){
  'use strict';
  const specs={
    1:['social','square','instagram','1080 × 1080','post'],
    2:['website','square','layers','1080 × 1080','technology'],
    3:['social','square','tag','1080 × 1080','offer'],
    4:['social','square','check','1080 × 1080','proof'],
    5:['website','square','bag','1080 × 1080','product'],
    6:['website','wide','bag','Module sizes vary','marketplace'],
    7:['website','banner','window','1920 × 640','banner'],
    8:['social','story','instagram','1080 × 1920','story'],
    9:['social','stack','layers','Multiple slides','carousel'],
    10:['retail','square','store','1080 × 1080','store'],
    11:['retail','poster','store','Set your print size','poster'],
    12:['retail','square','people','1080 × 1080','partner'],
    13:['corporate','wide','linkedin','1200 × 627','linkedin'],
    14:['messaging','message','whatsapp','Square or story','message'],
    15:['corporate','wide','window','Choose your dimensions','article']
  };
  const paths={layers:'m3 8 9-5 9 5-9 5ZM3 12l9 5 9-5M3 16l9 5 9-5',tag:'M3 3h9l9 9-9 9-9-9ZM7 7h.1',check:'m5 12 4 4L19 6',bag:'M4 7h16l1 14H3ZM8 7V5a4 4 0 0 1 8 0v2',window:'M3 4h18v16H3ZM3 8h18M6 6h.1M9 6h.1',store:'M4 10v11h16V10M3 4h18l1 6H2ZM9 21v-7h6v7',people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-3a7 7 0 0 1 14 0v3M17 4a4 4 0 0 1 0 8M19 15a5 5 0 0 1 3 5'};
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function glyph(name){
    if(name==='instagram')return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
    if(name==='linkedin')return '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="5" r="2"/><path d="M3 9h4v12H3zM10 9h4v1.5C16 7.8 21 8.2 21 13v8h-4v-7c0-2.5-3-2.5-3 0v7h-4z"/></svg>';
    if(name==='whatsapp')return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17a9 9 0 1 1 4 4l-5 1Z"/><path d="m8 7 2 3-1 1c1 2 2 3 4 4l1-1 3 1c-1 4-5 2-8-1S5 9 8 7Z"/></svg>';
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.window}"/></svg>`;
  }
  function spec(id){const s=specs[id];return s?{tone:s[0],shape:s[1],badge:s[2],dimensions:s[3],design:s[4]}:null;}
  function render(id,{imageUrl='',compact=false,platform=false,iconOnly=false}={}){
    const s=spec(id);if(!s)return '';
    // Platform badges only where a platform is actually selected or named.
    const badge=id===1&&!platform?'layers':s.badge;
    if(iconOnly)return `<span class="format-preview format-cue tone-${s.tone}${compact?' is-compact':''}" aria-hidden="true"><span class="format-badge badge-${badge}">${glyph(badge)}</span></span>`;
    const safe=typeof imageUrl==='string'&&/^\/creative-ai\/api\/brands\/[a-zA-Z0-9_./%|-]+$/.test(imageUrl)&&!imageUrl.includes('..')?imageUrl:'';
    return `<span class="format-preview tone-${s.tone} shape-${s.shape} design-${s.design}${compact?' is-compact':''}" aria-hidden="true"><span class="format-mini"><span class="mini-chrome"><i></i><i></i><i></i></span><span class="mini-lines"><i></i><i></i><i></i></span><span class="mini-product">${safe?`<img class="format-product-image" src="${escape(safe)}" alt="" loading="lazy" decoding="async">`:'<svg class="mini-placeholder" viewBox="0 0 80 50" fill="none" stroke="currentColor" stroke-width="2"><rect x="12" y="10" width="56" height="25" rx="6"/><path d="M8 24v17h64V24M16 41v5M64 41v5M40 13v20"/></svg>'}</span><span class="mini-cta"></span><span class="mini-stamp">${glyph(s.badge==='tag'?'tag':s.badge==='check'?'check':'layers')}</span></span><span class="format-badge badge-${badge}">${glyph(badge)}</span></span>`;
  }
  return {spec,render};
  })();
  const groups = [
    {id:'social',name:'Social & campaigns',icon:'spark',description:'Posts, stories, reels & campaigns',accent:'purple'},
    {id:'website',name:'Website & marketplaces',icon:'window',description:'Product pages, banners & A+',accent:'blue'},
    {id:'retail',name:'Retail & local',icon:'store',description:'Store offers, print & local versions',accent:'pink'},
    {id:'messaging',name:'Customer messaging',icon:'message',description:'WhatsApp, email & RCS',accent:'orange'},
    {id:'corporate',name:'Corporate & PR',icon:'megaphone',description:'LinkedIn, articles & announcements',accent:'teal'},
    {id:'training',name:'Training & sales',icon:'book',description:'Decks, explainers & catalogues',accent:'plum'}
  ];
  // Scope IDs stay stable even when labels or grouping change.
  const rows = [
    [1,'Benefit-led post','social','image',['proof']], [2,'Technology visual','website','image',['proof','source']],
    [3,'Offer creative','social','image',['offer']], [4,'Proof & claim card','social','image',['proof']],
    [5,'Product-page images','website','image',['source','alt']], [6,'Marketplace A+','website','image',['marketplace','proof']],
    [7,'Website banner','website','image',['destination','alt']], [8,'Instagram story','social','image',[]],
    [9,'Carousel','social','image',['slides']], [10,'Store post','retail','image',['store','destination']],
    [11,'In-store print','retail','image',['print']], [12,'Partner creative','retail','image',['partner']],
    [13,'LinkedIn post','corporate','image',['facts']], [14,'Messaging visual','messaging','image',['personalisation']],
    [15,'Blog & OG graphic','corporate','image',['source','alt']], [16,'Benefit film','social','video',['proof','audio']],
    [17,'Technology film','website','video',['source','proof','audio']], [18,'Marketplace explainer','website','video',['marketplace','audio']],
    [19,'Claim video','social','video',['proof','audio']], [20,'WhatsApp cutdown','messaging','video',['source']],
    [21,'Slideshow','social','video',['source','audio']], [22,'Store offer video','retail','video',['store','offer','audio']],
    [23,'Trend-led reel','social','video',['trend','audio']], [24,'Product reel','social','video',['audio']],
    [25,'Avatar video','training','video',['presenter','audio']], [26,'Benefit reel','social','video',['proof','audio']],
    [27,'Emotional short','social','video',['story','audio']], [28,'Festive film','social','video',['occasion','audio']],
    [29,'Training video','training','video',['chapters','presenter','quiz']], [30,'LinkedIn video','corporate','video',['facts','audio']],
    [31,'Product launch film','social','video',['story','audio']], [32,'In-store TV loop','retail','video',['store','schedule']],
    [33,'Influencer finishing','social','video',['source','audio']], [34,'Email copy','messaging','copy',['destination','personalisation']],
    [35,'Article','corporate','document',['source','outline']], [36,'PR kit','corporate','document',['facts','quotes']],
    [37,'Training & sales deck','training','document',['chapters','quiz']], [38,'SKU catalogue','training','document',['catalogue']],
    [39,'Resize creative','social','adapt',['source']], [40,'Translate & localise','messaging','adapt',['source','terms']],
    [41,'Store & city versions','retail','adapt',['source','store']], [42,'Personalised versions','messaging','adapt',['source','personalisation']]
  ];
  const features = rows.map(([id,name,group,kind,fields])=>({id,name,group,kind,fields}));
  const fields = {
    proof:{label:'Benefit, claim & supporting source',placeholder:'What can we say, and which saved source supports it?',type:'textarea'},
    source:{label:'Source material',placeholder:'Describe the footage, images, CGI or existing creative to use.',type:'textarea'},
    alt:{label:'Image descriptions',placeholder:'Any important details to include in alt text?',type:'textarea'},
    offer:{label:'Offer details',placeholder:'Enter the offer, price, EMI, dates and terms for this brief. Offers are never fetched or invented.',type:'textarea'},
    destination:{label:'CTA destination',placeholder:'https://…',type:'url'},
    marketplace:{label:'Marketplace & module requirements',placeholder:'Marketplace, module slots and eligibility.',type:'textarea'},
    store:{label:'Store or city details',placeholder:'Locations, store names, addresses and QR destinations. Data import comes later.',type:'textarea'},
    print:{label:'Print requirements',placeholder:'Vendor template, size, bleed, stock and viewing distance. Avoid assumed specifications.',type:'textarea'},
    partner:{label:'Partner & approval details',placeholder:'Partner name, supplied logos and required reviewer.',type:'textarea'},
    facts:{label:'Facts to include',placeholder:'Names, roles, dates and sourced announcement details.',type:'textarea'},
    personalisation:{label:'Personalisation & fallback',placeholder:'Use example placeholders such as {{first_name}}. Do not enter customer records.',type:'textarea'},
    audio:{label:'Voice, music & captions',placeholder:'Voice/language preference, supplied music and caption requirements.',type:'textarea'},
    trend:{label:'Trend reference',placeholder:'A link or description of the selected trend.',type:'textarea'},
    presenter:{label:'Presenter',placeholder:'Approved presenter, voice and disclosure requirements.',type:'textarea'},
    story:{label:'Story premise',placeholder:'The moment or story you want to tell.',type:'textarea'},
    occasion:{label:'Occasion & region',placeholder:'Festival, occasion, region and cultural context.',type:'text'},
    chapters:{label:'Chapters & learning outcomes',placeholder:'Topics, sequence and what people should learn.',type:'textarea'},
    quiz:{label:'Quiz requirements',placeholder:'Questions and review needs. Interactive assessment delivery is not connected.',type:'textarea'},
    schedule:{label:'Screen & schedule',placeholder:'Silent playback, loop duration and offer schedule.',type:'textarea'},
    outline:{label:'Outline & search intent',placeholder:'Sections, FAQs, search intent and source links.',type:'textarea'},
    quotes:{label:'Approved quotes',placeholder:'Exact quotes, speaker and source.',type:'textarea'},
    catalogue:{label:'Catalogue selection',placeholder:'Products, regions, price source and required output format.',type:'textarea'},
    terms:{label:'Keep these terms unchanged',placeholder:'Product names, technology names, numbers and qualifiers.',type:'textarea'}
  };
  const formats = [
    {id:'square',name:'Square post',w:1080,h:1080}, {id:'portrait',name:'Portrait post',w:1080,h:1350},
    {id:'feed-landscape',name:'Landscape feed post',w:1200,h:628},
    {id:'story',name:'Story',w:1080,h:1920}, {id:'linkedin',name:'LinkedIn landscape',w:1200,h:627},
    {id:'landscape',name:'Landscape / video',w:1920,h:1080}, {id:'banner',name:'Website banner',w:1920,h:640},
    {id:'custom',name:'Custom size',w:1080,h:1080}
  ];
  const languages=['English','Hindi','Hinglish','Kannada','Tamil','Telugu','Malayalam','Gujarati','Marathi','Bengali'];
  const uid = () => 'draft-'+globalThis.crypto.randomUUID();
  const clone = v => JSON.parse(JSON.stringify(v));
  function output(featureId) {
    const f=features.find(x=>x.id===Number(featureId));
    if(!f) throw Error('Choose an available deliverable.');
    const formatId=f.id===8?'story':f.id===7?'banner':f.id===13?'linkedin':f.kind==='video'?'story':'square';
    const size=formats.find(x=>x.id===formatId);
    return {id:uid(),featureId:f.id,formatId,width:size.w,height:size.h,slides:f.id===9?5:1,duration:15,language:'English'};
  }
  function newDraft(brandId,group='social') {
    const createdAt=new Date().toISOString();
    return {schemaVersion:1,id:uid(),brandId,revision:0,createdAt,updatedAt:createdAt,name:'',brief:'',creativeCount:2,audience:'',message:'',objective:'Awareness',focus:'product',productId:'',productName:'',productUrl:'',variant:'',group,language:'English',people:'Decide from the brief',lighting:'Decide from the brief',setting:'Decide from the brief',details:{},outputs:[],references:[],status:'draft'};
  }
  // A project owns its brief and plan. Studio is a destination, never a new project.
  const workspaces=[{id:'static',name:'Static Studio',available:true},{id:'video',name:'Video Studio',available:false},{id:'copy',name:'Copy Studio',available:false},{id:'adaptation',name:'Adaptation Studio',available:false}];
  function workspaceFor(kind){return kind==='video'?'video':kind==='adapt'?'adaptation':['copy','document'].includes(kind)?'copy':'static';}
  function startDraft(brandId,mode,featureId=1){
    if(!['campaign','quick'].includes(mode))throw Error('Choose Campaign or Create design.');
    const feature=features.find(f=>f.id===Number(featureId));
    if(mode==='quick'&&feature?.kind!=='image')throw Error('Create design currently supports static recipes.');
    const d=newDraft(brandId,feature?.group||'social');d.creationMode=mode;
    d.planning={strategy:{proposition:'',approach:''},concepts:[],team:'',deadline:''};
    if(mode==='quick'){d.outputs=[output(feature.id)];d.name=feature.id===10?'GMB / store post':feature.name;}
    return d;
  }
  function assetPlan(d){
    const concepts=d.planning?.concepts||[];
    return (d.outputs||[]).map((o,index)=>{const f=features.find(f=>f.id===o.featureId);const workspace=workspaceFor(f?.kind);return {id:o.id,index,name:o.name?.trim()||f?.name||'Unavailable recipe',workspace,available:!!f&&workspace==='static',conceptId:concepts.some(c=>c.id===o.conceptId)?o.conceptId:'',format:o.width+' × '+o.height,language:o.language||d.language,status:'Planned',slides:f?.id===9?o.slides:1};});
  }
  function planIssues(d){const issues=[];if(!d.outputs?.length)issues.push('Add at least one deliverable.');
    if(d.creationMode==='campaign'){
      if(!d.planning?.strategy?.proposition?.trim())issues.push('Add the campaign proposition.');
      const concepts=d.planning?.concepts||[];
      if(!concepts.length)issues.push('Add at least one creative concept.');
      if(concepts.some(c=>!c.name?.trim()||!c.idea?.trim()))issues.push('Give each concept a name and an idea.');
      if(assetPlan(d).some(a=>!a.conceptId))issues.push('Assign every deliverable to a concept.');
    }
    return issues;
  }
  // Recipe-specific planning UI. These inputs do not establish source approval.
  const staticRecipes={
    1:{story:'Create a feed visual or a PMax image set from one brief.',fields:[['platform','Image destination','select',['Instagram / Facebook','Instagram','Facebook','PMax']],['imageRatios','PMax image ratios','select',['Landscape + square + portrait','Landscape + square','Landscape + portrait','Square + portrait','Landscape','Square','Portrait']],['benefit','Main benefit'],['proof','Supporting source','textarea'],['qualifier','Qualification or disclaimer']],checks:['Benefit matches the exact product','Headline and supporting proof agree'],handoff:'Review the image and its saved checks, edit if needed, then download PNG or JPEG.'},
    2:{story:'Reuse the exact product’s official website technology image. Do not redraw or reconstruct it.',fields:[['technology','Technology name'],['mechanism','What to explain','textarea'],['source','Official website technology image / saved asset','textarea']],checks:['Technology wording is exact','Original website technology image is preserved without reconstruction'],handoff:'Review technology labels and product construction before editing or downloading.'},
    3:{story:'Use the offer supplied in this brief, including festive sales, with its exact terms and dates.',fields:[['offer','Offer and price wording','textarea'],['terms','Terms and qualifications','textarea'],['offerStart','Offer starts','date'],['offerEnd','Offer ends','date'],['destination','CTA destination','url']],checks:['Price and terms are supplied','Offer dates are in the correct order'],handoff:'Check the complete offer and expiry date before downloading. Publishing is separate.'},
    4:{story:'Communicate a supported claim without losing its qualification.',fields:[['claim','Exact claim','textarea'],['proof','Claim source','textarea'],['qualifier','Required qualification','textarea']],checks:['Claim has an exact source','Qualifications remain readable'],handoff:'Review the claim and qualification together, then edit or download the image.'},
    5:{story:'Plan a coherent, ordered set of product-page images.',part:'Image',parts:['Product hero','Benefit detail','Material / technology'],fields:[['source','Product-page requirements','textarea'],['filename','Filename prefix'],['alt','Shared image description','textarea']],checks:['Every image has a distinct job','Image descriptions match the product'],handoff:'Review each generated image separately. A complete image set requires all planned items.'},
    6:{story:'Plan marketplace modules against the selected marketplace’s template.',part:'Module',parts:['Hero module','Benefit module','Product detail'],fields:[['amazonPreset','Image preset','select',['Custom modules','Amazon feature module','Amazon lifestyle module','Amazon Brand Story']],['marketplace','Marketplace / account'],['template','Module template reference'],['eligibility','Eligibility and module constraints','textarea'],['proof','Comparison / claim source','textarea']],checks:['Module slots match supplied templates','Eligibility and claims are confirmed externally'],handoff:'Download reviewed module images. Marketplace upload and acceptance happen separately.'},
    7:{story:'Create a website banner or category tile at brief-selected dimensions.',fields:[['websiteType','Website asset','select',['Banner','Category tile']],['categoryName','Category name'],['labelTreatment','Category label','select',['Live website text','Include in image']],['brandedHost','Visible branded header','select',['Yes','No']],['placement','Page and placement'],['destination','CTA destination','url'],['fileLimit','Required file limit'],['alt','Accessible image description','textarea']],checks:['Dimensions match the placement','CTA and destination agree'],handoff:'Download the required image format. Website publishing is not performed here.'},
    8:{story:'Create a story with space for platform interface elements.',fields:[['publishing','Post or ad?','select',['Organic','Paid']],['platform','Story platform'],['safeArea','Safe-area / platform template notes','textarea'],['interaction','Link sticker or interaction notes','textarea']],checks:['Copy and logo avoid the specified interface area','Text remains readable at viewing size'],handoff:'Review the final story and add platform stickers separately before sharing.'},
    9:{story:'Build a feature sequence or story across ordered slides. LinkedIn includes a document handoff.',part:'Slide',parts:[],fields:[['platform','Carousel platform','select',['Instagram / Facebook','Instagram','Facebook','LinkedIn']],['narrativeType','Carousel treatment','select',['Feature','Story']],['narrative','Narrative / progression','textarea'],['caption','Accompanying caption','textarea'],['destination','CTA destination','url']],checks:['Slide order makes sense','Claims and product identity stay consistent across slides'],handoff:'Review every slide in order. LinkedIn delivers a same-size-page raster PDF and original slides; publishing checks remain separate.'},
    10:{story:'Create a local store or Google Business Profile post.',fields:[['storeName','Store name'],['address','Address / location','textarea'],['destination','Map or landing-page URL','url'],['localCTA','Local call to action']],checks:['Store address and destination are correct','Offer wording includes applicable terms'],handoff:'Download the reviewed visual; post it to the selected store account separately.'},
    11:{story:'Prepare an in-store print design for a named vendor specification.',fields:[['vendor','Printer / vendor'],['template','Vendor template reference'],['physicalWidth','Finished width','number'],['physicalHeight','Finished height','number'],['unit','Physical units','select',['mm','cm','in']],['bleed','Vendor-specified bleed'],['stock','Stock and finish'],['print','Proof and handoff requirements','textarea']],checks:['Vendor supplies dimensions, bleed and colour requirements','Physical proof is reviewed before production'],handoff:'PNG/JPEG is a screen preview. Use the current studio’s print handoff for proofs and vendor files; it is not certified print-ready.'},
    12:{story:'Create a co-branded asset with explicit partner requirements.',fields:[['partner','Partner name'],['partnerAsset','Partner asset / reference'],['lockup','Logo lockup and placement instructions','textarea'],['reviewer','Required approver']],checks:['Correct partner assets are attached','Partner review requirements are recorded'],handoff:'Review the co-branding and seek partner approval separately. Downloads do not send approval requests.'},
    13:{story:'Turn a corporate announcement into a LinkedIn visual.',fields:[['occasion','Announcement / occasion'],['facts','Names, roles, dates and facts','textarea'],['proof','Source for announcement','textarea']],checks:['Names and roles are accurate','Announcement facts have a source'],handoff:'Review the visual and wording before editing or downloading for LinkedIn.'},
    14:{story:'Create a messaging visual for a defined channel and audience.',fields:[['channel','Channel','select',['WhatsApp','RCS','Other']],['fileLimit','Channel file / size requirements'],['personalisation','Example placeholders','textarea'],['fallback','Fallback wording','textarea']],checks:['Placeholder examples have fallback wording','Image is readable in the destination app'],handoff:'Download a preview image. No messages are sent and no personalisation data is merged.'},
    15:{story:'Create a blog hero or Open Graph image tied to an article.',fields:[['articleTitle','Article title'],['destination','Article URL','url'],['facts','Key facts / source','textarea'],['alt','Image description','textarea']],checks:['Graphic reflects the article','Title, source and image description agree'],handoff:'Download the image. Site metadata and publishing are managed outside this screen.'}
  };
  const retailPrintPresets=[
 ['print-flyer-a4','Flyer · A4',210,297,1,'Print handouts','Handheld; clear headline, supported benefits and action.'],
 ['print-flyer-a5','Flyer · A5',148,210,1,'Print handouts','Handheld; concise message with readable supporting copy.'],
 ['print-leaflet-a5','Leaflet · A5 · front & back',148,210,2,'Print handouts','Front: hero message and product. Back: distinct supported details and action.'],
 ['print-leaflet-a6','Leaflet · A6 · front & back',105,148,2,'Print handouts','Small handout; short copy, generous type and clear next step.'],
 ['print-leaflet-dl','Leaflet / rack card · DL · two sides',99,210,2,'Print handouts','Narrow handout; one reading column and distinct front/back content.'],
 ['print-brochure-bifold','Brochure · A4 bi-fold · two flat faces',297,210,2,'Brochures & documents','Flat spread, not a mockup. Outside: back on left, cover on right; inside: left/right reading order. Fold at halfway.'],
 ['print-brochure-trifold','Brochure · A4 letter fold · two flat faces',297,210,2,'Brochures & documents','Flat sheet, not a mockup. Outside left-to-right: fold-in, back, cover; inside: three reading panels. Inner panel narrower; confirm template/duplex direction.'],
 ['print-brochure-zfold','Brochure · A4 Z-fold · two flat faces',297,210,2,'Brochures & documents','Flat sheet with three equal panels; accordion reading sequence. Confirm which face is the cover and duplex orientation.'],
 ['print-booklet-a5','Booklet / mini catalogue · A5 · four pages',148,210,4,'Brochures & documents','Four reader-order pages: cover, two distinct content pages, back/action. No printer imposition; saddle-stitch signatures need printer approval.'],
 ['print-sales-sheet','Sales / product specification sheet · A4',210,297,1,'Brochures & documents','Readable verified product specifications only; never fabricate dimensions or pricing.'],
 ['print-price-list','Price list · A4',210,297,1,'Brochures & documents','Exact supplied prices, dates and qualifiers required; no invented rows.'],
 ['print-poster-a4','Poster · A4',210,297,1,'Posters & signage','One main message with close-view supporting details.'],
 ['print-poster-a3','Poster · A3',297,420,1,'Posters & signage','Short headline, dominant product, action readable at viewing distance.'],
 ['print-poster-a2','Poster · A2',420,594,1,'Posters & signage','Distance reading: reduce copy and prioritize headline/logo/product.'],
 ['print-poster-a1','Poster · A1',594,841,1,'Posters & signage','Distance reading; one headline and minimal supporting copy.'],
 ['print-dangler','Dangler · rectangular · two sides',150,210,2,'Retail & POS','Top hanging-hole area is a keep-out. Short message; two faces share identity, not dense handout copy.'],
 ['print-dangler-round','Dangler · round · two sides',150,150,2,'Retail & POS','Artwork fits a centered circular finished shape; keep essential content well inside circle and below hanging hole. Dieline is separate.'],
 ['print-shelf-talker','Shelf talker',150,100,1,'Retail & POS','Short product/offer message readable at shelf distance; no invented prices.'],
 ['print-shelf-strip','Shelf strip',600,80,1,'Retail & POS','Very short message, prominent brand and product cue; respect mounting/cutting.'],
 ['print-wobbler','Shelf wobbler',100,100,1,'Retail & POS','Keep mounting tab and adhesive area clear; concise product message.'],
 ['print-tent-card','Tent card · two flat display faces',105,148,2,'Retail & POS','Two upright display faces, not an assembled mockup. Base/glue flap supplied by printer; confirm fold and face orientation.'],
 ['print-counter-card','Counter / tabletop card',148,210,1,'Retail & POS','Eye-level short message and clear action; respect holder obstruction.'],
 ['print-standee','Roll-up standee',850,2000,1,'Posters & signage','Readable from several metres; short headline. Keep bottom cassette area free of essential content; confirm hardware template.'],
 ['print-x-banner','X-banner stand',600,1600,1,'Posters & signage','Corner eyelets are keep-outs. Distance-readable hierarchy; confirm hardware template.'],
 ['print-retail-board','Retail / foam board',600,900,1,'Posters & signage','Dominant product, minimal copy; mounting and operator safe zones required.'],
 ['print-window-poster','Window poster',500,700,1,'Posters & signage','High contrast, short copy; account for window frame and mounting.'],
 ['print-flex-banner','Flex / outdoor banner',1800,900,1,'Outdoor & large format','Brief message at distance; keep hems/eyelets clear. Size is a starting preset, not operator specification.'],
 ['print-hoarding','Hoarding / billboard',6000,3000,1,'Outdoor & large format','Very brief message, one hero and brand. Confirm operator dimensions, scale, finish, safe area and viewing distance.'],
 ['print-transit-poster','Transit / street furniture poster',1185,1750,1,'Outdoor & large format','Fast reading, few words, high contrast; operator frame template required.'],
 ['print-wall-graphic','Wall graphic · flat artwork',3000,2250,1,'Posters & signage','One continuous wall design. Keep identity and essential information clear of supplied seams, fixtures and obstructions. No installation mockup.'],
 ['print-price-board','Price / offer board',600,900,1,'Retail & POS','Match exact supplied product, variant, amount and applicable terms. No invented discount or expiry.'],
 ['print-backdrop','Event / exhibition backdrop',3000,2250,1,'Outdoor & large format','Distance-readable message; seams, joins, frame and mounting can obscure content.'],
 ['print-vehicle-panel','Vehicle wrap · flat panel concept',3000,1200,1,'Outdoor & large format','Flat artwork concept for one operator-defined panel; not a vehicle mockup or wrap kit. Vehicle curvature, panel boundaries, windows, handles and dielines need the installer template.'],
 ['print-airport-panel','Airport advertising panel',1000,1500,1,'Outdoor & large format','Fast distance reading; exact operator trim, frame, illumination, scale and exclusions must replace these starting dimensions.'],
 ['print-stadium-panel','Stadium advertising panel',2000,1000,1,'Outdoor & large format','Very brief message and large brand cue. Confirm operator panel dimensions, camera visibility, barriers and mounting.'],
 ['print-newspaper','Newspaper advertisement',250,350,1,'Press & direct mail','Publication column size, stock, screen, colour profile and deadline must be supplied. Proof only.'],
 ['print-magazine','Magazine advertisement · A4',210,297,1,'Press & direct mail','Publication-specific trim/bleed/gutter/output intent needed; preserve all offer/legal qualifiers.'],
 ['print-postcard','Postcard · two sides',148,105,2,'Press & direct mail','Front: hero message. Back: action/details; address/postal panel only if explicitly requested and to postal template.'],
 ['print-insert','Packaging / thank-you insert',105,148,2,'Print handouts','Front/back content with authentic product/care information; no unsupported care or health claims.'],
 ['print-business-card','Business / store contact card · two sides',90,50,2,'Print handouts','Exact supplied contact details only; never invent address, phone or QR codes.'],
 ['print-voucher','Voucher / gift certificate',210,99,2,'Print handouts','Exact supplied value, validity, redemption and terms required.'],
 ['print-hang-tag','Product hang tag · two sides',60,100,2,'Retail & POS','Keep hanging-hole area clear; exact SKU/details only. Dieline and stock require printer template.'],
 ['print-sticker','Sticker / label',100,100,1,'Retail & POS','Exact label wording, clear trim safety; shape/dieline and material are separate.'],
 ['print-door-hanger','Door hanger',90,210,2,'Retail & POS','Leave hook/handle cutout area clear; use printer-specific dieline before manufacture.'],
 ['print-bookmark','Bookmark',50,180,2,'Print handouts','Narrow upright format; extremely concise message and action.']
].map(([slug,name,w,h,pages,category,guidelines])=>({id:'custom:studio-'+slug,name,category,width:1200,height:Math.round(1200*h/w),platform:'Print / offline',kind:'print',pages,sourceIds:['adobe-bleed','adobe-boxes','moo-flyers','hopkins-folds','vista-materials'],guidelines,print:{trimWidthMm:w,trimHeightMm:h,bleedMm:3,safeMm:5,proofPpi:150,requiredPpi:300,fold:slug.endsWith('trifold')?'letter':slug.endsWith('zfold')?'z':slug.endsWith('bifold')?'half':'none',panelWidthsMm:slug.endsWith('trifold')?[97,100,100]:[],keepoutTopMm:/dangler|hang-tag|door-hanger/.test(slug)?20:0,keepoutBottomMm:slug==='print-standee'?150:0}}));
  // Shared intake catalogue; planning-only entries never imply a completed production route.
  const retailEntries=[
    {key:'store',featureId:10,name:'Google Business Profile Post'},
    {key:'store-banner',featureId:10,name:'Store / Campaign Banner'},
    {key:'screen',featureId:10,name:'Retail Screen Image'},
    ...[['window','Window Artwork','print-window-poster'],['standee','Standee','print-standee'],['wobbler','Wobbler / Shelf / Dangler','print-wobbler'],['product-card','Product / Counter Card','print-counter-card'],['wall','Wall Graphic','print-wall-graphic'],['price','Price / Offer Board','print-price-board'],['poster','Poster / Flyer','print-poster-a3'],['brochure','Brochure / Leaflet','print-brochure-bifold']].map(([key,name,slug])=>({key,name,featureId:11,printId:'custom:studio-'+slug})),
    {key:'partner',featureId:12,name:'Dealer / Partner Toolkit',planningOnly:true},
    {key:'store-versions',featureId:10,name:'Store / City / Language Versions',planningOnly:true},
    {key:'catalogue',featureId:11,name:'GT / COCO Catalogue Brief',planningOnly:true}
  ];
  const retailSizes={'Square · 1080 × 1080':[1080,1080],'Landscape · 1920 × 1080':[1920,1080],'Portrait · 1080 × 1920':[1080,1920],'Custom pixels':null};
  function retailEntry(o){return retailEntries.find(e=>e.key===o?.staticValues?.retailPreset&&e.featureId===o.featureId)||null;}
  function applyRetailPreset(o,key){
    const e=retailEntries.find(e=>e.key===key);if(!e)return o;
    const same=o.staticValues?.retailPreset===key; o.featureId=e.featureId;o.name=e.name;o.slides=1;o.formatId='custom';
    o.staticValues={...o.staticValues,retailPreset:key};const v=o.staticValues;
    if(e.printId){const p=retailPrintPresets.find(p=>p.id===(same&&v.printPreset||e.printId));if(!p)return o;
      if(!same||v.appliedPrintPreset!==p.id){Object.assign(v,{printPreset:p.id,appliedPrintPreset:p.id,physicalWidth:String(p.print.trimWidthMm),physicalHeight:String(p.print.trimHeightMm),unit:'mm',bleedMm:String(p.print.bleedMm),safeMm:String(p.print.safeMm),keepoutTopMm:String(p.print.keepoutTopMm),keepoutBottomMm:String(p.print.keepoutBottomMm),panelWidthsMm:p.print.panelWidthsMm.join(', ')});}
      o.width=p.width;o.height=p.height;
    }else{if(!same)v.sizePreset=key==='screen'?'Landscape · 1920 × 1080':'Square · 1080 × 1080';const size=retailSizes[v.sizePreset];if(size)[o.width,o.height]=size;}
    return o;
  }
  function retailRecipe(o){const e=retailEntry(o);if(!e)return null;
    const common=[['visualFocus','What should the image show?','textarea'],['suppliedWording','Exact wording to include (optional)','textarea'],['visualReferences','Reference / composition notes (optional)','textarea']];
    const location=[['storeName','Store name (if shown)'],['address','Address / location (if shown)','textarea']];
    const dates=[['offerStart','Starts (optional)','date'],['offerEnd','Ends / expires (optional)','date'],['offer','Supplied offer, price and terms (optional)','textarea']];
    const sizes=[['sizePreset','Image shape / size','select',Object.keys(retailSizes)]];
    let fields=[];
    if(e.printId)fields=[['printPreset','Physical format','select',retailPrintPresets.map(p=>p.id)],['physicalWidth','Finished flat width','number'],['physicalHeight','Finished flat height','number'],['unit','Physical units','select',['mm','cm','in']],['bleedMm','Bleed per edge (mm)'],['safeMm','Safe margin (mm)'],['keepoutTopMm','Top mounting clearance (mm)'],['keepoutBottomMm','Bottom mounting clearance (mm)'],['panelWidthsMm','Fold panel widths in mm (letter fold only)'],['vendor','Printer / vendor (optional)'],['template','Template reference (optional)'],['stock','Material / finish (optional)'],['cutShape','Cutting shape / supplied dieline notes (optional)','textarea'],['foldNotes','Fold direction / panel reading order (optional)','textarea'],['mountingNotes','Mounting, holes and hidden areas (optional)','textarea'],['obstructions','Frames, seams, cutouts or mounting notes','textarea'],['viewingDistance','Viewing distance (optional)'],['facePlan','What each face or page should show (optional)','textarea'],...(e.key==='price'?dates:[])];
    if(e.key==='store')fields=[['postType','Post type','select',['Update','Offer','Event']],...sizes,...location,...dates,['destination','Map / landing page (optional)','url']];
    if(e.key==='store-banner')fields=[...sizes,...location,['placement','Where will the banner appear?'],...dates];
    if(e.key==='screen')fields=[['screenType','Screen content','select',['Product information','Offer','Campaign']],...sizes,['screenLocation','Screen / store location'],['viewingDistance','Viewing distance (optional)'],['dwellTime','Seconds displayed (optional)'],['player','Screen player (optional)'],['fileFormat','Player image format','select',['PNG','JPEG']],['maxFileKb','Player file limit in KB (optional)'],['cropMode','Player scaling','select',['Not supplied','Fit / letterbox','Fill / crop','Exact pixel match']],['edgeClearance','Player edge clearance / overscan (optional)'],['obstructions','Screen crop or edge clearance (optional)','textarea'],...dates];
    if(e.key==='partner')fields=[['toolkitType','Deliverable','select',['Single partner visual','Announcement','Partner social set','Toolkit']],...sizes,['partner','Partner name'],['partnerAsset','Saved partner artwork / reference'],['lockup','Supplied co-brand layout instructions','textarea'],['reviewer','Partner reviewer (optional)'],['deliverables','Requested images and sizes','textarea']];
    if(e.key==='store-versions')fields=[['versionType','Version type','select',['Store / city','Regional language','Store-specific offer']],['sourceMaster','Saved master creative reference'],['storeData','Store data source / row mapping','textarea'],['targetLanguages','Languages'],['destinations','QR / map destinations by store','textarea'],['fallback','Missing-data handling notes','textarea'],...sizes];
    if(e.key==='catalogue')fields=[['catalogueType','Catalogue type','select',['Regional GT mattresses','COCO mattresses','COCO furniture','COCO accessories','COCO full range']],['edition','Edition','select',['Digital','Print','Digital + print']],['region','Region'],['targetLanguages','Languages'],['rangeSource','Product range / SKU source','textarea'],['priceSource','Price / specification source (optional)','textarea'],['pageSize','Page size / orientation'],['template','Existing layout reference (optional)'],['deliverables','Cover / product imagery requirements','textarea']];
    return {story:e.planningOnly?'Save the inputs for this workflow. '+(e.key==='partner'?'Attached partner artwork and toolkit assembly':'Batch processing and publication assembly')+' still need the next implementation pass.':'Choose the format and describe the image. Supplied wording is optional; copywriting is a separate phase.'+(e.printId?' Physical sizes and margins are editable starting assumptions, not printer-approved specifications.':''),fields:[['retailPreset','Format','select',retailEntries.map(e=>e.key)],...fields,...common],checks:['Use this brand’s saved sources','Keep supplied wording and product identity accurate'],handoff:e.planningOnly?'Planning brief only; saving does not generate a batch, toolkit or complete catalogue.':e.printId?'Generate raster artwork and existing print proofs. Vendor templates and physical acceptance remain separate.':'Review and download the selected image. Publishing and device/display acceptance remain separate.'};
  }
  function retailProfile(o){const e=retailEntry(o),v=o.staticValues;if(!e||e.planningOnly)return null;
    if(e.printId){const p=retailPrintPresets.find(p=>p.id===v.printPreset),scale={mm:1,cm:10,in:25.4}[v.unit];if(!p||!scale)return null;
      const s={trimWidthMm:Number(v.physicalWidth)*scale,trimHeightMm:Number(v.physicalHeight)*scale};
      for(const k of ['bleedMm','safeMm','keepoutTopMm','keepoutBottomMm']){if(v[k]===undefined||v[k]==='')return null;s[k]=Number(v[k]);}
      if(Object.values(s).some(n=>!Number.isFinite(n)||n<0||n>10000)||s.trimWidthMm<1||s.trimHeightMm<1||s.bleedMm>50||s.safeMm>=Math.min(s.trimWidthMm,s.trimHeightMm)/2||s.keepoutTopMm+s.keepoutBottomMm+2*s.safeMm>=s.trimHeightMm)return null;
      if(p.print.fold==='letter'){s.panelWidthsMm=String(v.panelWidthsMm||'').split(',').map(Number);if(s.panelWidthsMm.length!==3||s.panelWidthsMm.some(n=>!Number.isFinite(n)||n<=2*s.safeMm)||Math.abs(s.panelWidthsMm.reduce((a,b)=>a+b,0)-s.trimWidthMm)>.05)return null;}
      s.templateNote=[v.vendor,v.template,v.stock,v.cutShape,v.foldNotes,v.mountingNotes,v.obstructions,v.viewingDistance].filter(Boolean).join(' · ').slice(0,1200);
      return {placementId:p.id,label:e.name,width:o.width,height:o.height,unitCount:p.pages,printOptions:{[p.id]:s}};
    }
    if(!Object.hasOwn(retailSizes,v.sizePreset)||![o.width,o.height].every(n=>Number.isInteger(n)&&n>=64&&n<=8192)||o.width*o.height>40000000||Math.max(o.width/o.height,o.height/o.width)>20)return null;
    const fixed=retailSizes[v.sizePreset];if(fixed&&(o.width!==fixed[0]||o.height!==fixed[1]))return null;
    const id='custom:retail-'+e.key+'-'+o.width+'x'+o.height;
    const format=e.key==='screen'&&v.fileFormat==='JPEG'?'jpeg':'png',limit=e.key==='screen'?String(v.maxFileKb||'').trim():'';if(limit&&(!Number.isFinite(Number(limit))||Number(limit)<=0||Number(limit)>100000))return null;
    return {placementId:id,label:e.name,width:o.width,height:o.height,customProfiles:[{id,name:e.name,platform:e.key==='screen'?'Retail screen':'Local store',publisher:'client',placement:e.key,assetType:'static',canvas:{width:o.width,height:o.height,unit:'px'},exportContract:{formats:[format],...(limit?{maxBytes:Math.floor(Number(limit)*1024)}:{})},displayContext:e.name+'. User-selected canvas. '+(e.key==='screen'?'Still image, not video. Match the chosen screen orientation and keep essential content clear of the supplied edge exclusions.':'Match the selected local post or banner purpose; use only supplied store details.')+' Viewing and crop notes: '+[v.viewingDistance,v.dwellTime,v.cropMode,v.edgeClearance,v.player,v.obstructions,v.placement].filter(Boolean).join('; ')+'. No invented prices, addresses, contacts or QR codes. Device and publisher acceptance are separate.'}]};
  }

  // Image-slot presets only. Native Amazon fields and account publishing remain separate.
  const amazonTemplates={
    'Amazon feature module':{id:'feature',source:'https://developer-docs.amazon/sp-api/docs/a-plus-content-examples',parts:[['Feature image',300,300]],instruction:'Standard Single Image Highlights image slot. Show one source-supported feature. Headline and descriptive paragraphs belong to separate Amazon text fields; do not bake paragraphs into the image.'},
    'Amazon lifestyle module':{id:'lifestyle',source:'https://developer-docs.amazon/sp-api/docs/a-plus-content-examples',parts:[['Lifestyle header image',970,600]],instruction:'Standard Image Header with Text image slot. Depict the selected exact product in a coherent usage scene appropriate to this brief and brand. Keep headline and description in separate Amazon native fields; do not bake paragraphs into the image. Actual module/publisher acceptance remains separate.'},
    'Amazon Brand Story':{id:'brand-story',source:'https://developer-docs.amazon/sp-api/lang-en_en/docs/a-plus-brand-story-modules',parts:[['Desktop background',1464,625],['Mobile background',463,625],['Story card 1',362,453],['Story card 2',362,453]],instruction:'Image-only Brand Story starter: desktop/mobile backgrounds plus two media-asset cards. Backgrounds leave space for overlaid cards; recompose mobile rather than stretching. Cards tell distinct source-backed brand ideas in one visual system. Native headlines/descriptions, ASIN/store links, Q&A and approved logo upload remain separate. Never invent brand history, product ranges or testimonials.'}
  };
  // Exact Studio canvases meet the documented image-slot minima. Text and interactions are not baked into artwork.
  const premiumSource='https://developer-docs.amazon/sp-api/docs/a-plus-premium-modules';
  const premiumPresets=[
    ['Image beside text','image-text','PREMIUM_IMAGE_TEXT',[['Product image',800,600]],'Compose a product detail or usage image that works beside a native text panel on desktop and above it on mobile.'],
    ['Full-width image','full-background','PREMIUM_FULL_BACKGROUND_IMAGE',[['Desktop image',1464,600],['Mobile image',600,450]],'Create a coherent full-width visual and a separately composed mobile version. Native text sits outside the image.'],
    ['Background for text overlay','background-text','PREMIUM_FULL_BACKGROUND_TEXT',[['Desktop background',1464,600],['Mobile image',600,450]],'Reserve natural background space on the selected side for a future Amazon text overlay. Do not paint a text box or gradient. Mobile stacks image and text separately.'],
    ['Four-column images','columns','PREMIUM_FOUR_COLUMN_IMAGES',Array.from({length:4},(_,i)=>['Column '+(i+1),300,225]),'Show distinct features, views or uses with consistent product scale, lighting and visual treatment. Desktop columns become a mobile two-by-two grid.'],
    ['Image carousel','carousel','PREMIUM_IMAGE_CAROUSEL',[], 'Plan a coherent sequence of distinct features or use cases, with a desktop and mobile image for every panel. Do not draw carousel controls or buttons.'],
    ['Navigation carousel','navigation','PREMIUM_NAVIGATION_CAROUSEL',[], 'Give each panel a distinct visual topic and preserve an ordered visual system. Supply desktop/mobile pairs; Amazon navigation labels and controls are separate.'],
    ['Two-column images','dual','PREMIUM_DUAL_IMAGE_TEXT',[['Column 1',650,350],['Column 2',650,350]],'Two complementary product views or uses. Keep a coherent visual system; columns stack in order on mobile. Native explanations remain separate.'],
    ['Step-by-step carousel','regimen','PREMIUM_REGIMEN_CAROUSEL',[], 'Show supported use or care steps in a clear order, with paired desktop/mobile images. Do not invent instructions or paint navigation tabs.'],
    ['Media carousel — images only','media-carousel','PREMIUM_VIDEO_IMAGE_CAROUSEL',[], 'Use the static-image alternative of the media carousel. Each panel has a desktop image beside native text and a mobile image. No video, play buttons or native text are rendered in this phase.'],
    ['Hotspot images','hotspot','PREMIUM_HOTSPOT_IMAGE',[], 'Show the relevant features clearly in one desktop base image and provide a mobile detail image for each intended hotspot. Do not draw dots, labels or fake interactions. Coordinates will be chosen against the final base image later.'],
    ['Hotspot images with heading','hotspot-text','PREMIUM_HOTSPOT_IMAGE_TEXT',[], 'Create a desktop feature overview and one mobile detail image per hotspot. The module heading and hotspot titles are separate native fields. Do not paint markers or invent internal construction.']
  ];
  for(const [name,id,moduleType,parts,instruction] of premiumPresets){
    const repeat=id==='columns'?'columns':['carousel','navigation','regimen','media-carousel'].includes(id)?'panels':id.startsWith('hotspot')?'hotspots':null;
    const range=repeat==='columns'?[3,4]:['navigation','regimen'].includes(id)?[2,5]:repeat?[2,6]:null;
    const t={id:'premium-'+id,tier:'Premium',moduleType,source:premiumSource,parts,instruction,repeat,range,defaultCount:repeat==='columns'?4:3};
    if(repeat)t.parts=amazonImageSlots(t,{});
    amazonTemplates['Amazon Premium — '+name]=t;
  }
  // Amazon A+ pages (user decisions, 9 Nov 2026; docs/aplus-20261109.md). Choosing a page type
  // makes every module in every required size in ONE job, planned as one story. Wide panels
  // (970 px or wider) carry short on-image text; mobile versions re-lay out the same words; small
  // images stay light (no text or a 1-3 word label); one logo on the hero only. Native text limits
  // are Amazon's documented limits where verified (Standard header headline 150 and overlay 70/300,
  // alt text 100); every other cap is a conservative Studio cap, shorter than Amazon may allow.
  const aplusPair=(id,label,w,h)=>({id,slots:[[label+' · desktop',w,h,'desktop'],[label+' · mobile',600,450,'mobile']]});
  const aplusPageTypes={
    premium:{id:'premium',name:'Premium A+ page',label:'Premium (recommended)',tier:'Premium',moduleLimit:7,source:premiumSource,modules:[
      {id:'hero',name:'Hero banner',role:'hero',moduleType:'PREMIUM_FULL_BACKGROUND_TEXT',job:'Introduce the exact product and the one idea of the page.',limits:{headline:70,body:300},units:[aplusPair('hero','Hero',1464,600)]},
      {id:'technology',name:'Technology panel',role:'technology',moduleType:'PREMIUM_FULL_BACKGROUND_TEXT',job:'Show the exact product technology, named word for word from the official product page.',limits:{headline:70,body:300},units:[aplusPair('technology','Technology',1464,600)]},
      {id:'benefits',name:'Benefits carousel',role:'benefits',moduleType:'PREMIUM_NAVIGATION_CAROUSEL',job:'One supported benefit per panel, three panels.',limits:{headline:70,body:300},units:[1,2,3].map(n=>aplusPair('benefit-'+n,'Benefit '+n,1464,600))},
      {id:'lifestyle',name:'Lifestyle banner',role:'lifestyle',moduleType:'PREMIUM_FULL_BACKGROUND_TEXT',job:'Show the product in believable real use with a short closing message.',limits:{headline:70,body:300},units:[aplusPair('lifestyle','Lifestyle',1464,600)]},
      {id:'detail',name:'Two detail images',role:'detail',moduleType:'PREMIUM_DUAL_IMAGE_TEXT',job:'Two close details or views that answer buying questions.',limits:{headline:70,body:300},units:[1,2].map(n=>({id:'detail-'+n,slots:[['Detail '+n,650,350,'shared']]}))},
      {id:'faq',name:'FAQ',role:'faq',moduleType:null,job:'Three to five short questions and answers from the official product facts. Text only, no image.',limits:{question:120,answer:300},units:[],textOnly:true}
    ],later:['Own-brand comparison chart: it needs other products from the same brand, so it is left out for now (a later option).']},
    basic:{id:'basic',name:'Basic A+ page',label:'Basic',tier:'Basic',moduleLimit:5,source:aplusSourceUrl(),noMobile:true,modules:[
      {id:'header',name:'Header image with text',role:'hero',moduleType:'STANDARD_HEADER_IMAGE_TEXT',job:'Introduce the exact product and the one idea of the page.',limits:{headline:150,body:600},units:[{id:'header',slots:[['Header image',970,600,'shared']]}]},
      {id:'overlay',name:'Image with text overlay',role:'technology',moduleType:'STANDARD_IMAGE_TEXT_OVERLAY',job:'Show the exact product technology, named word for word from the official product page. Amazon draws its own text box over part of this image.',limits:{headline:70,body:300},units:[{id:'overlay',slots:[['Overlay image',970,300,'shared']]}]},
      {id:'three',name:'Three images',role:'benefits',moduleType:'STANDARD_THREE_IMAGE_TEXT',job:'Three supported benefits, one per image.',limits:{headline:70,body:300},units:[1,2,3].map(n=>({id:'image-'+n,slots:[['Three images · '+n,300,300,'shared']]}))},
      {id:'highlights',name:'Highlights image',role:'detail',moduleType:'STANDARD_SINGLE_IMAGE_HIGHLIGHTS',job:'One close detail beside Amazon\'s highlights text.',limits:{headline:70,body:300},units:[{id:'highlights',slots:[['Highlights image',300,300,'shared']]}]}
    ],later:['Comparison chart: it needs other products from the same brand, so it is left out for now (a later option).']},
    'brand-story':{id:'brand-story',name:'Brand Story',label:'Brand Story',tier:'Brand Story',moduleLimit:5,source:'https://developer-docs.amazon/sp-api/docs/a-plus-brand-story-modules.md',modules:[
      {id:'background',name:'Brand Story background',role:'brand',moduleType:null,job:'A calm brand backdrop. Amazon places the brand logo, headline and cards on top, so it carries no words.',limits:{headline:0,body:0},units:[{id:'background',slots:[['Background · desktop',1464,625,'desktop'],['Background · mobile',463,625,'mobile']]}]},
      {id:'cards',name:'Story cards',role:'story',moduleType:null,job:'Three distinct, source-backed brand ideas in one visual system.',limits:{headline:50,body:150},units:[1,2,3].map(n=>({id:'card-'+n,slots:[['Story card '+n,362,453,'shared']]}))}
    ],later:['About-the-brand card with the logo, and the four-product card: they need the saved logo upload and other products, so they are left out for now (a later option).']}
  };
  function aplusSourceUrl(){return 'https://developer-docs.amazon/sp-api/docs/a-plus-content-examples';}
  // Every image of a page type in order, with its module, device, text rule and logo choice.
  function aplusSlots(typeId){
    const type=aplusPageTypes[typeId];if(!type)return [];const out=[];
    for(const m of type.modules)for(const u of m.units){const first=out.length;for(const [name,width,height,device] of u.slots){
      const textRule=type.id==='brand-story'&&m.id==='background'?'none':device==='mobile'?'mobile':width>=970?'panel':'label';
      out.push({index:out.length+1,name,width,height,device,module:m.id,moduleName:m.name,role:m.role,moduleType:m.moduleType,unit:u.id,textRule,logo:m.role==='hero',pairIndex:device==='mobile'?first+1:null});}}
    return out;
  }
  function aplusSummary(typeId){
    const type=aplusPageTypes[typeId];if(!type)return null;const slots=aplusSlots(typeId);
    return {version:1,type:type.id,name:type.name,tier:type.tier,imageCount:slots.length,moduleCount:type.modules.length,later:type.later.slice(),
      modules:type.modules.map(m=>({id:m.id,name:m.name,role:m.role,moduleType:m.moduleType,job:m.job,limits:{...m.limits},textOnly:!!m.textOnly,units:m.units.map(u=>u.id),images:slots.filter(s=>s.module===m.id).map(s=>({index:s.index,name:s.name,width:s.width,height:s.height,device:s.device}))}))};
  }
  for(const type of Object.values(aplusPageTypes)){
    const slots=aplusSlots(type.id);
    amazonTemplates['Amazon A+ page — '+type.label]={id:'aplus-'+type.id,page:type.id,tier:type.tier,source:type.source,parts:slots.map(s=>[s.name,s.width,s.height]),
      instruction:type.name+': one coordinated A+ page planned as one story ('+type.modules.map(m=>m.name).join(' → ')+'). Every image is made at its own required size'+(type.noMobile?'':', with separately composed mobile versions')+'. Amazon text fields, alt text'+(type.id==='premium'?' and the FAQ':'')+' are written into a copy deck delivered with the images.'};
  }
  const aplusPresetNames=Object.keys(amazonTemplates).filter(k=>amazonTemplates[k].page);
  function aplusPage(o){const t=amazonImageTemplate(o);return t?.page?aplusPageTypes[t.page]:null;}
  function aplusPresetName(typeId){return aplusPresetNames.find(k=>amazonTemplates[k].page===typeId)||null;}
  // Project notes shown with the result (offer warning, technology fallback, left-out modules).
  function aplusNotes(job){return Array.isArray(job?.aplus?.notes)?job.aplus.notes.filter(n=>typeof n==='string'&&n.trim()):[];}
  staticRecipes[6].fields[0][3]=[...aplusPresetNames,'Custom modules',...Object.keys(amazonTemplates).filter(k=>!amazonTemplates[k].page)];
  function amazonImageSlots(t,values={}){
    if(!t.repeat)return t.parts;
    const count=Number(values.imageCount||t.defaultCount);if(!Number.isInteger(count)||count<t.range[0]||count>t.range[1])return [];
    if(t.repeat==='columns')return Array.from({length:count},(_,i)=>['Column '+(i+1),300,225]);
    if(t.repeat==='panels')return Array.from({length:count},(_,i)=>[['Panel '+(i+1)+' desktop',t.id==='premium-media-carousel'?800:1464,600],['Panel '+(i+1)+' mobile',600,450]]).flat();
    return [['Desktop hotspot base',1464,600],...Array.from({length:count},(_,i)=>['Hotspot '+(i+1)+' mobile detail',600,450])];
  }
  function applyAmazonPreset(o,name){
    const t=amazonTemplates[name];if(o.featureId!==6||!t)throw Error('Choose a supported Amazon image preset.');
    const old=staticParts(o),same=o.staticValues?.amazonPreset===name;if(!same&&o.staticValues)delete o.staticValues.imageCount;o.staticValues={...o.staticValues,amazonPreset:name,marketplace:'Amazon',template:name,eligibility:'Image-slot setup only; account eligibility and publishing are checked in Amazon.'};
    if(t.repeat&&!o.staticValues.imageCount)o.staticValues.imageCount=String(t.defaultCount);
    o.formatId='custom';o.width=t.parts[0][1];o.height=t.parts[0][2];
    o.staticParts=amazonImageSlots(t,o.staticValues).map(([name,width,height],i)=>({id:o.id+'-part-'+(i+1),name,width,height,copy:old[i]?.copy||'',alt:old[i]?.alt||'',visualIntent:old[i]?.visualIntent||''}));return o;
  }
  function staticRecipe(id){return staticRecipes[Number(id)]||null;}
  // Google card geometry is in DP; these export pixels are Studio starting canvases.
  const pushDestinations={'Android':'android','iPhone / iOS':'ios','Web':'web'};
  const pushPresets={'Landscape image · 2:1':[1024,512],'Square image · 1:1':[1038,1038],'Custom template':null};
  function pushImage(o){return o?.featureId===14&&o.staticValues?.channel==='Push';}
  function applyPushPreset(o,destination,preset){
    if(o.featureId!==14||!Object.hasOwn(pushDestinations,destination)||!Object.hasOwn(pushPresets,preset))throw Error('Choose a push destination and image template.');
    o.staticValues={...o.staticValues,channel:'Push',pushDestination:destination,pushPreset:preset};o.name=destination+' push image';o.formatId='custom';o.slides=1;
    if(pushPresets[preset])[o.width,o.height]=pushPresets[preset];return o;
  }
  function pushPreview(id){const m=String(id).match(/^custom[:_]push-image-(android|ios|web)-(\d+)x(\d+)$/);return m?{destination:m[1],width:Number(m[2]),height:Number(m[3])}:null;}
  const rcsPresets={
    'Single card · short image':{slug:'single-short',width:1400,height:400,previewWidth:360,mediaHeight:112},
    'Single card · medium image':{slug:'single-medium',width:1260,height:540,previewWidth:360,mediaHeight:168},
    'Single card · tall image':{slug:'single-tall',width:1200,height:800,previewWidth:360,mediaHeight:264},
    'Carousel small · short image':{slug:'carousel-small-short',width:720,height:448,previewWidth:180,mediaHeight:112,carousel:true},
    'Carousel small · medium image':{slug:'carousel-small-medium',width:720,height:672,previewWidth:180,mediaHeight:168,carousel:true},
    'Carousel medium · short image':{slug:'carousel-medium-short',width:1184,height:448,previewWidth:296,mediaHeight:112,carousel:true},
    'Carousel medium · medium image':{slug:'carousel-medium-medium',width:1184,height:672,previewWidth:296,mediaHeight:168,carousel:true},
    'Carousel medium · tall image':{slug:'carousel-medium-tall',width:1184,height:1056,previewWidth:296,mediaHeight:264,carousel:true}
  };
  function rcsImage(o){return o?.featureId===14&&o.staticValues?.channel==='RCS';}
  function rcsCount(o){const t=rcsPresets[o.staticValues?.rcsPreset];return !t?0:!t.carousel?1:Number(o.staticValues.cardCount);}
  function applyRcsPreset(o,name){
    const t=rcsPresets[name];if(o.featureId!==14||!t)throw Error('Choose an RCS image preset.');
    o.staticValues={...o.staticValues,channel:'RCS',rcsPreset:name,cardCount:o.staticValues?.cardCount||'3'};
    o.name=t.carousel?'RCS carousel images':'RCS rich-card image';o.formatId='custom';o.slides=1;o.width=t.width;o.height=t.height;
    const count=rcsCount(o);if(!Number.isInteger(count)||count<1||count>10)throw Error('Choose 2–10 carousel cards.');
    const old=o.staticParts||[];o.staticParts=Array.from({length:Math.max(old.length,count)},(_,i)=>({...old[i],id:old[i]?.id||o.id+'-rcs-'+(i+1),name:old[i]?.name||'Card '+(i+1),visualIntent:old[i]?.visualIntent||'',width:t.width,height:t.height}));return o;
  }
  function rcsPreview(id){const m=String(id).match(/^custom[:_]rcs-image-([a-z-]+)-\d+$/);return m?Object.values(rcsPresets).find(t=>t.slug===m[1])||null:null;}
  const emailPresets={'Email hero':[1200,600],'Email header / banner':[1200,400],'Custom email image':null};
  function emailImage(o){return o?.featureId===14&&o.staticValues?.channel==='Email';}
  function applyEmailPreset(o,name){
    if(o.featureId!==14||!Object.hasOwn(emailPresets,name))throw Error('Choose an email image preset.');
    o.staticValues={...o.staticValues,channel:'Email',emailPreset:name};o.name=name;o.formatId='custom';o.slides=1;
    if(emailPresets[name])[o.width,o.height]=emailPresets[name];return o;
  }
  function amazonImageTemplate(o){return o?.featureId===6?amazonTemplates[o.staticValues?.amazonPreset]||null:null;}
  function baseStaticRecipeForOutput(o){
    const base=staticRecipe(o.featureId),t=amazonImageTemplate(o);if(retailEntry(o))return retailRecipe(o);if(pushImage(o))return {story:'Create the picture attached to a push notification. Choose the destination and an image template. Presets are starting canvases, not universal operating-system requirements. Notification text, app icons and sending stay separate.',fields:[['pushDestination','Where will it appear?','select',Object.keys(pushDestinations)],['pushPreset','Image template','select',Object.keys(pushPresets)],['visualFocus','What should the image show?','textarea'],['templateContext','Notification service or template notes (optional)','textarea'],['fileLimitKb','Template file limit in KB (optional)'],['visualReferences','Visual direction or reference notes (optional)','textarea']],checks:['One recognisable subject even at small size','Important product details survive the chosen crop','No fake buttons or required message hidden inside the image'],handoff:'Download the image for your notification service. Preview crops are illustrative; device support, message text and sending are separate. An empty file limit means no provider limit has been supplied.'};if(rcsImage(o))return {part:'Card',story:'Create the image area of an RCS card. Choose a single card or ordered carousel. Titles, descriptions, buttons and sending stay separate. Canvas pixels are Studio presets; the destination card may centre-crop the image.',fields:[['rcsPreset','Card layout','select',Object.keys(rcsPresets)],...(rcsPresets[o.staticValues?.rcsPreset]?.carousel?[['cardCount','Number of cards','select',Array.from({length:9},(_,i)=>String(i+2))]]:[]),['visualFocus','What should the image or set show?','textarea'],['templateContext','Provider or template notes (optional)','textarea'],['visualReferences','Visual direction or reference notes (optional)','textarea']],checks:['Exact selected product is recognisable in each crop','Each card has a distinct purpose and the set stays consistent','Native buttons and message text are separate'],handoff:'Download each image or the complete ordered set. The preview illustrates centre cropping; it is not a sent or device-verified RCS message.'};if(emailImage(o))return {story:'Create an image for your email. Preset sizes are starting points; use Custom email image for an existing template. Email headings, buttons and body text stay separate.',fields:[['emailPreset','Image size','select',Object.keys(emailPresets)],['visualFocus','What should the image show?','textarea'],['templateContext','Where will it sit in the email? (optional)','textarea'],['visualReferences','Visual direction or reference notes (optional)','textarea']],checks:['Product details remain accurate','Subject is clear in the email column and on mobile','Crop fits the actual email template'],handoff:'Download the image for your email template. Writing and sending the email are separate.'};if(!t)return base;
    if(t.page)return {...base,part:'Image',story:t.instruction+(t.page==='brand-story'?' Choose Brand only when no specific product is needed.':' Use the selected saved product and exact variant.'),fields:[base.fields[0],['storyFocus','What should this A+ page help shoppers understand? (optional)','textarea'],['visualReferences','Visual direction or reference notes (optional)','textarea']],checks:['One story across every module','Short, large on-image text that reads on a phone','Exact product technology from the official product page','Every image at its own required size'],handoff:'Download every image at its Amazon size (PNG, or JPEG when a PNG is over 2 MB) with a copy deck of Amazon text fields and alt text. Uploading and Amazon approval happen separately.'};
    const question={feature:['featureFocus','Which feature should the image reveal?'],lifestyle:['useContext','What use or situation should the scene show?'],'brand-story':['brandIdea','What brand idea should these images communicate?']}[t.id]||['visualFocus','What should this module help shoppers see?'];
    return {...base,part:'Image',story:t.instruction+(t.id==='brand-story'?' Choose Brand only when no specific product is needed.':' Use the selected saved product and exact variant.'),fields:[base.fields[0],...(t.repeat?[['imageCount',t.repeat==='panels'?'Number of panels':t.repeat==='hotspots'?'Number of hotspots':'Number of columns','select',Array.from({length:t.range[1]-t.range[0]+1},(_,i)=>String(i+t.range[0]))]]:[]),...(t.id==='premium-background-text'?[['overlaySide','Side reserved for Amazon text','select',['Left','Right']]]:[]),[...question,'textarea'],['visualReferences','Visual direction or reference notes','textarea']],checks:['Image answers its intended visual purpose','Product details and brand references remain accurate','Every selected image slot is present at its own dimensions'],handoff:'Download the selected images as a set. Native Amazon text fields, interactive settings and publishing are separate.'};
  }
  // Requirement capture only: no copy or scene planning. Defaults never certify supplier acceptance.
  function assetValues(o,d={}){
    const v=o.staticValues||{},typed=String(d.brief||''),text=[typed,...(d.briefDocuments||[]).map(doc=>doc.text||'')].join('\n').replace(/(?:^|\n)\s*(?:exclusions?|avoid|do not include)\s*:[^\n]*/gi,'').replace(/\b(?:no|without)\s+(?:added\s+)?(?:prices?|offers?|promotions?|promotional(?:\s+copy)?|discounts?|qr(?:\s+codes?)?|contact(?:\s+details?)?)(?:\s+(?:or|and)\s+(?:prices?|offers?|discounts?))*\b/gi,'');
    const promotion=o.featureId===3||retailEntry(o)?.key==='price'||v.postType==='Offer'||v.screenType==='Offer'||(!/\b(?:no|without)\s+(?:price\s+or\s+)?(?:offers?|promotions?|discounts?)\b/i.test(typed)&&/\b(offer|discount|sale|promotion|promotional)\b|\d\s*%\s*off/i.test(text))||!!v.offer;
    const qr=!/\b(?:no|without)\s+qr\b/i.test(typed)&&/\bqr(?:\s+code)?\b/i.test(text),contact=/\b(?:phone\s*(?:number|no\.?)|telephone|mobile\s+number|call\s+us|helpline|toll[- ]free|customer\s+care\s+(?:number|no\.?|line)|contact\s+(?:details|information|number)|whatsapp\s+(?:us|number)|(?:store|shop|showroom|our|full|postal)\s+address|address\s*:)/i.test(text); // a phone *screen* is not a request for a phone number (8 Nov 2026)
    return {templateMode:'No template supplied',responsiveMode:'Current image only',specBasis:'Suggested preset',promotionMode:promotion?'Yes':'No',offerValidity:'Date range',contactMode:qr&&contact?'QR + contact':qr?'QR code':contact?'Contact details':'None',contactType:'Phone',...v};
  }
  function responsiveImage(o){return o?.featureId===7||emailImage(o);}
  function responsiveSlots(o){const v=assetValues(o);return responsiveImage(o)&&v.responsiveMode==='Desktop + mobile'?[['Desktop image',Number(o.width),Number(o.height)],['Mobile image',Number(v.mobileWidth),Number(v.mobileHeight)]]:[];}
  function staticRecipeForOutput(o,d={}){
    const base=baseStaticRecipeForOutput(o);if(!base)return base;
    const v=assetValues(o,d),e=retailEntry(o),fields=[...base.fields],add=(...rows)=>rows.forEach(row=>{const i=fields.findIndex(f=>f[0]===row[0]);if(i<0)fields.push(row);else fields[i]=row;});
    if(o.featureId===5){add(['pdpDestination','Where will this PDP set appear?','select',['Own website','Amazon','Other marketplace']]);if(v.pdpDestination==='Other marketplace')add(['marketplaceName','Which marketplace?']);add(['templateMode','Layout template / reference','select',['No template supplied','Attached reference','Template URL']]);if(v.templateMode==='Attached reference')add(['templateReferenceId','Choose an attached template','select',(d.references||[]).map(r=>r.id)]);if(v.templateMode==='Template URL')add(['templateUrl','Template / reference URL','url']);}
    if(responsiveImage(o)){add(['responsiveMode','Images to deliver','select',['Current image only','Desktop + mobile']]);if(v.responsiveMode==='Desktop + mobile')add(['mobileWidth','Mobile image width (px)','number'],['mobileHeight','Mobile image height (px)','number']);add(['specBasis','Dimensions are from','select',['Suggested preset','Supplied specification']]);if(v.specBasis==='Supplied specification')add(['specReference','Website / email template specification']);}
    if(o.featureId===11||e?.key==='screen'){add(['specBasis',e?.key==='screen'?'Canvas and player settings are from':'Print settings are from','select',['Suggested preset','Supplied specification']]);if(v.specBasis==='Supplied specification')add(['specReference',e?.key==='screen'?'Screen / player specification reference':'Printer specification / template reference']);}
    const aplus=aplusPage(o);
    add(['promotionMode',aplus?'Does this include an offer or price? (Amazon may reject prices or offers in A+ content)':'Does this include an offer or price promotion?','select',['No','Yes']]);
    if(v.promotionMode==='Yes'){add(['offer','Exact offer / price wording','textarea'],['offerSku','Applicable SKU / variants'],['offerValidity','Offer validity','select',['Date range','Ongoing — no end date']],['offerStart','Offer starts','date'],['terms','Conditions and exclusions (write “None” if none)','textarea']);if(v.offerValidity!=='Ongoing — no end date')add(['offerEnd','Offer ends','date']);}
    else for(const key of ['offer','offerSku','offerValidity','offerStart','offerEnd','terms']){const i=fields.findIndex(f=>f[0]===key);if(i>=0)fields.splice(i,1);}
    if(v.promotionMode==='Yes'&&v.offerValidity==='Ongoing — no end date'){const i=fields.findIndex(f=>f[0]==='offerEnd');if(i>=0)fields.splice(i,1);}
    // Amazon A+ never carries QR codes, links or contact details (9 Nov 2026): do not ask.
    if(!aplus)add(['contactMode','Include QR / contact information?','select',['None','QR code','Contact details','QR + contact']]);
    if(!aplus&&String(v.contactMode||'').includes('QR'))add(['qrDestination','Exact QR destination URL','url']);
    if(!aplus&&['Contact details','QR + contact'].includes(v.contactMode)){add(['contactType','Contact information','select',['Phone','Address','Phone + address']]);if(String(v.contactType||'').includes('Phone'))add(['contactPhone','Exact phone number']);if(String(v.contactType||'').toLowerCase().includes('address'))add(['contactAddress','Exact address','textarea']);}
    return {...base,fields};
  }
  function requiredAssetFields(o,d={}){
    if(d.id&&!(d.intakeVersion>=2)&&!['pdpDestination','responsiveMode','specBasis','promotionMode','contactMode','templateMode'].some(k=>o.staticValues?.[k]!==undefined))return baseRequiredAssetFields(o);
    const v=assetValues(o,d),keys=baseRequiredAssetFields(o).filter(k=>!['offer','offerStart','offerEnd','terms'].includes(k));
    if(o.featureId===5){keys.push('pdpDestination');if(v.pdpDestination==='Other marketplace')keys.push('marketplaceName');if(v.templateMode==='Attached reference')keys.push('templateReferenceId');if(v.templateMode==='Template URL')keys.push('templateUrl');}
    if(responsiveSlots(o).length)keys.push('mobileWidth','mobileHeight');
    if(v.specBasis==='Supplied specification')keys.push('specReference');
    if(v.promotionMode==='Yes'){keys.push('offer','offerSku','offerStart','terms');if(v.offerValidity!=='Ongoing — no end date')keys.push('offerEnd');}
    if(!aplusPage(o)&&String(v.contactMode||'').includes('QR'))keys.push('qrDestination');
    if(!aplusPage(o)&&['Contact details','QR + contact'].includes(v.contactMode)){if(String(v.contactType||'').includes('Phone'))keys.push('contactPhone');if(String(v.contactType||'').toLowerCase().includes('address'))keys.push('contactAddress');}
    return [...new Set(keys)];
  }
  // The module list a marketer confirms before submit: each module, its exact sizes and the image count.
  function aplusModuleRows(typeId){
    const s=aplusSummary(typeId);if(!s)return [];
    const size=i=>i.width+' × '+i.height+(i.device==='mobile'?' mobile':i.device==='desktop'?' desktop':'');
    return [s.name+' · '+s.moduleCount+' modules · '+s.imageCount+' images in one job',...s.modules.map(m=>m.textOnly?m.name+' · text only (no image)':m.name+' · '+(m.units.length>1?m.units.length+' × ':'')+[...new Set(m.images.map(size))].join(' + ')+(m.units.length>1?' each':'')),'Also delivered: Amazon text fields (headline and body per module) and alt text (100 characters or fewer) for every image','Files: PNG, or JPEG when a PNG is over 2 MB',...s.later.map(x=>'Left out for now · '+x)];
  }
  function assetRequirementSummary(o,d={}){
    const v=assetValues(o,d),a=amazonImageTemplate(o),e=retailEntry(o),p=e?.printId&&retailPrintPresets.find(p=>p.id===v.printPreset),rows=[];
    if(a?.page)rows.push(...aplusModuleRows(a.page));
    else if(a){rows.push(...amazonImageSlots(a,v).map(([name,w,h])=>name+' · '+w+' × '+h+' px'));if(!amazonImageSlots(a,v).some(([n])=>/mobile/i.test(n)))rows.push('Shared image slots for desktop and mobile; this module has no separate mobile image upload.');}
    if(responsiveImage(o)){rows.push(...(responsiveSlots(o).length?responsiveSlots(o).map(([name,w,h])=>name+' · '+(w&&h?w+' × '+h+' px':'size needed')):['1 image · '+o.width+' × '+o.height+' px']));}
    if(p)rows.push(p.pages+' flat faces / pages'+(p.print.fold!=='none'?' · '+p.print.fold+' fold; panels sit within these faces':''));
    if(p||e?.key==='screen'||responsiveImage(o))rows.push(v.specBasis==='Supplied specification'?'Supplied specification · '+(v.specReference||'add the specification reference'):'Suggested preset · editable assumptions, not supplier-approved specifications');
    if(o.featureId===5)rows.push('PDP destination · '+(v.pdpDestination||'Choose the destination'),v.templateMode==='No template supplied'?'No supplied template · strategy will propose the layout':'Template · '+(v.templateMode==='Attached reference'?(d.references||[]).find(r=>r.id===v.templateReferenceId)?.name||'Choose an attached reference':v.templateUrl||'Add the template URL'));
    if(!a?.page&&String(v.contactMode||'').includes('QR'))rows.push('QR destination is captured here. The final QR must be generated and scan-tested before delivery.');
    return rows;
  }

  const featureCoverage=features.map(f=>({id:f.id,name:f.name,scope:f.kind==='image'?'static':'deferred',workspace:workspaceFor(f.kind),story:staticRecipe(f.id)?.story||'Outside this static-studio pass.'}));
  function staticParts(o){if(rcsImage(o))return (o.staticParts||[]).slice(0,rcsCount(o));const r=staticRecipe(o.featureId);if(!r?.part)return [];const count=o.featureId===9?Math.min(12,Math.max(2,Math.trunc(Number(o.slides))||5)):(o.staticParts?.length||r.parts.length);return Array.from({length:count},(_,i)=>{const part=o.staticParts?.[i]||{id:o.id+'-part-'+(i+1),name:r.parts[i]||r.part+' '+(i+1),copy:'',alt:'',width:o.width,height:o.height};return o.featureId===6?part:{...part,width:o.width,height:o.height};});}

  // Adapted from Static Studio's field/progress patterns; all data stays in this Studio.
  const intakeOptions={themes:['Functional','Emotional','Tactical','Seasonal','Trends'],tonalities:['Direct','Celebratory','Sincere','Reminding','Regulatory']};
  function creativeCount(d){return 2;}
  function baseRequiredAssetFields(o){if(amazonImageTemplate(o)||retailEntry(o))return [];return ({2:['technology','source'],3:['offer','terms','offerStart','offerEnd','destination'],4:['claim','proof'],6:['marketplace','template','eligibility'],10:['storeName','address','destination'],12:['partner','partnerAsset','lockup','reviewer'],15:['articleTitle','facts']})[o.featureId]||[];}
  function productRtbSources(p){
    const facts=(Array.isArray(p?.features)?p.features:[]).map(v=>typeof v==='string'?v:v?.text||v?.description||'');
    for(const section of p?.contentSections||[]){const text=String(section.text||'');const explicit=/^features?$/i.test(section.heading||'')?text:text.match(/\bFeatures\s*\+\s*([\s\S]*?)(?:Product specifications\s*\+|Care instructions\s*\+|Delivery and returns\s*\+)/i)?.[1];if(explicit&&explicit.trim().length<=1500)facts.push(explicit.trim());}
    return [...new Set(facts.filter(v=>typeof v==='string'&&v.trim()))];
  }
  // Split only explicit list/sentence boundaries. Keep conditions with the preceding fact.
  function rtbItems(text){
    const items=String(text||'').split(/(?:\r?\n)+|[•●]\s*/).map(v=>v.trim().replace(/^[-–]\s+/, '')).filter(Boolean);
    return [...new Set(items)];
  }
  function featureItems(text){
    return rtbItems(text).flatMap(v=>v.split(/(?<=[.!?])\s+(?=[A-Z][a-z])/)).reduce((items,v)=>{
      if(items.length&&/^(?:Only|Except|Subject to|Provided|When|If|For|Under|With|Terms|Conditions|Depending|Based on)\b/i.test(v))items[items.length-1]+=' '+v;
      else items.push(v);return items;
    },[]);
  }
  function productRtbs(p){const structured=(Array.isArray(p?.features)?p.features:[]).map(v=>typeof v==='string'?v:v?.text||v?.description||'').filter(v=>v.trim());return [...new Set(structured.length?structured:productRtbSources(p).flatMap(featureItems))];}
  function selectBriefProduct(d,p,variant){
    if(!p||p.brandId!==d.brandId)throw Error('Product belongs to another brand.');
    const preserve=d.focus==='product'&&d.productId===p.id&&d.rtbProductId===p.id;
    Object.assign(d,{focus:'product',productId:p.id,productName:p.name,productUrl:p.pageUrl||'',variant,
      selectedRtbs:preserve?selectedProductRtbs(d,p):productRtbs(p),rtbProductId:p.id});
    protectBriefField(d,'productId');protectBriefField(d,'variant');
  }
  function selectedProductRtbs(d,p){
    if(d.focus!=='product'||d.rtbProductId!==d.productId)return [];
    const sources=productRtbSources(p),facts=productRtbs(p);
    return [...new Set((Array.isArray(d.selectedRtbs)?d.selectedRtbs:[]).flatMap(v=>facts.includes(v)?[v]:sources.includes(v)?(v.replace(/\s+/g,' ').trim()===facts.join(' ').replace(/\s+/g,' ').trim()?facts:featureItems(v)):[]))];
  }
  function suppliedRtbOptions(d){return [...new Set([...(Array.isArray(d.rtbOptions)?d.rtbOptions:[]),...rtbItems(d.rtbs)])];}
  // Local, evidence-based intake assistance. No model calls or automatic submissions.
  function briefUnderstanding(d,context={}){
    const normalize=v=>String(v||'').toLowerCase().replace(/(?<!\d)\.|\.(?!\d)/g,' ').replace(/[^a-z0-9.]+/g,' ').trim();
    const source=String(d.brief||''),positive=source.replace(/\bwithout\s+(?:any\s+)?(?:added\s+)?text\b/gi,'').split(/[;\n!?]+|\.(?!\d)/).filter(s=>! /\b(?:not|don't|do not|avoid|instead of|ignore)\b/i.test(s)).join(' '),hay=' '+normalize(positive)+' ';
    let matches=[];
    if(d.focus==='product'&&/\b(?:for|sku|product|mattress|sofa|bed|pillow)\b/i.test(positive)){
      matches=(context.products||[]).filter(p=>p.brandId===d.brandId).filter(p=>{
        const name=normalize(p.name),parts=name.replace(/^(?:sofa|duropedic|sleepyhead|duroflex) /,'').split(' '),alias=parts[0],escapedAlias=alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        const brandPrefix=normalize(p.brandName).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),prefix=brandPrefix?'(?:'+brandPrefix+'\\s+)?':'';
        return [name,normalize(p.sku)].some(x=>x.length>=4&&hay.includes(' '+x+' '))||(alias?.length>=3&&new RegExp('\\b(?:for|sku|product|sofa|mattress|bed|pillow)\\s+(?:(?:the|a|an|sku|product|sofa|mattress|bed|pillow)\\s+)*'+prefix+escapedAlias+'\\b','i').test(positive));
      });
      const exact=matches.filter(p=>[normalize(p.name),normalize(p.sku)].some(v=>v.length>=4&&hay.includes(' '+v+' ')));if(exact.length)matches=exact;
      // Prefer an explicitly supplied model phrase over a shared first-word alias.
      // Keep decimal model numbers intact so 6.8 cannot also match 6.9.
      if(!exact.length&&matches.length>1){
        const scored=matches.map(p=>{const parts=normalize(p.name).replace(/^(?:sofa|duropedic|sleepyhead|duroflex) /,'').split(' ');let score=0;for(let n=2;n<=parts.length;n++)if(hay.includes(' '+parts.slice(0,n).join(' ')+' '))score=n;return {p,score};});
        const best=Math.max(...scored.map(x=>x.score));if(best)matches=scored.filter(x=>x.score===best).map(x=>x.p);
      }
      const seating=positive.match(/\b(\d)\s*[- ]?\s*seater\b/i);if(seating){const narrowed=matches.filter(p=>new RegExp('\\b'+seating[1]+'\\s*seater\\b','i').test(normalize(p.name)));if(narrowed.length)matches=narrowed;}
      const mini=/\bmini\b/i.test(positive);if(mini&&matches.some(p=>/\bmini\b/i.test(p.name)))matches=matches.filter(p=>/\bmini\b/i.test(p.name));
    }
    const choices=[];
    if(/\b(?:instagram|facebook)\s+stor(?:y|ies)\b/i.test(positive))choices.push({featureId:8,label:'Instagram / Facebook Story',staticValues:{platform:/instagram/i.test(positive)?'Instagram':'Facebook'}});
    if(/\b(?:instagram|facebook|linkedin)\s+(?:\w+-?card\s+)?carousel\b|\bcarousel\b/i.test(positive))choices.push({featureId:9,label:/linkedin/i.test(positive)?'LinkedIn carousel':'Instagram / Facebook carousel',staticValues:{platform:/linkedin/i.test(positive)?'LinkedIn':'Instagram / Facebook'}});
    if(/\bpdp\b|\bproduct[- ]page (?:images?|set|pack)\b/i.test(positive))choices.push({featureId:5,label:'PDP image set',staticValues:{}});
    if(/\bemail\s+(?:hero|header|banner)\b/i.test(positive))choices.push({featureId:14,label:/email\s+hero/i.test(positive)?'Email hero':'Email header / banner',kind:'email',preset:/email\s+hero/i.test(positive)?'Email hero':'Email header / banner'});
    if(/\bwhatsapp\s+status\b/i.test(positive))choices.push({featureId:14,label:'WhatsApp Status',formatId:'story',width:1080,height:1920,staticValues:{channel:'WhatsApp'}});
    if(/\bstandee\b/i.test(positive))choices.push({featureId:11,label:'Standee',kind:'retail',preset:'standee'});
    const asset=choices.length===1?choices[0]:null;
    const sameAsset=asset&&d.outputs?.length===1&&d.outputs[0].featureId===asset.featureId&&(!asset.preset||(asset.kind==='email'?d.outputs[0].staticValues?.emailPreset:d.outputs[0].staticValues?.retailPreset)===asset.preset)&&(!asset.formatId||d.outputs[0].formatId===asset.formatId);
    return {productIds:matches.map(p=>p.id),asset:asset&&!sameAsset?asset:null,assetAmbiguous:choices.length>1};
  }
  function useBriefAsset(d,asset){
    if(!asset||d.creationMode!=='quick')return false;
    const o=output(asset.featureId);o.language=d.language||'English';
    if(asset.kind==='email')applyEmailPreset(o,asset.preset);else if(asset.kind==='retail')applyRetailPreset(o,asset.preset);else {o.staticValues={...o.staticValues,...asset.staticValues};if(asset.formatId)Object.assign(o,{formatId:asset.formatId,width:asset.width,height:asset.height});}
    // Keep the previous format's answers recoverable; never throw them away on a switch.
    (d.previousBriefOutputs??=[]).push(clone(d.outputs));d.outputs=[o];protectBriefField(d,'assetType');return true;
  }

  // Asset requirements are scoped to their own sentence/line; never plan scenes or copy here.
  function campaignAssetSegments(text){
    const segments=[];
    for(const line of text.split(/\n|;|\.(?:\s+|$)/).map(x=>x.trim()).filter(Boolean)){
      if(/^(?:expected delivery|exclusions|source basis)\s*:/i.test(line)||/\b(?:not|avoid|without|exclude|instead of|ignore)\b/i.test(line))continue;
      // PDFs can flatten lists into a single line. Split at asset names, not commas:
      // commas also separate a card count, ratio and dimensions belonging to one asset.
      const mentions=[...line.matchAll(/\b(?:(?:\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[ -]+(?:cards?|slides?)\s+)?(?:(?:instagram|facebook)\s+stor(?:y|ies)|(?:instagram|facebook|linkedin)\s+(?:\w+-?card\s+)?carousel|carousel|pdp|product[- ]page (?:images?|set|pack)|email\s+(?:hero|header|banner)|whatsapp\s+status|standee)\b/gi)];
      if(mentions.length<2){segments.push(line);continue;}
      for(let i=0;i<mentions.length;i++)segments.push(line.slice(i?mentions[i].index:0,mentions[i+1]?.index));
    }
    return segments;
  }
  function campaignBriefAssets(d,text){
    if(d.creationMode!=='campaign'||d.briefAutofill?.manual?.assetType)return [];
    const result=[],seen=new Set();
    for(const line of campaignAssetSegments(text)){
      const a=briefUnderstanding({...d,brief:line,outputs:[]}).asset;if(!a)continue;
      const key=[a.featureId,a.kind||'',a.preset||'',a.formatId||''].join(':');if(seen.has(key))continue;seen.add(key);
      const previous=(d.outputs||[]).find(o=>o.intakeAssetKey===key),o=output(a.featureId);o.id=previous?.id||o.id;o.intakeAssetKey=key;o.intakeExplicitFields=[];
      if(a.kind==='email')applyEmailPreset(o,a.preset);else if(a.kind==='retail')applyRetailPreset(o,a.preset);else {o.staticValues={...o.staticValues,...a.staticValues};if(a.formatId)Object.assign(o,{formatId:a.formatId,width:a.width,height:a.height});}
      o.intakeExplicitFields.push(...Object.keys(a.staticValues||{}).map(k=>'static:'+k));if(a.kind==='email')o.intakeExplicitFields.push('static:emailPreset');
      const size=line.match(/\b(\d{2,5})\s*[x×]\s*(\d{2,5})\s*(?:px|pixels)\b/i);
      if(size&&+size[1]>0&&+size[2]>0){o.intakeExplicitFields.push('formatId','width','height');o.width=+size[1];o.height=+size[2];o.formatId=formats.find(f=>f.w===o.width&&f.h===o.height)?.id||'custom';}
      if(o.featureId===9){const n=line.match(/\b(\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[ -]+(?:cards?|slides?)\b/i);if(n){const count=Number(n[1])||['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'].indexOf(n[1].toLowerCase());if(count>=2&&count<=12){o.slides=count;o.intakeExplicitFields.push('slides');}}}
      o.language=d.language||'English';result.push(o);
    }
    return result;
  }

  // Extract assignment facts only. Missing audience, response or support stays
  // missing; this does not invent a sales objective, claim, scene or headline.
  function communicationParts(message){
    const text=String(message||''),parts={};
    for(const m of text.matchAll(/^(GET|TO|BY) — ([\s\S]*?)(?=\n(?:GET|TO|BY) — |(?![\s\S]))/gmi))parts[m[1].toLowerCase()]=m[2];
    if(!Object.keys(parts).length&&text.trim()){const match=text.match(/^get\s+(.+?)\s+to\s+(.+?)\s+by\s+(.+)$/is);if(match)[parts.get,parts.to,parts.by]=match.slice(1);else parts.to=text;}
    return parts;
  }
  function communicationText(parts){return ['get','to','by'].filter(k=>String(parts[k]||'').trim()).map(k=>k.toUpperCase()+' — '+String(parts[k]).trim()).join('\n');}
  function migrateCommunicationGoal(d){
    const a=d.briefAutofill,old=a?.owned?.message;if(!old)return;
    if(a.manual?.message||d.message!==old.value){protectBriefField(d,'message');return;}
    const before=communicationParts(old.before),parts=communicationParts(old.value);
    delete a.owned.message;
    for(const part of ['get','to','by'])if(parts[part])a.owned['message:'+part]={...old,value:parts[part],before:before[part]||''};
  }
  function syncCommunicationGoal(d,context={},parsed){
    if(!(d.intakeVersion>=2))return [];
    const a=d.briefAutofill??={version:1,enabled:true,owned:{},manual:{}};a.owned??={};a.manual??={};
    if(a.enabled===false||a.undoneBrief===autofillSignature(d))return [];
    migrateCommunicationGoal(d);if(a.manual.message)return [];
    parsed??=briefAutofillCandidates(d,context);
    const record=parsed.fields.message,explicit=communicationParts(record?.value),candidates={},changed=[];
    const add=(part,value,source,evidence)=>{if(typeof value==='string'&&value.trim()&&value.length<=1800)candidates[part]={value:value.trim(),source,evidence,label:'Communication goal'};};
    if(!parsed.ambiguous.includes('message')){
      for(const part of ['get','to','by'])if(explicit[part])add(part,explicit[part],record.source,record.evidence);
      if(a.manual.audience)delete candidates.get;
      if((!explicit.get||a.manual.audience)&&!parsed.ambiguous.includes('audience'))add('get',d.audience,'selection','Selected audience');
      // A default objective is not an instruction. Use only an explicit choice
      // or extracted objective, and retain a more specific response from the brief.
      if(!explicit.to&&!parsed.ambiguous.includes('objective')&&(a.manual.objective||a.owned.objective||d.objective!==newDraft(d.brandId).objective)){
        const subject=d.focus==='product'?'the product':d.focus==='collection'?'the collection':'the brand';
        const response={Awareness:'become aware of '+subject,Consideration:'consider '+subject,Purchase:'make a purchase',Engagement:'engage with '+subject,Education:'learn about '+subject}[d.objective];
        add('to',response,'selection','Selected objective: '+d.objective);
      }
      if(!explicit.by){
        const product=(context.products||[]).find(p=>p.brandId===d.brandId&&p.id===d.productId);
        const facts=[...new Set([...selectedProductRtbs(d,product),...rtbItems(d.rtbs)])];
        if(facts.length)add('by','highlighting '+facts.join('; '),'selection','Selected features; exact wording and qualifiers retained');
      }
    }
    for(const part of ['get','to','by']){
      const key='message:'+part,current=autofillValue(d,key),owned=a.owned[key],candidate=candidates[part];
      if(a.manual[key])continue;
      if(owned&&current!==owned.value){protectBriefField(d,key);continue;}
      if(!candidate){if(owned){if(current!==owned.before){autofillValue(d,key,owned.before,true);changed.push(key);}delete a.owned[key];}continue;}
      // An existing unowned goal is user content, even on older saved drafts.
      if(!owned&&current)continue;
      if(current!==candidate.value){autofillValue(d,key,candidate.value,true);changed.push(key);}
      a.owned[key]={...candidate,before:owned?owned.before:current};
    }
    a.labels=[...new Set(Object.values(a.owned).map(r=>r.label))];return changed;
  }
  function draftAutosaveReady(d,prior,context={}){return !!(prior&&!prior.recoveryOnly)||intakeProgress(d,context).percent>=80;}
  function communicationFramework(text){
    const values={},conflicts=new Set(),evidence=[];
    const put=(key,value,source)=>{value=String(value||'').trim().replace(/[.,]+$/,'');if(!value||value.length>1800)return;if(values[key]&&values[key].toLowerCase()!==value.toLowerCase()){delete values[key];conflicts.add(key);}else if(!conflicts.has(key)){values[key]=value;evidence.push(source);}};
    const segments=String(text||'').slice(0,100000).split(/(?:[;\n!?]+|\.(?:\s+|$))/).map(s=>s.trim()).filter(Boolean);
    for(const s of segments){
      if(/\b(?:not|don't|do not|avoid|without|instead of|ignore)\b/i.test(s))continue;
      const sentence=s.match(/^get\s+(.+?)\s+to\s+(.+?)\s+by\s+(.+)$/i);
      if(sentence){['get','to','by'].forEach((key,i)=>put(key,sentence[i+1],s));continue;}
      const label=s.match(/^(get|audience|target audience|to|desired response|desired action|communication goal|by|message|key message)\s*:\s*(.+)$/i);
      if(label){put(/^(get|audience|target audience)$/i.test(label[1])?'get':/^(to|desired response|desired action|communication goal)$/i.test(label[1])?'to':'by',label[2],s);continue;}
      const audience=s.match(/\b(?:for|targeting|aimed at)\s+((?:people|parents|families|students|working professionals|young professionals|first[- ]time homeowners|new homeowners|homeowners|shoppers|customers|adults|couples)\b.*?)(?=\s+(?:to\s+(?:feel|consider|buy|explore|discover|understand|learn|choose|visit|shop)|by\s+|highlighting\s+|focusing\s+)|[,\n]|$)/i);
      if(audience)put('get',audience[1],s);
      const response=s.match(/\bto\s+((?:feel|consider|buy|explore|discover|understand|learn|choose|visit|shop|sign up|enquire|remember|recognise|recognize)\b.+?)(?=\s+(?:by|highlighting|focusing)\b|$)/i);
      if(response)put('to',response[1],s);
      const goal=s.match(/\b((?:build|create|drive|increase|raise)\s+(?:excitement|awareness|interest|consideration|enquiries|inquiries|sales|engagement)\b.*?)(?=\s+(?:by|highlighting|focusing)\b|$)/i);
      if(goal&&!response)put('to',goal[1],s);
      const support=s.match(/\b((?:highlighting|emphasising|emphasizing|showcasing|focusing(?:\s+on)?)\s+.+)$/i);
      if(support){const emotion=support[1].match(/^focusing(?:\s+on)?\s+(?:the\s+)?(.+?)\s+excitement$/i);if(emotion)put('to','feel excited about '+emotion[1],s);else put('by',support[1],s);}
    }
    return {values,conflicts:[...conflicts],evidence:[...new Set(evidence)],text:['get','to','by'].filter(k=>values[k]).map(k=>k.toUpperCase()+' — '+values[k]).join('\n')};
  }
  function briefAutofillCandidates(d,context={}){
    if(!context.documentPass&&(d.briefDocuments||[]).some(x=>x.text)){
      const documents=briefAutofillCandidates({...d,brief:(d.briefDocuments||[]).map(x=>x.text||'').join('\n')},{...context,documentPass:true});
      const typed=briefAutofillCandidates(d,{...context,documentPass:true});
      for(const item of Object.values(documents.fields))item.source='document';
      const fields={...documents.fields,...typed.fields};for(const k of typed.ambiguous)delete fields[k];
      // A short typed correction can replace one part without losing the
      // audience or purpose supplied in the uploaded document.
      const parts=record=>Object.fromEntries([...String(record?.value||'').matchAll(/^(GET|TO|BY) — (.+)$/gm)].map(m=>[m[1],m[2]]));
      if(!typed.ambiguous.includes('message')&&documents.fields.message&&typed.fields.message){const doc=parts(documents.fields.message),input=parts(typed.fields.message);if(Object.keys(doc).length&&Object.keys(input).length){const merged={...doc,...input};fields.message={value:['GET','TO','BY'].filter(k=>merged[k]).map(k=>k+' — '+merged[k]).join('\n'),evidence:documents.fields.message.evidence+'\n'+typed.fields.message.evidence,label:'Communication goal',source:'mixed'};}}
      return {fields,ambiguous:[...new Set([...documents.ambiguous.filter(k=>!typed.fields[k]),...typed.ambiguous])]};
    }
    const text=String(d.brief||'').slice(0,100000),found={},ambiguous=new Set();
    const segments=text.replace(/\bwithout\s+(?:any\s+)?(?:added\s+)?text\b/gi,'').split(/(?:[;\n!?]+|\.(?:\s+|$))/).map(s=>s.trim()).filter(s=>s&&!/\b(?:not|don't|do not|avoid|without|instead of|ignore)\b/i.test(s));
    const add=(key,value,evidence,label=key)=>{if(value==null||value==='')return;const next={value,evidence,label};if(found[key]&&JSON.stringify(found[key].value)!==JSON.stringify(value)){delete found[key];ambiguous.add(key);}else if(!ambiguous.has(key))found[key]=next;};
    const labels={audience:['audience','target audience','who is it for'],markets:['markets','market','locations','cities'],customerAge:['age','ages','customer age','age group'],rtbs:['rtb','rtbs','reasons to believe'],message:['message','key message'],backgroundBrief:['background','customer insight'],additionalDetails:['additional details'],people:['people'],lighting:['lighting'],setting:['setting']};
    const entries=[];for(const seg of segments){const m=seg.match(/^([^:]{2,60}):\s*(.+)$/);if(m)entries.push({key:m[1].trim().toLowerCase(),value:m[2].trim(),evidence:seg});}
    for(const [key,aliases]of Object.entries(labels)){for(const e of entries)if(aliases.includes(e.key)){const choices={people:['Include people','Product only'],lighting:['Daylight','Evening','Studio lighting','Festive lighting'],setting:['Home interior','Studio','Outdoors','Conceptual']}[key];const value=choices?choices.find(x=>x.toLowerCase()===e.value.toLowerCase()):key==='customerAge'?e.value.replace(/^(\d{1,2})\s*(?:-|to)\s*(\d{1,2})$/i,'$1–$2'):e.value;if(value)add(key,value,e.evidence,key==='rtbs'?'RTBs':key);}}
    for(const seg of segments){
      for(const language of languages){const escaped=language.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(new RegExp('(?:\\b(?:in|language)\\s*:?\\s*)'+escaped+'\\b|\\b'+escaped+'\\s+(?:(?:Instagram|Facebook|LinkedIn|WhatsApp|social|website|email)\\s+)?(?:posts?|carousels?|stories|story|creatives?|banners?|copy|ads?)\\b','i').test(seg))add('language',language,seg,'Language');}
      const range=seg.match(/\b(?:aged?|ages)\s*:?\s*(\d{1,2})\s*(?:[-–]|to)\s*(\d{1,2})\b/i);if(range&&+range[1]<=+range[2])add('customerAge',range[1]+'–'+range[2],seg,'Age');
      const count=seg.match(/\b(one|two|1|2)\s+(?:creative\s+)?(?:options?|creatives?|concepts?|sets?)\b/i);if(count)add('creativeCount',2,seg,'Two complete options');
      for(const [stage,objective]of [['TOFU','Awareness'],['MOFU','Consideration'],['BOFU','Purchase']])if(new RegExp('\\b'+stage+'\\b','i').test(seg)){add('funnelStage',stage,seg,'Funnel stage');add('objective',objective,seg,'Objective');}
      const objective=seg.match(/\b(?:objective|goal)\s*:\s*(awareness|consideration|purchase|engagement|education)\b/i);if(objective)add('objective',objective[1][0].toUpperCase()+objective[1].slice(1).toLowerCase(),seg,'Objective');
    }
    for(const seg of segments){if(found.language||/\b(?:in|language)\b/i.test(seg)){const mentioned=languages.filter(l=>new RegExp('\\b'+l+'\\b','i').test(seg));if(mentioned.length>1){delete found.language;ambiguous.add('language');}}}
    for(const [key,aliases,choices]of [['themes',['theme','themes'],intakeOptions.themes],['tonalities',['tone','tonality'],intakeOptions.tonalities]])for(const e of entries)if(aliases.includes(e.key)){const parts=e.value.split(/,|\band\b/i).map(v=>v.trim().toLowerCase()),values=parts.map(v=>choices.find(c=>c.toLowerCase()===v));if(values.length&&values.every(Boolean))add(key,values,e.evidence,key==='themes'?'Themes':'Tonality');}
    if(d.focus==='product')for(const e of entries.filter(e=>['product','sku'].includes(e.key))){const q=e.value.toLowerCase(),matches=(context.products||[]).filter(p=>p.brandId===d.brandId&&(p.name?.toLowerCase()===q||p.sku?.toLowerCase()===q||(q.length>=4&&p.name?.toLowerCase().includes(q))));if(matches.length===1)add('productId',matches[0].id,e.evidence,'Saved product');}
    if(d.outputs?.length===1){const o=d.outputs[0];for(const [key,label,type='text',choices]of staticRecipeForOutput(o,d)?.fields||[]){
      // Structural presets and pack sizes always remain explicit selections.
      if(/preset|count|width|height|ratio|platform|type/i.test(key))continue;
      for(const e of entries)if([key.toLowerCase(),label.toLowerCase()].includes(e.key)){let value=e.value;if(type==='select')value=choices?.find(v=>v.toLowerCase()===value.toLowerCase());if(type==='number'&&(!Number.isFinite(+value)||+value<=0))continue;if(type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(value))continue;if(type==='url'){try{if(!['http:','https:'].includes(new URL(value).protocol))continue;}catch{continue;}}if(value)add('static:'+o.id+':'+key,value,e.evidence,label);}
    }}
    if(d.intakeVersion>=2){
      for(const seg of text.split(/[;\n]+/)){if(/\b(?:no added text|no text|without (?:added )?text)\b/i.test(seg))add('wordingMode','none',seg,'Wording mode');if(/\bwrite (?:the )?(?:wording|copy|headlines?) for me\b/i.test(seg))add('wordingMode','write',seg,'Wording mode');}
      for(const e of entries){const key=({'supplied wording':'suppliedWording','mandatory information':'mandatoryInfo','occasion':'occasion','exclusions':'exclusions'})[e.key];if(key){add(key,e.value,e.evidence,e.key);if(key==='suppliedWording')add('wordingMode','supplied',e.evidence,'Wording mode');}}
      const normal=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
      if(d.focus==='product')for(const seg of segments){const hay=' '+normal(seg)+' ';const matches=(context.products||[]).filter(p=>p.brandId===d.brandId&&[p.name,p.sku,String(p.name||'').replace(/\s+(mattress|sofa|bed|pillow)s?$/i,'')].some(v=>normal(v).length>=5&&hay.includes(' '+normal(v)+' ')));if(matches.length===1)add('productId',matches[0].id,seg,'Saved product');else if(matches.length>1){delete found.productId;ambiguous.add('productId');}}
      if(d.outputs?.length===1&&d.outputs[0].featureId===9){const o=d.outputs[0],words=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];for(const seg of segments){const m=seg.match(/\b(\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[ -]+(?:(?:Instagram|Facebook|LinkedIn)\s+)?(?:carousel\s+)?(?:card|slide)s?\b/i);if(m){const n=Number(m[1])||words.indexOf(m[1].toLowerCase());if(n>=2&&n<=12)add('out:'+o.id+':slides',n,seg,'Number of cards');}for(const [pattern,value]of [[/\b(?:Instagram|Facebook)\b/i,'Instagram / Facebook'],[/\bLinkedIn\b/i,'LinkedIn']])if(pattern.test(seg))add('static:'+o.id+':platform',value,seg,'Channel');}}
    }
    if(d.intakeVersion>=2){const understood=briefUnderstanding(d,context);if(understood.productIds.length===1)add('productId',understood.productIds[0],text,'Saved product');else if(understood.productIds.length>1){delete found.productId;if(d.briefAutofill?.manual?.productId&&understood.productIds.includes(d.productId))ambiguous.delete('productId');else ambiguous.add('productId');}
      for(const seg of segments){const occasion=seg.match(/\b(diwali|christmas|new year|festive)\b/i);if(occasion&&!found.occasion)add('occasion',occasion[1].replace(/\b\w/g,c=>c.toUpperCase()),seg,'Occasion');}
      const o=d.outputs?.length===1&&d.outputs[0];if(o?.featureId===8)for(const seg of segments){const platform=seg.match(/\b(instagram|facebook)\s+stor(?:y|ies)\b/i);if(platform)add('static:'+o.id+':platform',platform[1][0].toUpperCase()+platform[1].slice(1).toLowerCase(),seg,'Channel');}
    }
    if(d.intakeVersion>=2){
      const assets=campaignBriefAssets(d,text);if(assets.length)add('outputs',assets,text,'Asset types and sizes');
      const product=(context.products||[]).find(p=>p.brandId===d.brandId&&p.id===(found.productId?.value||d.productId));
      for(const e of entries.filter(e=>['sku','variant'].includes(e.key))){const matches=(product?.variants||[]).filter(v=>[v.sku,v.name].some(x=>x&&x.toLowerCase()===e.value.toLowerCase()));if(matches.length===1)add('variant',String(matches[0].id),e.evidence,'Product variant');}
    }
    if(d.intakeVersion>=2){const goal=communicationFramework(text);if(goal.text&&!goal.conflicts.length&&!ambiguous.has('message')){delete found.message;add('message',goal.text,goal.evidence.join('\n'),'Communication goal');if(goal.values.get&&!found.audience&&!ambiguous.has('audience'))add('audience',goal.values.get,goal.evidence.join('\n'),'Audience');}else if(goal.conflicts.length){delete found.message;ambiguous.add('message');}}
    // Conflicting funnel/objective instructions need a human choice.
    if(ambiguous.has('funnelStage')||ambiguous.has('objective')){delete found.funnelStage;delete found.objective;}
    return {fields:found,ambiguous:[...ambiguous]};
  }
  function autofillValue(d,key,value,write=false){if(key.startsWith('message:')){const part=key.slice(8),parts=communicationParts(d.message);if(write){parts[part]=value;d.message=communicationText(parts);}return parts[part]||'';}if(key.startsWith('detail.')){if(write)(d.details??={})[key.slice(7)]=value;return d.details?.[key.slice(7)];}const [kind,id,field,partKey]=key.split(':');if(kind==='part'){const o=d.outputs?.find(o=>o.id===id),p=o&&staticParts(o).find(p=>p.id===field);return p?.[partKey];}if(kind==='static'||kind==='out'){const o=d.outputs?.find(o=>o.id===id);if(!o)return;const host=kind==='static'?(o.staticValues??={}):o;if(write)host[field]=value;return host[field];}if(write)d[key]=value;return d[key];}
  function protectBriefField(d,key){const a=d.briefAutofill??={version:1,enabled:true,owned:{},manual:{}};if(a.owned[key]||(key==='assetType'&&a.owned.outputs)){try{if(typeof window!=='undefined')window.CreativeTracking?.autofillCorrection?.(d,key);}catch{}}a.manual[key]=true;delete a.owned[key];if(key==='message')for(const part of ['get','to','by'])delete a.owned['message:'+part];if(key==='assetType'){a.manual.outputs=true;delete a.owned.outputs;}a.labels=[...new Set(Object.values(a.owned).map(r=>r.label))];}
  function autofillSignature(d){return d.brief+(d.briefDocuments?.length?'\n'+JSON.stringify(d.briefDocuments.map(x=>[x.id,x.text])):'')+(d.intakeVersion>=2?'\n'+JSON.stringify([d.audience||'',d.objective||'',d.focus,d.productId,d.rtbProductId,d.selectedRtbs||[],d.rtbs||'']):'');}
  function applyBriefAutofill(d,context={}){
    const a=d.briefAutofill??={version:1,enabled:true,owned:{},manual:{}};if(a.enabled===false||a.undoneBrief===autofillSignature(d))return [];
    const parsed=briefAutofillCandidates(d,context),candidates={...parsed.fields},defaults=newDraft(d.brandId),changed=[];
    if(d.intakeVersion>=2){migrateCommunicationGoal(d);delete candidates.message;}
    const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),set=(key,value)=>{if(!same(autofillValue(d,key),value)){autofillValue(d,key,clone(value),true);changed.push(key);}};
    // Retract only values that are still owned by autofill; manual corrections survive.
    for(const [key,record]of Object.entries(a.owned)){if(d.intakeVersion>=2&&key.startsWith('message:'))continue;if(!(key.startsWith('out:')&&key.endsWith(':language'))&&!(key in candidates)){if(!a.manual[key]&&same(autofillValue(d,key),record.value))set(key,record.before);delete a.owned[key];}}
    for(const [key,c]of Object.entries(candidates)){if(a.manual[key])continue;const current=autofillValue(d,key),owned=a.owned[key];if(owned&&!same(current,owned.value)){protectBriefField(d,key);continue;}if(!owned&&current!=null&&current!==''&&!(Array.isArray(current)&&!current.length)&&!same(current,key.startsWith('out:')?output(d.outputs.find(o=>o.id===key.split(':')[1])?.featureId)[key.split(':')[2]]:defaults[key]))continue;const before=owned?owned.before:current===undefined?null:clone(current);set(key,c.value);a.owned[key]={...c,before};}
    if(changed.includes('productId')){const p=(context.products||[]).find(p=>p.id===d.productId&&p.brandId===d.brandId);d.productName=p?.name||'';d.productUrl=p?.pageUrl||'';if(!candidates.variant||a.manual.variant)d.variant=p?.variants?.length===1?p.variants[0].id:'';d.selectedRtbs=[];d.rtbProductId=d.productId;}
    // Keep language in the actual per-output contract, while respecting edited outputs.
    for(const o of d.outputs||[]){const key='out:'+o.id+':language',owned=a.owned[key];if(a.manual[key])continue;if(a.owned.language){if(!owned&&o.language!=='English'&&o.language!==d.language)continue;if(owned&&!same(o.language,owned.value))continue;const before=owned?owned.before:o.language;set(key,d.language);a.owned[key]={value:d.language,before,label:'Asset language',evidence:a.owned.language.evidence,source:a.owned.language.source};}else if(owned){if(same(o.language,owned.value))set(key,owned.before);delete a.owned[key];}}
    if(a.owned.outputs&&!a.manual.outputs)a.owned.outputs.value=clone(d.outputs);
    changed.push(...syncCommunicationGoal(d,context,parsed));
    a.ambiguous=parsed.ambiguous;a.labels=[...new Set(Object.values(a.owned).map(r=>r.label))];return changed;
  }
  function undoBriefAutofill(d,context={}){const a=d.briefAutofill;if(!a)return;for(const [key,r]of Object.entries(a.owned))if(!a.manual[key]&&JSON.stringify(autofillValue(d,key))===JSON.stringify(r.value))autofillValue(d,key,clone(r.before),true);if(a.owned.productId){const p=(context.products||[]).find(p=>p.id===d.productId&&p.brandId===d.brandId);d.productName=p?.name||'';d.productUrl=p?.pageUrl||'';d.variant=p?.variants?.length===1?p.variants[0].id:'';d.selectedRtbs=[];d.rtbProductId=d.productId;}a.owned={};a.labels=[];a.enabled=d.intakeVersion>=2;if(d.intakeVersion>=2)a.undoneBrief=autofillSignature(d);}
  // Only assignment data is confirmed. Save timestamps and UI assistance never invalidate it.
  function requirementSnapshot(d){const v=clone(d);for(const k of ['confirmedBrief','briefAutofill','updatedAt','revision','createdAt','status','submission','name','recoveryOnly'])delete v[k];return v;}
  function confirmRequirements(d){d.confirmedBrief={version:1,confirmedAt:new Date().toISOString(),requirements:requirementSnapshot(d)};return d.confirmedBrief;}
  function confirmationCurrent(d){return !!d.confirmedBrief&&JSON.stringify(d.confirmedBrief.requirements)===JSON.stringify(requirementSnapshot(d));}
  function fieldProvenance(d,key){const a=d.briefAutofill||{};if(key==='message'&&!a.owned?.message&&!a.manual?.message){const parts=['get','to','by'].map(p=>'message:'+p),records=parts.map(p=>a.owned?.[p]).filter(Boolean);if(parts.some(p=>a.manual?.[p]))return {label:'Your choice',kind:'manual'};if(records.length){const sources=new Set(records.map(r=>r.source||'brief'));return {label:sources.has('mixed')||(sources.has('document')&&sources.has('brief'))?'From brief & document':sources.size===1&&sources.has('document')?'From document':sources.size===1&&sources.has('selection')?'From your choices':'From your brief',kind:'brief'};}}if(a.owned?.[key]?.source==='selection')return {label:'From your choices',kind:'brief'};if(a.manual?.[key])return {label:'Your choice',kind:'manual'};if(a.owned?.[key]?.source==='mixed')return {label:'From brief & document',kind:'brief'};if(a.owned?.[key]||(key.startsWith('out:')&&key.endsWith(':language')&&a.owned?.language&&autofillValue(d,key)===d.language))return {label:(a.owned?.[key]?.source||(key.startsWith('out:')&&key.endsWith(':language')?a.owned?.language?.source:undefined))==='document'?'From document':'From your brief',kind:'brief'};const part=key.split(':'),imported=a.owned?.outputs?.value?.find(o=>o.id===part[1]),explicitKey=part[0]==='static'?'static:'+part[2]:part[2];if(imported?.intakeExplicitFields?.includes(explicitKey)&&JSON.stringify(autofillValue(d,key))===JSON.stringify(part[0]==='static'?imported.staticValues?.[part[2]]:imported[part[2]]))return {label:a.owned.outputs.source==='document'?'From document':'From your brief',kind:'brief'};if(d.intakeSuggestions?.[key]!==undefined&&JSON.stringify(d.intakeSuggestions[key])===JSON.stringify(autofillValue(d,key)))return {label:'Suggested',kind:'suggested'};if(['productId','variant','selectedRtbs'].includes(key)&&d.productId)return {label:'From library',kind:'library'};const bits=key.split(':');if(bits[0]==='static'&&['specBasis','responsiveMode','promotionMode','contactMode','templateMode','contactType','offerValidity'].includes(bits[2])){const o=d.outputs?.find(o=>o.id===bits[1]);if(o&&!o.staticValues?.[bits[2]]){const value=assetValues(o,d)[bits[2]],inferred=['promotionMode','contactMode'].includes(bits[2])&&value!=='No'&&value!=='None';const pattern=bits[2]==='promotionMode'?/\b(offer|discount|sale|promotion|promotional)\b|\d\s*%\s*off/i:/\b(qr|phone|address|contact)\b/i,typed=inferred&&pattern.test(d.brief||''),document=inferred&&!typed&&(d.briefDocuments||[]).some(doc=>pattern.test(doc.text||''));return {label:typed?'From your brief':document?'From document':'Default',kind:typed||document?'brief':'default'};}}const v=autofillValue(d,key);return v!=null&&v!==''?{label:'Default',kind:'default'}:{label:'Not specified',kind:'missing'};}
  function intakeContext(d,product){
    const selected=selectedProductRtbs(d,product);
    return [['Imported brief documents (source material; typed brief and manual choices take priority)',(d.briefDocuments||[]).filter(x=>x.text).map(x=>x.name+' ['+x.status+']').join('; ')],['Message type',messageTypes.includes(d.messageType)?d.messageType:''],['Wording on images',d.wordingMode==='none'?'No added wording. Preserve genuine product markings; do not create overlay text.':d.wordingMode==='supplied'?'Use only the supplied wording below, retaining all qualifiers.':d.wordingMode==='write'?'Develop wording during strategy and copy stages from the confirmed requirements.':'Follow the brief and selected format. Strategy and copy decide whether wording is needed; do not add text to an image-only format.'],['Supplied literal wording',d.wordingMode==='supplied'?d.suppliedWording:''],['Mandatory information',d.mandatoryInfo],['Occasion',d.occasion],['Exclusions',d.exclusions],['Funnel stage',d.funnelStage],['Customer age',d.customerAge],['Markets',d.markets],['Themes',(d.themes||[]).join(', ')],['Tonality',(d.tonalities||[]).join(', ')],['Background / customer insight',d.backgroundBrief],['Additional requirements',d.additionalDetails],['Selected saved product facts',selected.join('; ')],['User-supplied reasons to believe (retain qualifiers)',d.rtbs]].filter(([,v])=>typeof v==='string'&&v.trim()).map(([k,v])=>k+': '+v).join('\n');
  }
  function intakeProgress(d,context={}){
    const errors=validateBrief({...d,name:d.name||'New project'},{...context,purpose:'review'}),checks=[['brief',!!d.brief?.trim()],['outputs',!!d.outputs?.length&&!errors.outputs],['creativeCount',!errors.creativeCount]];
    if(d.focus==='product')checks.push(['productId',!!d.productId&&!errors.productId],['variant',!errors.variant]);
    if(d.focus==='collection')checks.push(['productIds',!errors.productIds]);
    for(const o of d.outputs||[]){checks.push(['output-'+o.id,!errors['output-'+o.id]]);for(const k of requiredAssetFields(o,d))checks.push(['static-'+o.id+'-'+k,!!String(assetValues(o,d)[k]||'').trim()]);}
    for(const k of Object.keys(errors))if(k!=='name'&&!checks.some(([key])=>key===k))checks.push([k,false]);
    const complete=checks.filter(([,ok])=>ok).length;return {complete,total:checks.length,percent:Math.round(complete/checks.length*100),errors};
  }
  function campaignValidation(d,context={}){
    const errors=validateBrief(d,context);
    if(d.outputs?.length>1)for(const key of Object.keys(errors))if(d.outputs.some(o=>key==='output-'+o.id||key.startsWith('static-'+o.id+'-')))delete errors[key];
    return errors;
  }
  function validateBrief(d,context={}){
    const errors=validate(d),products=context.products||[];
    if(d.briefDocuments&&(!Array.isArray(d.briefDocuments)||d.briefDocuments.length>20||d.briefDocuments.reduce((n,x)=>n+String(x?.text||'').length,0)>100000))errors.briefDocuments='Use up to 20 documents and 100,000 text characters in total.';
    for(const k of ['funnelStage','customerAge','markets','rtbs','backgroundBrief','additionalDetails','suppliedWording','mandatoryInfo','occasion','exclusions'])if(d[k]!=null&&(typeof d[k]!=='string'||d[k].length>6000))errors[k]='Keep '+k+' as text within 6,000 characters.';
    for(const k of ['themes','tonalities','selectedRtbs','rtbOptions'])if(d[k]!=null&&(!Array.isArray(d[k])||d[k].length>30||d[k].some(v=>typeof v!=='string'||v.length>2000)))errors[k]='Choose valid '+k+' values.';
    if(d.intakeVersion>=2&&d.focus==='product'&&context.purpose!=='preview'&&!selectedProductRtbs(d,products.find(p=>p.id===d.productId)).length&&!rtbItems(d.rtbs).length)errors.selectedRtbs='Select at least one feature or add a reason to believe for this product.';
    if(d.intakeVersion>=2&&context.purpose!=='preview'&&!['Awareness','Consideration','Purchase','Engagement','Education'].includes(d.objective))errors.objective='Choose an objective for this brief.';
    if(d.funnelStage&&!['TOFU','MOFU','BOFU'].includes(d.funnelStage))errors.funnelStage='Choose a supported funnel stage.';
    if(d.messageType!=null&&!messageTypes.includes(d.messageType))errors.messageType='Choose a supported message type.';
    if(![1,2].includes(creativeCount(d)))errors.creativeCount="Choose one or two design options. Each contains all requested designs.";
    if(d.intakeVersion>=1&&context.purpose!=='preview')for(const o of d.outputs||[])for(const k of requiredAssetFields(o,d))if(!String(assetValues(o,d)[k]||'').trim())errors['static-'+o.id+'-'+k]='Complete '+(staticRecipeForOutput(o,d)?.fields.find(f=>f[0]===k)?.[1]||k)+' for '+(o.name||features.find(f=>f.id===o.featureId)?.name||'this asset')+'.';
    if(d.intakeVersion>=2){if(d.wordingMode==='supplied'&&!d.suppliedWording?.trim())errors.suppliedWording='Add the exact wording you want to use.';if(!['preview','review'].includes(context.purpose)&&!confirmationCurrent(d))errors.confirmedBrief='Review and confirm the latest brief before continuing.';}
    if(d.focus==='product'&&d.productId){const p=products.find(p=>p.id===d.productId);if(!p)errors.productId='This saved product is unavailable. Choose a current product or add its name.';else if(p.variants?.length&&(!d.variant||!p.variants.some(v=>String(v.id)===String(d.variant))))errors.variant='Choose an exact product variant.';}
    if(d.focus==='collection'){if(!d.productIds?.length)errors.productIds='Choose at least one saved product for the collection.';else for(const id of d.productIds){const p=products.find(p=>p.id===id);if(!p||p.variants?.length&&!p.variants.some(v=>String(v.id)===String(d.collectionVariants?.[id])))errors.productIds='Choose available products and an exact variant for each.';}}
    if(d.productUrl&&d.focus==='product'&&context.brand?.brandUrl){try{const u=new URL(d.productUrl);if(u.protocol!=='https:'||u.hostname.replace(/^www\./,'')!==new URL(context.brand.brandUrl).hostname.replace(/^www\./,''))errors.productUrl='Use an official URL for '+(context.brand.name||'this brand')+'.';}catch{errors.productUrl='Enter a complete https:// product URL.';}}
    for(const o of d.outputs||[]){const values=assetValues(o,d),key='output-'+o.id;
      if(o.featureId===5&&values.templateMode==='Attached reference'&&!(d.references||[]).some(r=>r.id===values.templateReferenceId))errors['static-'+o.id+'-templateReferenceId']='Choose an attached template reference.';
      if(responsiveSlots(o).length&&!generationProfile({...d,outputs:[o]}))errors[key]='Supply valid desktop and mobile image sizes (64–8192 whole pixels).';if(values.promotionMode==='Yes'&&values.offerValidity!=='Ongoing — no end date'&&values.offerStart&&values.offerEnd&&values.offerEnd<values.offerStart)errors[key]='Offer end date must come after the start date.';
      const requirements=staticRecipeForOutput(o,d)?.fields||[];
      for(const [name,label,type,options] of requirements){if(['pdpDestination','templateMode','responsiveMode','specBasis','promotionMode','offerValidity','contactMode','contactType'].includes(name)&&values[name]&&!options.includes(values[name]))errors['static-'+o.id+'-'+name]='Choose '+label.toLowerCase()+'.';}
      if(values.promotionMode==='Yes')for(const name of ['offerStart',...(values.offerValidity==='Date range'?['offerEnd']:[])])if(values[name]&&(!/^\d{4}-\d{2}-\d{2}$/.test(values[name])||!Number.isFinite(Date.parse(values[name]))))errors['static-'+o.id+'-'+name]='Enter a valid date.';
      for(const [name,,type] of staticRecipeForOutput(o,d)?.fields||[]){if(!values[name])continue;if(type==='url'){try{const url=new URL(values[name]);if(!['https:','http:'].includes(url.protocol))throw Error();}catch{errors[key]='Use a complete http:// or https:// destination URL.';}}if(type==='number'&&(!Number.isFinite(Number(values[name]))||Number(values[name])<=0))errors[key]='Physical dimensions must be positive numbers.';}
      if(staticParts(o).some(p=>!Number.isInteger(Number(p.width))||!Number.isInteger(Number(p.height))||Number(p.width)<64||Number(p.height)<64||Number(p.width)>8192||Number(p.height)>8192))errors[key]='Item dimensions must be whole pixels between 64 and 8192.';
    }
    return errors;
  }
  function validate(d) {
    const errors={};
    if(!d.name?.trim()) errors.name='Give this project a name.';
    if(!d.brief?.trim()&&!(d.briefDocuments||[]).some(x=>x.text?.trim())) errors.brief='Tell us what you want to create.';
    if(d.creationMode==='quick'&&d.outputs?.length!==1)errors.outputs='Create design needs exactly one recipe.';
    if(!d.outputs?.length) errors.outputs='Add at least one deliverable.';
    if(d.focus==='product'&&!d.productId&&!d.productName?.trim()) errors.productName='Choose a saved product or add its name.';
    if(d.productUrl&&d.focus==='product') {try{const u=new URL(d.productUrl);if(u.protocol!=='https:')throw Error();}catch{errors.productUrl='Enter a complete https:// product URL.';}}
    for(const o of d.outputs||[]) {
      const f=features.find(f=>f.id===o.featureId);
      if(!f) {errors['output-'+o.id]='This deliverable is unavailable. Choose another.';continue;}
      if(['image','video','adapt'].includes(f.kind)&&(!Number.isInteger(o.width)||!Number.isInteger(o.height)||o.width<64||o.height<64||o.width>8192||o.height>8192)) errors['output-'+o.id]='Use whole-pixel dimensions between 64 and 8192.';
      if(f.id===9&&(!Number.isInteger(o.slides)||o.slides<2||o.slides>12)) errors['output-'+o.id]='Choose between 2 and 12 slides for this preview.';
      if(f.kind==='video'&&(!Number.isFinite(o.duration)||o.duration<1||o.duration>600)) errors['output-'+o.id]='Use a duration between 1 and 600 seconds for this preview.';
    }
    if(d.details?.offerStart&&d.details?.offerEnd&&d.details.offerEnd<d.details.offerStart)errors.offerEnd='End date must come after the start date.';
    return errors;
  }
  function requiredDetails(d) {return [...new Set((d.outputs||[]).flatMap(o=>features.find(f=>f.id===o.featureId)?.fields||[]))].filter(k=>fields[k]);}
  function units(d) {return (d.outputs||[]).reduce((n,o)=>n+(responsiveSlots(o).length?2:retailEntry(o)?(retailProfile(o)?.unitCount||1):rcsImage(o)?rcsCount(o):o.featureId===1&&o.staticValues?.platform==='PMax'?(generationProfile({focus:'product',outputs:[o]})?.unitCount||0):[5,6].includes(o.featureId)?staticParts(o).length:o.featureId===9?o.slides:1),0);}
  function creationSubstage(p){const stages=p.activeStages?.length?p.activeStages:[p.stage||p.progress?.stage||p.status];if(stages.some(s=>['generation','statics'].includes(s)))return 'Generating images';if(stages.some(s=>['review','quality'].includes(s)))return 'Checking images';if(stages.some(s=>['queued','preparing','brand','research','guardian','strategy','concepts','pdp-plan','collection-plan','copy','art','reconciliation'].includes(s)))return 'Planning';return '';}
  function isCorrecting(project){
    const units=project.componentRecovery?.units;
    if(!units?.length)return project.componentRecovery?.repairing>0;
    const placements=new Set((project.placements||[]).map(p=>p.id));
    return units.some(u=>u.status==='repairing'&&(!placements.size||placements.has(u.placementId)));
  }
  function status(project) {
    const attention=(detail,action='View details')=>({key:'attention',label:'Needs attention',tone:'amber',action,detail});
    if(project.loadError)return attention('We couldn’t load this project. Retry loading to see its saved work.','Retry loading');
    if(project.local||project.status==='draft')return {key:'draft',label:'Draft',tone:'purple',action:'Continue brief',detail:'Your brief is saved. Creation hasn’t started.'};
    if(isCorrecting(project))return {key:'creating',label:'Correcting',tone:'blue',action:'View progress',substage:'Repairing saved artwork',detail:'Correcting your design. Completed work is saved; progress updates automatically.'};
    if(project.stage==='recovering'&&['running','queued','preparing'].includes(project.status))return {key:'creating',label:'Recovering',tone:'blue',action:'View progress',substage:'Checking saved progress',detail:'The worker restarted. Checking saved requests before continuing.'};
    if(['running','queued','preparing'].includes(project.status))return {key:'creating',label:'Creating',tone:'blue',action:'View progress',substage:creationSubstage(project),detail:project.status==='queued'?'Waiting to start. Your request is saved.':'Work is progressing.'};
    if(['failed','partial','needs-input','cancelled','canceled','stopped','interrupted','paused'].includes(project.status))return attention(project.status==='needs-input'?'A detail is needed before creation can continue. Open the project to complete it.':project.status==='partial'?'Some requested images could not be completed. Saved images remain available; review recovery options for the affected work.':['cancelled','canceled','stopped','paused'].includes(project.status)?'Creation was stopped. Your saved work remains available.':'Creation was interrupted. Open the project for the reason and recovery options.');
    if(!project.results?.some(r=>safeAsset(r.imageUrl)))return attention('No image is available yet. Open the project to check what happened.');
    const slots=(project.placements||[]).filter(s=>s.id),routes=project.intake?.conceptRoutes||[...new Set(project.results.map(r=>r.route))];
    if(slots.some(s=>routes.some(route=>!project.results.some(r=>r.route===route&&r.placementId===s.id&&safeAsset(r.imageUrl)))))return attention('Some requested images are missing. Open the saved work and review recovery options.','View saved images');
    return {key:'ready',label:'Ready',tone:'green',action:'Open images',detail:'Images are available to inspect, edit and download. Review findings stay beside each image.'};
  }
  // One design's badge (review page). The project stage "Ready" above only means images are
  // available. A design is "Ready" only when its saved checks passed (ready===true, which for
  // lean conformance v1 means no remaining concrete mismatch) and it has not been edited since.
  // A clear mismatch or an unverified blocking item shows "Check before using". Display only.
  function designCheck(r){
    if(!r||!safeAsset(r.imageUrl))return null;
    if(r.ready===true&&!r.latestEdit)return {key:'ready',label:'Ready',tone:'green',detail:r.qualityVerified===false?'No blocking issue found. Items that could not be confirmed from the image stay listed with its review.':'Saved checks passed for this design.'};
    return {key:'check',label:'Check before using',tone:'amber',detail:r.latestEdit?'This design was edited after its saved check. Check it before using it.':r.visualReview?.conclusion==='clear_mismatch'?'The saved check found a clear mismatch in this design. Check it before using it.':'Saved checks did not confirm every required item. Check this design before using it.'};
  }
  function safeAsset(url) {return typeof url==='string'&&(/^\/creative-ai\/api\/(jobs|brands)\/[a-zA-Z0-9_./%|-]+$/.test(url)||/^\/creative-ai\/api\/jobs\/[a-zA-Z0-9_-]+\/editable\/(continuity|exploration)\/[a-zA-Z0-9_-]+\/preview\?revision=\d+$/.test(url))&&!url.includes('..')?url:'';}
  // Collections are a presentation of the saved placement contract. Never infer a
  // set from a project name, result count or dimensions: campaigns may mix formats.
  function assetCollections(p){
    const groups=new Map(),placements=p.placements||[];
    placements.forEach((v,index)=>{
      const carousel=v.carousel||v.description?.carousel,pdp=v.pdp||v.description?.pdp,print=v.printSet||v.description?.printSet;
      const assetSet=v.assetSet||v.description?.assetSet;
      let type='',id='',name='',order=1,count=1;
      if(carousel){type='carousel';id=carousel.id;name=carousel.name||'Carousel';order=carousel.index;count=carousel.count;}
      else if(pdp){type='pdp';id=pdp.id||'custom:studio-pdp-pack';name='PDP image set';order=pdp.index;count=pdp.count;}
      else if(assetSet){type='asset-set';id=assetSet.id;name=assetSet.name;order=assetSet.index;count=assetSet.count;}
      else if(print){type='print';id=print.id;name=print.name||'Print set';order=print.index;count=print.count;}
      else {
        const recipe=String(v.id).match(/^custom[:_](?:recipe-)?(rcs-image-[a-z-]+|product-image|marketplace-module(?:-amazon-[a-z-]+)?)-(\d+)$/);
        const manifest=(p.carousels||[]).find(c=>c.slides?.some(s=>s.placementId===v.id));
        if(recipe){type=recipe[1].startsWith('rcs-image-')?'rcs':recipe[1]==='product-image'?'pdp':'aplus';id=recipe[1];name=type==='rcs'?'RCS image set':type==='pdp'?'Product image set':'A+ content';order=Number(recipe[2]);count=0;}
        else if(manifest){type='carousel';id=manifest.carouselId;name='Carousel';order=manifest.slides.find(s=>s.placementId===v.id).index;count=manifest.slides.length;}
      }
      const grouped=!!type&&!!id&&Number.isInteger(order)&&order>0;
      const key=grouped?type+':'+id:'single:'+v.id;
      if(!groups.has(key))groups.set(key,{id:key,type:grouped?type:'single',name:grouped?name:v.name||'Creative',count:1,pages:[]});
      const group=groups.get(key);group.count=Math.min(200,Math.max(group.count,Number.isInteger(count)?count:0,grouped?order:1));
      group.pages.push({index,placementId:v.id,name:pdp?.name||print?.label||(carousel?'Slide '+order:v.name)||'Page '+order,number:grouped?order:1});
    });
    return [...groups.values()].map(g=>({...g,pages:g.pages.sort((a,b)=>a.number-b.number),grouped:g.type!=='single'&&(g.count>1||g.pages.length>1)}));
  }
  function collectionPages(p,group,route){
    return Array.from({length:group.count},(_,i)=>{
      const page=group.pages.find(s=>s.number===i+1);
      const results=page?(p.results||[]).filter(r=>r.placementId===page.placementId):[];
      const result=results.find(r=>r.route===route&&safeAsset(r.imageUrl));
      return {...page,number:i+1,name:page?.name||'Page '+(i+1),result,optionIndex:result?results.indexOf(result):-1};
    });
  }
  function sameDownloadSelection(shown,current,{original=false}={}){return !!shown&&!!current&&shown.imageUrl===current.imageUrl&&(shown.versionId||'original')===(current.versionId||'original')&&(original||(shown.latestEdit?.revision||0)===(current.latestEdit?.revision||0));}
  function completeSet(p,route,placementId){if(placementId){const groups=assetCollections(p),group=groups.find(g=>g.grouped&&g.pages.some(page=>page.placementId===placementId));if(group){const pages=collectionPages(p,group,route);return pages.every(page=>page.result)?pages.map(page=>page.result):null;}if(groups.some(g=>g.grouped))return null;}const slots=p.placements||[];if(slots.length<2)return null;const rows=slots.map(s=>(p.results||[]).find(r=>r.route===route&&r.placementId===s.id&&safeAsset(r.imageUrl)));return rows.every(Boolean)?rows:null;}
  function carouselDownload(p,result) {
    return (p.carousels||[]).find(c=>c.route===result.route&&safeAsset(c.downloadUrl)&&c.downloadUrl.startsWith('/creative-ai/api/jobs/'+(p.sourceJobId||p.id)+'/files/')&&c.slides?.length>1&&c.slides.some(s=>s.placementId===result.placementId)&&c.slides.every((s,i)=>s.index===i+1&&safeAsset(s.imageUrl)&&(p.results||[]).some(r=>r.route===result.route&&r.placementId===s.placementId&&r.imageUrl===s.imageUrl&&!r.latestEdit))&&!p.editLookupFailed)||null;
  }
  function jobProgress(p){
    const ids=['preparing','creating','reviewing','ready'];
    const mapping={queued:'preparing',preparing:'preparing',brand:'preparing',research:'preparing',guardian:'preparing',strategy:'preparing',concepts:'preparing','pdp-plan':'preparing','collection-plan':'preparing',copy:'preparing',art:'preparing',reconciliation:'preparing',generation:'creating',statics:'creating',review:'reviewing',quality:'reviewing'};
    const correcting=isCorrecting(p),running=correcting||['queued','preparing','running'].includes(p.status);
    const active=(p.activeStages||[]).map(k=>mapping[k]).filter(Boolean);
    let current=active.length?ids.find(id=>active.includes(id)):mapping[p.stage]||mapping[p.progress?.stage]||mapping[p.status]||null;
    const display=status(p);if(correcting)current='creating';else if(!running)current=display.key==='ready'?'ready':null;
    const waiting=running&&Object.values(p.providerWaits||{}).some(w=>w.status==='waiting');
    const label=display.label,substage=correcting?'Repairing saved artwork':running?creationSubstage(p):'';
    const description=p.stage==='recovering'?'The worker restarted. Saved progress is being checked before continuing; unresolved paid requests will not be repeated.':waiting?'The creation service is taking longer. We are checking the same response automatically; no replacement is being submitted.':running?(p.status==='queued'?'Your request is waiting to start.':substage==='Planning'?'Preparing the brief, product references and design.':substage==='Generating images'?'Generating your images. Completed work is saved as it becomes available.':substage==='Checking images'?'Checking the generated images.':'Work is continuing. Waiting for the next recorded stage update.'):display.detail;
    const steps=[['draft','Draft'],['creating','Creating'],['ready','Ready']].map(([id,label])=>({id,label,state:id===display.key?'current':id==='draft'&&running?'completed':display.key==='ready'&&['draft','creating'].includes(id)?'completed':'pending'}));
    return {current,label,substage,description:correcting?display.detail:description,running,correcting,steps};
  }
  // One request at a time, bound to a visible job. Timers never start generation.
  function createProgressPoller({read,apply,error,setTimer=setTimeout,clearTimer=clearTimeout}){
    let target=null,timer=null,flight=null,version=0,failures=0;
    function clear(){if(timer!==null)clearTimer(timer);timer=null;}
    function plan(ms){clear();if(target&&!flight)timer=setTimer(()=>{timer=null;run();},ms);}
    async function run(){if(!target||flight)return;const t={...target},v=version,controller=new AbortController(),f={controller};flight=f;
      try{const result=await read(t,controller.signal);if(v!==version||controller.signal.aborted)return;failures=0;apply(result,t);}
      catch(e){if(v===version&&!controller.signal.aborted){failures++;error(e,t);}}
      finally{if(flight===f)flight=null;if(target&&!flight){if(v!==version)plan(0);else if(target.repeat||failures)plan(Math.min(30000,5000*2**Math.min(failures,3)));}}
    }
    return {watch(next,{immediate=false}={}){
      const changed=target?.key!==next?.key;
      if(changed){version++;clear();flight?.controller.abort();failures=0;target=next;if(target&&!flight)plan(0);}
      else{target=next;if(!next){clear();return;}if(!next.repeat)clear();if(immediate&&!flight)plan(0);}
    },stop(){this.watch(null);}};
  }
  // Project labels describe the assignment. Product evidence and user titles stay intact.
  function shortProductName(value){
    if(['Brand-only','Product not selected','Choose a product'].includes(value))return value;
    const words=String(value||'').trim().split(/[|\n]/)[0].replace(/^(?:(?:Duroflex|Sleepyhead|Duropedic)\s+)+/i,'').replace(/\s+\d+\s*seater\b.*$/i,'').trim().split(/\s+/).slice(0,2).join(' ');
    return words.length>32?words.slice(0,31).trimEnd()+'…':words;
  }
  function projectBriefFocus(p){
    // Use a complete short phrase, never truncate a claim or invent a summary.
    const brief=String(p.intake?.brief||p.brief||''),labelled=brief.match(/^(?:main message|key message|message):\s*([^\n]+)/im)?.[1];
    const candidates=[p.message,p.intake?.message,labelled,...(Array.isArray(p.selectedRtbs)?p.selectedRtbs:[]),...rtbItems(p.rtbs||'')];
    for(const candidate of candidates){
      if(typeof candidate!=='string')continue;
      const phrase=candidate.trim().replace(/^(?:please\s+)?(?:highlight|emphasise|emphasize|showcase|focus on)\s+(?:the\s+)?/i,'').replace(/[.!]+$/,'').replace(/\s+/g,' ');
      const words=phrase.split(' ');
      if(words.length<2||words.length>4||phrase.length>36||/[\n;:{}<>]/.test(candidate)||/^(?:not specified|no added text|create|make|generate|design|write|do not|don't|avoid|exclude)\b/i.test(phrase))continue;
      return phrase.charAt(0).toLocaleUpperCase()+phrase.slice(1);
    }
    return '';
  }
  function nextProjectName(base,names){
    const used=new Set(names.map(v=>String(v).trim().toLocaleLowerCase()));
    let name=base,n=2;while(used.has(name.trim().toLocaleLowerCase()))name=base+' ('+(n++)+')';return name;
  }
  function disambiguateProjectNames(projects){
    const used=new Map(),named=new Map(),assignments=new Map();
    const namesFor=p=>{if(!used.has(p.brandId))used.set(p.brandId,[]);return used.get(p.brandId);};
    const assignmentKey=p=>JSON.stringify([p.brandId,p.collectionCopy?p.id:p.intake?.sourceStudioDraftId||p.id,p.name]);
    // Explicit user names are reserved; sorting the UI or polling does not renumber matches.
    for(const p of projects)if(p.nameLocked)namesFor(p).push(p.name);
    for(const p of [...projects].sort((a,b)=>String(a.createdAt||a.id).localeCompare(String(b.createdAt||b.id))||String(a.id).localeCompare(String(b.id)))){
      const names=namesFor(p),key=assignmentKey(p),name=p.nameLocked?p.name:assignments.get(key)||nextProjectName(p.name,names);
      if(!p.nameLocked){if(!assignments.has(key))names.push(name);assignments.set(key,name);}named.set(p,name);
    }
    return projects.map(p=>({...p,name:named.get(p)}));
  }
  function projectTitle(p,{override='',automatic=false,productName=''}={}){
    if(override)return override;
    if(p.manualName&&p.name)return p.name;
    const full=p.productName||p.intake?.productName||p.productSummary?.name||productName||'';
    const existing=p.intake?.campaignName||p.name||'';
    if(!automatic&&existing&&existing!==full&&!['Untitled project','Saved project'].includes(existing))return existing;
    const labels=(Array.isArray(p.outputs)?p.outputs:[]).map(o=>({5:'PDP images',6:'A+ content',9:'Carousel'}[o.featureId]||features.find(f=>f.id===o.featureId)?.name||o.name||'Creative'));
    if(!labels.length)for(const slot of p.placements||[])labels.push(slot.pdp?'PDP images':slot.carousel?'Carousel':slot.amazon||slot.aplus?'A+ content':String(slot.name||'Creative').split(/\s*[·|]\s*/)[0]);
    const kinds=[...new Set(labels)],asset=kinds.length>1?'Campaign':kinds[0]||((p.creationMode==='campaign')?'Campaign':'Creative');
    const subject=shortProductName(full)||(p.focus==='brand'||p.intake?.focus==='brand'?'Brand':'');
    const focus=projectBriefFocus(p),kind=asset.length>28?asset.slice(0,27).trimEnd()+'…':asset;
    return subject||focus?[subject,focus,kind].filter(Boolean).join(' · '):asset==='Creative'?'New creative':asset;
  }
  function normalizeJob(j,brandId) {
    if((j.brandId||j.intake?.brandId)!==brandId)throw Error('This project belongs to a different brand.');
    return {...j,brandId,local:false,name:j.intake?.campaignName||j.intake?.productName||j.productSummary?.name||j.concepts?.find(c=>c.route==='continuity')?.name||'Saved project',brief:j.intake?.brief||j.strategy?.statement||'',updatedAt:j.updatedAt||j.createdAt,results:(j.results||[]).map(r=>({...r,imageUrl:safeAsset(r.imageUrl)}))};
  }
  function storage(store) {
    const prefix='studio-ui-v1:';
    function key(brand,id){return prefix+brand+':'+id;}
    function read(brand,id){const raw=store.getItem(key(brand,id));if(!raw)return null;let d;try{d=JSON.parse(raw);}catch{throw Error('This saved draft could not be read. It has not been removed.');}if(d.schemaVersion!==1||d.brandId!==brand||d.id!==id||!Array.isArray(d.outputs))throw Error('This draft needs recovery. The saved record is unchanged.');return d;}
    function list(brand){const drafts=[],errors=[];for(let i=0;i<store.length;i++){const k=store.key(i);if(!k?.startsWith(prefix+brand+':'))continue;try{drafts.push(read(brand,k.slice((prefix+brand+':').length)));}catch(e){errors.push(e.message);}}return {drafts:drafts.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),errors};}
    function save(d,expected=d.revision){const prior=read(d.brandId,d.id);if(prior&&prior.revision!==expected)throw Error('This draft changed in another tab. Reload it or save a separate copy.');const next={...clone(d),revision:(prior?.revision||0)+1,updatedAt:new Date().toISOString()};store.setItem(key(d.brandId,d.id),JSON.stringify(next));return next;}
    return {read,list,save,key};
  }
  // User-story catalogue doubles as the deterministic, provider-free screen inventory.
  const journeyRows=[
    ['brief','Create','Write a one-page brief','brief','ready','Describe the idea, product, audience and formats before committing to creation.','As a marketer, I can complete one brief without repeating inputs.'],
    ['brief-invalid','Create','Missing required details','brief','error','Give the project a name, add the brief and choose a product or brand-only focus.','As a marketer, I see errors beside the fields and keep everything I entered.'],
    ['variant-required','Create','Choose an exact variant','brief','attention','This product has several variants. Choose the size and colour to use.','As a marketer, I choose the exact SKU rather than accepting an inferred variant.'],
    ['reference-failed','Create','Reference upload failed','brief','error','The reference could not be saved. The rest of your brief is still open.','As a marketer, I can retry a failed reference without losing my brief.'],
    ['draft-conflict','Create','Draft changed in another tab','brief','error','A newer draft exists. Compare versions or save your changes as a separate copy.','As a marketer, I resolve a conflict without overwriting newer work.'],
    ['save-failed','Create','Draft save failed','brief','error','Your latest changes are still on screen. Retry or download the brief before leaving.','As a marketer, I can recover my work when device storage is unavailable.'],
    ['brief-summary','Create','Confirm the brief','confirm','ready','Review deliverables, product and audience before starting.','As a marketer, I know exactly what will be created and whether a cost is available.'],
    ['generation-unavailable','Create','Creation not connected','confirm','attention','This interface can save the brief. Creation starts in the current studio until the connection is ready.','As a marketer, I can distinguish preparing a brief from paying for generation.'],
    ['queued','Create','Waiting to start','progress','waiting','Your request is queued. You can leave this page and return to the project.','As a marketer, I can identify a queued request without submitting it twice.'],
    ['creating','Create','Creating your options','progress','running','Your creative options are being prepared. Completed work appears here as it becomes available.','As a marketer, I see the current step without a fabricated ETA.'],
    ['connection-lost','Create','Connection interrupted','progress','error','We cannot confirm the latest status. The request may still be running. Updates resume when the connection returns.','As a marketer, I recover a connection without creating duplicate paid requests.'],
    ['needs-input','Create','One detail needs your input','progress','attention','Confirm the product variant before this request can continue.','As a marketer, I can answer a precise question and resume the existing project.'],
    ['generation-failed','Create','Creation interrupted','progress','error','The request did not finish. Completed artwork remains available.','As a marketer, I keep completed work when another item fails.'],
    ['partial','Create','Some options are ready','project','attention','One option is ready to review; another needs attention.','As a marketer, I can work with completed options while resolving the remaining item.'],
    ['project-ready','Review','Project overview','project','ready','Choose a deliverable to review its options.','As a marketer, I can see a campaign’s deliverables and their next actions in one place.'],
    ['review','Review','Review creative and rationale','review','ready','Explore the selected option, its design intent and saved artwork checks.','As a marketer, I understand why this design was chosen without reading an essay.'],
    ['review-concerns','Review','Artwork needs attention','review','attention','The logo and supporting copy need a closer look. Selection does not remove review concerns.','As a marketer, I see quality concerns before sharing an image.'],
    ['rationale-unavailable','Review','Rationale unavailable','review','error','Saved reasoning could not load. The artwork and editing actions are still available.','As a marketer, I can retry reasoning without losing access to the artwork.'],
    ['review-unrated','Review','No saved ratings','review','attention','This image has no recorded category scores. It is shown as not rated.','As a marketer, I am not misled by invented quality scores.'],
    ['image-unavailable','Review','Artwork could not load','review','error','The saved image could not load. Its project record and review are still retained.','As a marketer, I can retry an unavailable asset without it disappearing.'],
    ['feedback-saved','Review','Feedback saved','review','success','Your note was saved for this option. It does not automatically change brand guidance or trigger AI.','As a marketer, I know what saving feedback does.'],
    ['editor','Edit','Edit the selected creative','editor','ready','Select text or an image to see the relevant controls.','As a marketer, I can edit text, move elements and add an image without regenerating.'],
    ['editor-prepare','Edit','Prepare text for editing','editor','waiting','The original image remains available while editable text is prepared.','As a marketer, I understand that an existing flat image needs preparation first.'],
    ['editor-asset-missing','Edit','Image layer unavailable','editor','error','This image could not load. Its layer, dimensions and position stay saved.','As a marketer, I can retry or replace an image without losing its layer.'],
    ['editor-font-missing','Edit','Font file unavailable','editor','attention','A font could not load. Retry it or choose an available font before export.','As a marketer, I see a font issue instead of a silently changed layout.'],
    ['editor-overflow','Edit','Text needs more room','editor','attention','The headline no longer fits. Widen the text box, reduce its size or edit the wording.','As a marketer, I can fix long text without changing the photograph.'],
    ['editor-save-failed','Edit','Changes not saved','editor','error','Your edits are still open. Retry saving or keep this tab open while you recover them.','As a marketer, I do not mistake failed saving for a saved revision.'],
    ['editor-revisions','Edit','Original and revisions','editor','success','Client changes are separate from the original AI design.','As a marketer, I can return to an earlier version without overwriting the original.'],
    ['download','Download','Choose download format','download','ready','Download the selected saved artwork in its original dimensions.','As a marketer, I can choose the correct format and revision.'],
    ['download-preparing','Download','Preparing the file','download','waiting','Images and fonts must finish loading before the export is ready.','As a marketer, I know when an export is still being prepared.'],
    ['download-failed','Download','Download failed','download','error','The file could not be prepared. Retry; your saved artwork is unchanged.','As a marketer, I can retry a failed export without regenerating artwork.'],
    ['download-complete','Download','Download prepared','download','success','The file has been handed to your browser. Check your browser’s Downloads.','As a marketer, I know what was exported without an unsupported claim that it reached disk.'],
    ['download-flagged','Download','Download with review concerns','download','attention','This draft retains its review notes. Downloading does not approve it for publication.','As a marketer, I can export a draft while keeping review limitations visible.'],
    ['projects','Library & work','Find and resume work','projects','ready','Search projects and continue from the last saved state.','As a marketer, I can recognise my campaign and its next action.'],
    ['projects-empty','Library & work','No projects yet','projects','empty','Start a brief to create the first project for this brand.','As a marketer, I have a clear first action in a new workspace.'],
    ['search-empty','Library & work','No matching projects','projects','empty','Try another name or clear the filters.','As a marketer, I can recover from a search with no results.'],
    ['projects-failed','Library & work','Projects could not load','projects','error','Retry loading. This does not mean your projects were deleted.','As a marketer, I can distinguish a network failure from an empty workspace.'],
    ['library','Library & work','Browse saved products','library','ready','Products and brand references stay in the selected workspace.','As a marketer, I can reuse approved source material without another website lookup.'],
    ['library-empty','Library & work','No saved materials','library','empty','Add materials through the existing brand library.','As a marketer, I know where to add missing source material.'],
    ['library-failed','Library & work','Library partially unavailable','library','error','Some materials could not load. Saved files remain unchanged.','As a marketer, I can retry missing library items without losing the rest.'],
    ['library-unprocessed','Library & work','File saved, not processed','library','attention','A saved upload is not necessarily parsed or applied to new work.','As a marketer, I can distinguish uploaded files from usable extracted guidance.'],
    ['usage','Account & recovery','View recorded usage','costs','ready','Review recorded INR usage, with estimates separate from confirmed charges.','As a marketer, I can understand costs without interpreting provider tokens.'],
    ['usage-unavailable','Account & recovery','Usage unavailable','costs','error','Billing data could not load. An unknown cost is not ₹0.','As a marketer, I can tell missing billing from zero spend.'],
    ['wrong-brand','Account & recovery','Project not in this workspace','recovery','error','This project is not available in the selected brand. Choose the correct workspace or return home.','As a marketer, I cannot accidentally edit another brand’s project.'],
    ['not-found','Account & recovery','Link unavailable','recovery','error','This link no longer resolves to an available item. Your other work is unchanged.','As a marketer, I have a safe path back from a broken link.']
  ];
  const journeys=journeyRows.map(([id,group,title,screen,state,message,story])=>({id,group,title,screen,state,message,story}));
  // Plain-language presentation only; keep the original saved reasoning intact.
  function plainDesignReason(value){
    return String(value||'').replace(/\s+/g,' ').trim()
      .replace(/A prominent, reference-faithful sofa and a plausible shared moment carry the assigned feature-and-context proposition/gi,'The plan puts the sofa front and centre and shows people spending time together to explain the benefit')
      .replace(/reference-faithful/gi,'true to the product reference')
      .replace(/contextualizes the sourced/gi,'shows the')
      .replace(/contextualises the sourced/gi,'shows the')
      .replace(/feature-and-context proposition/gi,'product benefit in an everyday setting')
      .replace(/carry the assigned/gi,'show the')
      .replace(/a plausible shared moment/gi,'a natural moment together')
      .replace(/the exact (.+?) is the hero/gi,'$1 is the focus')
      .replace(/for the brief’s/gi,'to support the brief’s')
      .replace(/everyday-togetherness/gi,'everyday togetherness')
      .replace(/the adults’ natural shared moment/gi,'a relaxed moment together')
      .replace(/the relevance of togetherness remains/gi,'the connection to togetherness remains')
      .replace(/contextualiz(?:e|es)/gi,'shows')
      .replace(/sourced extra-deep seating/gi,'extra-deep seating')
      .replace(/Proposed contemporary lounge/gi,'The plan uses a modern living room')
      .replace(/restrained dark timber details/gi,'simple dark wood details');
  }
  function reviewSummary(unit,result={}){
    const art=unit?.plannedArt||{},sentence=(v,re)=>typeof v==='string'?v.split(/(?<=[.!?;])\s+|\n+/).find(s=>re.test(s))||'':'',text=v=>typeof v==='string'?v:typeof v?.direction==='string'?v.direction:'';
    const decisions=[['Message','message',result.conceptExplanation?.takeaway||art.focalCommunication],['Layout','panel',text(art.rationale)||sentence(art.composition,/layout|headline|copy|product|zone/i)||result.compositionRationale?.text],['Logo','shield',sentence(art.composition,/logo/i)||art.logo?.treatment],['Scene','image',text(art.scene)||text(art.lighting)||text(art.camera)]].map(([title,icon,body],i)=>({id:i+1,title,icon,text:text(body),displayText:plainDesignReason(text(body)),basis:'intent',recorded:!!text(body)}));
    const scores=[['communication','Message clarity'],['visualCraft','Visual craft'],['placementFit','Format fit'],['brandRecognition','Brand recognition']].map(([id,title])=>{const q=unit?.review?.qualityScores?.find(q=>q.criterion===id),valid=q&&Number.isFinite(q.score)&&q.score>=0&&q.score<=100&&q.usedInScore===true&&typeof q.evidence?.method==='string'&&!!q.evidence.method.trim()&&!['unavailable','synthetic-simulation'].includes(q.evidence.method)&&!!q.evidence?.observation;return {id,title,score:valid?q.score/20:null,originalScore:valid?q.score:null,note:valid?q.evidence.observation:'No eligible rating was recorded.'};});
    const issues=(unit?.review?.criticalChecks||[]).filter(c=>!['pass','not-applicable'].includes(c.status));
    const actions={
      'logo-identity':['Logo','Compare with the approved logo in Brand Library.','brand','Check brand assets'],
      'product-identity':['Product accuracy','Compare the product with the saved SKU images.','products','Check product'],
      'supported-claims':['Claims','Check the wording against the saved product information.','products','Check product'],
      'exact-required-copy':['Required wording','Compare and correct the wording in the editor.','edit','Edit wording'],
      'required-text-legibility':['Readability','Increase text size or contrast in the editor, then inspect the export.','edit','Improve readability'],
      'mandatory-brand-rules':['Brand rules','Compare this choice with the saved brand guidance.','brand','Check brand assets'],
      'verified-upload-constraints':['Format requirements','Check the size, margins and upload requirements in the saved report.','report','View requirements'],
      'reference-boundary':['Reference use','Check the reference findings in the saved report.','report','View findings']
    };
    const concerns=[],seen=new Map();
    for(const raw of [...(unit?.review?.classifiedFindings||[...issues,...(unit?.review?.findings||[]).filter(f=>f.severity!=='advisory'),...(unit?.review?.verificationDependencies||[])]),...(Array.isArray(result.unresolved)?result.unresolved:[])]){const c=typeof raw==='string'?{note:raw}:raw;if(!c||['pass','not-applicable','resolved'].includes(c.status))continue;if(c.request&&c.criterion&&concerns.some(x=>x.criterion===c.criterion))continue;const criterion=c.criterion||'review-note',observation=text(c.defect)||text(c.evidence?.observation)||text(typeof c.evidence==='string'?c.evidence:'')||text(c.note)||text(c.request)||'This check is unresolved.',key=criterion+'|'+observation.trim().toLowerCase();if(seen.has(key))continue;seen.set(key,true);const [title,nextStep,action,label]=actions[criterion]||['Review concern','Check this item before sharing.','report','View finding'];const category=c.category||(['fail','critical','creative','major'].includes(c.status||c.severity)?'blocker':'verification'),failed=category==='blocker';concerns.push({criterion,title,observation,category,requirement:c.requirement||c.evidence?.expected||null,scope:c.scope||{placementId:result.placementId},status:category==='suggestion'?'suggestion':failed?'fail':'unverified',nextStep:category==='suggestion'?'Optional improvement; this does not block delivery.':text(c.correction)||(!failed&&action==='edit'?'Check the wording, size and contrast against the brief before making changes.':nextStep),action,label:category==='suggestion'?'View suggestion':!failed&&action==='edit'?'Check in editor':label});}
    // A missing evaluator is one recovery task, not a separate invented defect for every check.
    const missing=concerns.filter(c=>c.status==='unverified'&&/^No qualified evaluator evidence available\.?$/i.test(c.observation.trim()));
    if(missing.length>1){const index=concerns.indexOf(missing[0]);for(const c of missing)concerns.splice(concerns.indexOf(c),1);concerns.splice(index,0,{criterion:'review-coverage',title:'Review incomplete',observation:'Not verified: '+missing.map(c=>c.title).join(', ')+'.',status:'unverified',nextStep:'Check the unverified items before sharing.',action:'report',label:'View missing checks'});}
    concerns.sort((a,b)=>(a.status==='fail'?0:1)-(b.status==='fail'?0:1));
    return {decisions,scores,issues,concerns,reviewAvailable:!!unit?.review,sources:unit?.brandGuidelineReasoning?.applications||[]};
  }
  function feedbackKey(p,item,r){return [p.id,item.id,r.route||'',r.versionId||'original',r.imageHash||r.imageUrl||'unavailable'].join('|');}
  function organization(store){
    const prefix='studio-organise-v1:';
    function read(brandId){const raw=store.getItem(prefix+brandId);if(!raw)return {schemaVersion:1,brandId,revision:0,entries:{},copies:[]};let v;try{v=JSON.parse(raw);}catch{throw Error('Your saved organisation could not be read. It has not been overwritten.');}if(v.schemaVersion!==1||v.brandId!==brandId||!Number.isInteger(v.revision)||!v.entries||typeof v.entries!=='object'||Array.isArray(v.entries)||!Array.isArray(v.copies)||v.copies.some(p=>p.brandId!==brandId))throw Error('Your saved organisation needs recovery. Existing data is unchanged.');return v;}
    function save(next,expected=next.revision){const prior=read(next.brandId);if(prior.revision!==expected)throw Error('Your organisation changed in another tab. Reload before trying again.');const value={...clone(next),revision:prior.revision+1};store.setItem(prefix+next.brandId,JSON.stringify(value));return value;}
    function applyPatch(value,key,patch){if(!/^(project|creative):/.test(key)||!patch||Object.keys(patch).some(k=>!['name','campaign','tags','favourite','shortlisted','trashedAt','savedAt'].includes(k)))throw Error('Unsupported organisation change.');const next=clone(value);const clean={...patch};for(const k of ['name','campaign'])if(k in clean){if(typeof clean[k]!=='string'||clean[k].length>160)throw Error('Use a name of up to 160 characters.');clean[k]=clean[k].trim();if(k==='name'&&!clean[k])throw Error('Enter a name.');}if('tags' in clean){if(!Array.isArray(clean.tags)||clean.tags.length>20||clean.tags.some(t=>typeof t!=='string'||t.length>40))throw Error('Use up to 20 tags, each under 40 characters.');clean.tags=[...new Set(clean.tags.map(t=>t.trim()).filter(Boolean))];}for(const k of ['favourite','shortlisted'])if(k in clean&&typeof clean[k]!=='boolean')throw Error('Invalid bookmark value.');for(const k of ['trashedAt','savedAt'])if(k in clean&&clean[k]!==null&&!Number.isFinite(Date.parse(clean[k])))throw Error('Invalid saved time.');next.entries[key]={...next.entries[key],...clean};return next;}
    function update(value,key,patch){return save(applyPatch(value,key,patch));}
    function updateMany(value,changes){if(!Array.isArray(changes)||!changes.length)throw Error('Choose saved items to update.');let next=value;for(const change of changes)next=applyPatch(next,change.key,change.patch);return save(next);}
    function duplicate(value,p,result){if(p.brandId!==value.brandId)throw Error('Cannot copy a different brand’s project.');if(p.local)throw Error('Use draft storage to copy a brief.');if(result&&!p.results.some(r=>r.route===result.route&&r.placementId===result.placementId&&(r.versionId||'original')===(result.versionId||'original')&&r.imageUrl===result.imageUrl))throw Error('The selected creative is not part of this project.');const next=clone(value),id=uid();const copy={id,brandId:p.brandId,local:false,collectionCopy:true,sourceJobId:p.sourceJobId||p.id,name:String(result?.name||p.name||'Project').slice(0,155)+' copy',brief:p.brief||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:p.status,intake:clone(p.intake||{}),productSummary:clone(p.productSummary||{}),placements:clone((p.placements||[]).filter(v=>!result||v.id===result.placementId)),results:clone(result?[result]:p.results||[])};next.copies.push(copy);return {value:save(next),copy};}
    return {read,save,update,updateMany,duplicate,key:brandId=>prefix+brandId};
  }
  const pdpSlots=["Product hero","Alternate product angle","Surface and edge detail","Dimensions and bed fit","Firmness and use","Main differentiator","Technology explanation","Materials and construction","Product in context","What is included","Care and setup","Ownership reassurance"];
  function campaignGenerationSupported(d){return !!d?.outputs?.length && d.outputs.some(o=>!!generationProfile({...d,outputs:[o]}));}
  function generationProfile(d){
    if(d?.outputs?.length!==1)return null;
    const o=d.outputs[0];
    // Planning briefs (asset picker 'soon'/'plan' cards) are never routed to generation.
    if(o?.planningOnly===true)return null;
    if(d.focus!=='product'&&!(d.focus==='brand'&&(amazonImageTemplate(o)?.id==='brand-story'||amazonImageTemplate(o)?.page==='brand-story'||emailImage(o)||rcsImage(o)||pushImage(o)||retailEntry(o))))return null;
    if(responsiveSlots(o).length){
      const slots=responsiveSlots(o);if(o.slides!==1||slots.some(([,w,h])=>![w,h].every(n=>Number.isInteger(n)&&n>=64&&n<=8192)||w*h>40000000||Math.max(w/h,h/w)>20))return null;
      const platform=emailImage(o)?'Email':'Website',customProfiles=slots.map(([name,w,h],i)=>({id:'custom:client-'+platform.toLowerCase()+'-'+(i?'mobile':'desktop')+'-'+w+'x'+h,name:platform+' '+name,platform,publisher:'client',placement:i?'mobile-image':'desktop-image',assetType:'static',canvas:{width:w,height:h,unit:'px'},exportContract:{formats:['png']},displayContext:'Separately compose '+name+' for the same assignment. Preserve exact product identity and a coherent visual system; do not stretch or blindly crop the other variant. '+(emailImage(o)?'Native email headings, body, links and buttons remain outside the image. ':'')+assetRequirementSummary(o,d).join('; ')}));
      return {placementId:customProfiles[0].id,placementIds:customProfiles.map(p=>p.id),customProfiles,label:platform+' desktop + mobile images',width:o.width,height:o.height,unitCount:2,omitLogo:true};
    }
    if(retailEntry(o))return retailProfile(o);
    const profile=(slug,label,extra={})=>({placementId:'custom:studio-'+slug,label,width:o.width,height:o.height,...extra});
    if(pushImage(o)){
      const v=o.staticValues,destination=pushDestinations[v.pushDestination],size=pushPresets[v.pushPreset];
      if(!destination||!Object.hasOwn(pushPresets,v.pushPreset)||o.slides!==1||![o.width,o.height].every(v=>Number.isInteger(v)&&v>=64&&v<=8192)||o.width*o.height>40000000||Math.max(o.width/o.height,o.height/o.width)>20)return null;
      if(size&&(o.width!==size[0]||o.height!==size[1]))return null;
      const limit=String(v.fileLimitKb||'').trim();if(limit&&(!/^\d+$/.test(limit)||Number(limit)<1||Number(limit)>102400))return null;
      const id='custom:push-image-'+destination+'-'+o.width+'x'+o.height;
      const displayContext='Push image for '+v.pushDestination+'. '+(destination==='android'?'Compose for expanded big-picture display; the collapsed notification may omit artwork.':destination==='ios'?'Compose an attachment recognisable as a small thumbnail and when expanded by the user.':'Compose for supported browser rich-image display; browsers may omit the image.')+' Keep native title, body and tap action outside the image. One simple recognisable subject; protect important product details near the centre and do not paint buttons or app icons. Template: '+v.pushPreset+'. Canvas is a Studio/user-selected image asset, not OS or provider certification. '+(limit?'Supplied file ceiling '+limit+' KiB applies to the exported file.':'No provider byte ceiling supplied; do not claim upload acceptance.')+' Reference: https://documentation.onesignal.com/docs/en/rich-media';
      return {placementId:id,placementIds:[id],label:o.name,width:o.width,height:o.height,omitLogo:true,customProfiles:[{id,name:o.name,platform:'Push '+v.pushDestination,publisher:'client',placement:'notification-image',assetType:'static',canvas:{width:o.width,height:o.height,unit:'px'},exportContract:{formats:['png'],...(limit?{maxBytes:Number(limit)*1024}:{})},displayContext}]};
    }
    if(rcsImage(o)){
      const t=rcsPresets[o.staticValues.rcsPreset],n=rcsCount(o),parts=staticParts(o);
      if(!t||!Number.isInteger(n)||n<(t.carousel?2:1)||n>10||o.width!==t.width||o.height!==t.height||parts.length!==n||parts.some(p=>p.width!==t.width||p.height!==t.height))return null;
      const customProfiles=parts.map((p,i)=>({id:'custom:rcs-image-'+t.slug+'-'+String(i+1).padStart(2,'0'),name:'RCS card '+(i+1),platform:'RCS',publisher:'studio',placement:'rich-card-media',assetType:'static',canvas:{width:t.width,height:t.height,unit:'px'},exportContract:{formats:['png']},displayContext:'RCS '+o.staticValues.rcsPreset+'. Image '+(i+1)+' of '+n+'. Visual intent (not literal wording): '+(p.visualIntent||o.staticValues.visualFocus||'Use the shared brief')+'. Keep native title, description and interactive buttons outside the image. One clear subject; protect product identity in centre crops. Preview media area '+t.previewWidth+' by '+t.mediaHeight+' CSS pixels approximates DP; device width can vary. Expanded carousel media can crop again at 264 DP tall. Export pixels are Studio presets, not universal publisher dimensions. Do not invent other SKUs. Reference: https://developers.google.com/business-communications/rcs-business-messaging/guides/learn/rich-cards'}));
      return {placementId:customProfiles[0].id,placementIds:customProfiles.map(p=>p.id),customProfiles,label:o.name,width:o.width,height:o.height,unitCount:n,omitLogo:true};
    }
    if(emailImage(o)){
      const preset=o.staticValues.emailPreset;if(!Object.hasOwn(emailPresets,preset)||o.slides!==1)return null;
      const size=emailPresets[preset];if(size&&[o.width,o.height].some((v,i)=>v!==size[i]))return null;
      if(![o.width,o.height].every(v=>Number.isInteger(v)&&v>=64&&v<=8192)||o.width*o.height>40000000||Math.max(o.width/o.height,o.height/o.width)>20)return null;
      if(size)return profile(preset==='Email hero'?'email-hero':'email-banner',preset,{omitLogo:true});
      const id='custom:client-email-image-'+o.width+'x'+o.height;
      return {placementId:id,label:'Custom email image',width:o.width,height:o.height,omitLogo:true,customProfiles:[{id,name:'Custom email image',platform:'Email',publisher:'client',placement:'email-image',assetType:'static',canvas:{width:o.width,height:o.height,unit:'px'},exportContract:{formats:['png']},displayContext:'User-selected email image slot. One clear visual subject; headings, body, links and buttons live in HTML outside this image. No invented text overlay. Check the actual email template crop and mobile view.'}]};
    }
    if(o.featureId===7&&o.staticValues?.websiteType==='Category tile'){
      if(o.slides!==1||![o.width,o.height].every(v=>Number.isInteger(v)&&v>=64&&v<=8192)||o.width*o.height>40000000||o.width/o.height>20||o.height/o.width>20)return null;
      const id='custom:client-website-tile-'+o.width+'x'+o.height;
      return {placementId:id,label:'homepage category tile',width:o.width,height:o.height,omitLogo:true,customProfiles:[{id,name:'Homepage category tile',platform:'Website',publisher:'studio',placement:'category-tile',assetType:'static',canvas:{width:o.width,height:o.height,unit:'px'},exportContract:{formats:['png']},displayContext:'Brief-selected website category tile dimensions. Use the chosen representative SKU and category context. Category destination and live page text are separate from the image; follow supplied label treatment. Recompose for the chosen crop. Actual site/component fit remains a separate deployment check.'}]};
    }
    if(o.featureId===1&&o.staticValues?.platform==='PMax'){
      const options={'Landscape + square + portrait':['landscape','square','portrait'],'Landscape + square':['landscape','square'],'Landscape + portrait':['landscape','portrait'],'Square + portrait':['square','portrait'],'Landscape':['landscape'],'Square':['square'],'Portrait':['portrait']};
      const ratios=options[o.staticValues.imageRatios||'Landscape + square + portrait'];if(!ratios||o.slides!==1)return null;
      const sizes={landscape:[1200,628],square:[1200,1200],portrait:[960,1200]};
      return {placementId:'custom:studio-pmax-'+ratios[0],placementIds:ratios.map(r=>'custom:studio-pmax-'+r),label:'PMax image set',width:sizes[ratios[0]][0],height:sizes[ratios[0]][1],unitCount:ratios.length,omitLogo:true};
    }
    if([5,6].includes(o.featureId)){
      const parts=staticParts(o),amazon=o.featureId===6&&amazonTemplates[o.staticValues?.amazonPreset];
      if(amazon?.page){
        // One A+ page = one coordinated set: a shared familyId gives ONE plan for every module and size.
        const slots=aplusSlots(amazon.page),type=aplusPageTypes[amazon.page];if(parts.length!==slots.length||parts.some((p,i)=>p.width!==slots[i].width||p.height!==slots[i].height))return null;
        const ids=slots.map((s,i)=>'custom:recipe-marketplace-module-amazon-'+amazon.id+'-'+String(i+1).padStart(2,'0'));
        const rule={panel:'Wide panel: short, large on-image text (product name, a short headline, up to three feature chips) readable on a phone.',mobile:'Mobile version of the same module: re-lay out the same words with larger type; never a squashed desktop panel.',label:'Small image: no text, or a label of one to three words.',none:'No on-image words: Amazon places its own logo, headline and cards here.'};
        const customProfiles=slots.map((s,i)=>({id:ids[i],name:type.name+' · '+s.name,platform:'Amazon A+',publisher:'studio',placement:'image-module',assetType:'static',canvas:{width:s.width,height:s.height,unit:'px'},exportContract:{formats:['png','jpeg']},displayContext:type.name+' · '+s.moduleName+' ('+s.name+', image '+(i+1)+' of '+slots.length+'). '+type.modules.find(m=>m.id===s.module).job+' '+rule[s.textRule]+(s.logo?' The brand logo appears once on the hero.':' No brand logo.')+' Visual direction (not literal artwork wording): '+(parts[i].visualIntent||o.staticValues?.storyFocus||'Use the shared page story')+'. No CTA button, link, QR code or contact details. Reference: '+type.source+' Image-slot preset, not publisher acceptance.'}));
        const jobInputs=Object.fromEntries(slots.map((s,i)=>[ids[i],{formatIntent:{familyId:'amazon-'+amazon.id,relationship:'coordinated-set',page:i+1,pages:slots.length,textPolicy:s.textRule==='none'?'none':'aplus-'+s.textRule,...(parts[i].visualIntent?{direction:parts[i].visualIntent}:{})},aplus:{version:1,type:type.id,module:s.module,moduleName:s.moduleName,role:s.role,moduleType:s.moduleType,unit:s.unit,device:s.device,textRule:s.textRule,logo:s.logo,slotName:s.name,pairPage:s.pairIndex}}]));
        return {placementId:ids[0],placementIds:ids,customProfiles,jobInputs,logoTreatment:Object.fromEntries(slots.map((s,i)=>[ids[i],s.logo?'include':'omit'])),aplus:aplusSummary(type.id),label:type.name,width:o.width,height:o.height,unitCount:slots.length};
      }
      if(amazon){const slots=amazonImageSlots(amazon,o.staticValues);if(!slots.length||parts.length!==slots.length||parts.some((p,i)=>p.width!==slots[i][1]||p.height!==slots[i][2]))return null;const customProfiles=parts.map((p,i)=>({id:'custom:recipe-marketplace-module-amazon-'+amazon.id+'-'+String(i+1).padStart(2,'0'),name:slots[i][0],platform:'Amazon A+',publisher:'studio',placement:'image-module',assetType:'static',canvas:{width:p.width,height:p.height,unit:'px'},exportContract:{formats:['png']},displayContext:amazon.instruction+' Slot: '+slots[i][0]+'. Visual direction (not literal artwork wording): '+(p.visualIntent||'Use the shared image brief')+'. No added CTA or promotional copy is required. Reference: '+amazon.source+' Image-slot preset, not publisher acceptance.'}));return {placementId:customProfiles[0].id,placementIds:customProfiles.map(p=>p.id),customProfiles,label:o.staticValues.amazonPreset,width:o.width,height:o.height,unitCount:parts.length,omitLogo:true};}
      if(o.featureId===5&&o.pdpPack===true){if(parts.length!==12||o.width!==1600||o.height!==1600||parts.some((p,i)=>p.name!==pdpSlots[i]))return null;return profile('pdp-pack','full PDP pack',{unitCount:12,omitLogo:true});}if(!parts.length||parts.some(p=>!Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width<64||p.height<64||p.width>8192||p.height>8192))return null;
      if(o.featureId===5&&parts.length===1&&o.width===1600&&o.height===1600&&o.formatId==='custom')return profile('commerce-gallery','product-page image');
      const customAmazon=o.featureId===6&&/^amazon(?:\s+(?:india|in))?$/i.test(String(o.staticValues?.marketplace||'').trim());
      const customProfiles=parts.map((p,i)=>({id:'custom:recipe-'+(o.featureId===5?'product-image':'marketplace-module')+'-'+String(i+1).padStart(2,'0'),name:p.name||'Item '+(i+1),platform:o.featureId===5?'Product page':customAmazon?'Amazon A+':'Marketplace module',publisher:'studio',placement:'image-module',assetType:'static',canvas:{width:p.width,height:p.height,unit:'px'},exportContract:{formats:['png']},displayContext:'Item '+(i+1)+' of '+parts.length+'; '+(p.name||'')+'. '+(p.copy||'')+' User-selected module dimensions; publisher eligibility is not certified.'}));
      return {placementId:customProfiles[0].id,placementIds:customProfiles.map(p=>p.id),customProfiles,label:o.featureId===5?'product-page image set':'marketplace modules',width:o.width,height:o.height,unitCount:parts.length,...(o.featureId===5||customAmazon?{omitLogo:true}:{})};
    }
    if(o.featureId===9){if(!Number.isInteger(o.slides)||o.slides<2||o.slides>6||o.width!==1080)return null;const linkedin=o.staticValues?.platform==='LinkedIn',prefix=linkedin?'linkedin-carousel-':'carousel-';if(o.height===1080&&o.formatId==='square')return profile(prefix+'square',linkedin?'LinkedIn carousel document':'carousel',{carouselSlideCount:o.slides});if(o.height===1350&&o.formatId==='portrait')return profile(prefix+'portrait',linkedin?'LinkedIn carousel document':'carousel',{carouselSlideCount:o.slides});return null;}
    if(o.slides!==1)return null;
    // Explicit variants only: never substitute a nearby canvas or another channel.
    if(o.featureId===1&&o.formatId==='portrait'&&o.width===1080&&o.height===1350)return profile('social-portrait','portrait feed post');
    if(o.featureId===1&&o.formatId==='feed-landscape'&&o.width===1200&&o.height===628)return profile('social-landscape','landscape feed post');
    if(o.featureId===13){
      if(o.formatId==='square'&&o.width===1200&&o.height===1200)return profile('linkedin-square','LinkedIn square post');
      if(o.formatId==='portrait'&&o.width===720&&o.height===900)return profile('linkedin-portrait','LinkedIn portrait post');
    }
    if(o.featureId===7&&o.formatId==='portrait'&&o.width===1080&&o.height===1350)return profile('web-mobile-hero','mobile website hero');
    const selectedClientVariant=(o.featureId===13&&((o.formatId==='square'&&o.width===1080&&o.height===1080)||(o.formatId==='portrait'&&o.width===1080&&o.height===1350)))||(o.featureId===7&&o.formatId==='custom'&&o.width===1920&&o.height===700);
    if(selectedClientVariant){
      const platform=o.featureId===13?'LinkedIn':'Website',label=platform+(o.featureId===13?' feed post':' desktop hero'),id='custom:client-'+(o.featureId===13?'linkedin':'website')+'-'+o.width+'x'+o.height;
      return {placementId:id,label,width:o.width,height:o.height,customProfiles:[{id,name:label,platform,publisher:'studio',placement:o.featureId===13?'feed':'desktop-hero',assetType:'static',canvas:{width:o.width,height:o.height,unit:'px'},exportContract:{formats:['png']},displayContext:label+'. Client-selected dimensions. One concise message; accompanying caption or HTML stays separate. Review at intended viewing width. Publisher acceptance and responsive crop are not certified.'}]};
    }

    if(o.featureId===7&&o.width===1920&&o.height===640&&o.formatId==='banner')return profile('web-banner','website banner');
    if(o.featureId===14&&o.width===1080){if(o.height===1080&&o.formatId==='square')return profile('whatsapp-card','WhatsApp visual');if(o.height===1920&&o.formatId==='story')return profile('whatsapp-status','WhatsApp status');}
    if(o.featureId===5&&o.width===1600&&o.height===1600&&o.formatId==='custom'&&staticParts(o).length===1)return profile('commerce-gallery','product-page image');
    // Persist the assignment identity, not just its canvas. Equal-sized assets
    // need different strategy without routing by user-authored keywords.
    const recipeIdentity={2:'technology-visual',3:'offer-creative',4:'proof-claim',10:'local-store',12:'partner-creative',15:'editorial-cover'}[o.featureId];
    if(recipeIdentity&&((o.featureId===15&&o.width===1200&&o.height===628&&o.formatId==='custom')||(o.featureId!==15&&o.width===1080&&o.height===1080&&o.formatId==='square'))){
      const id='custom:recipe-'+recipeIdentity+'-'+o.width+'x'+o.height,label=features.find(f=>f.id===o.featureId).name;
      return {placementId:id,label,width:o.width,height:o.height,customProfiles:[{id,name:label,platform:o.featureId===15?'Website / link preview':o.featureId===10?'Local store':'Static campaign image',publisher:'studio',placement:recipeIdentity,assetType:'static',canvas:{width:o.width,height:o.height,unit:'px'},exportContract:{formats:['png']},displayContext:staticRecipe(o.featureId).story+' Canvas is the selected Studio preset. Native fields, publishing and acceptance are separate. Use the selected format playbook; the brief supplies the facts.'}]};
    }
    if(o.featureId===13&&o.width===1200&&o.height===627&&o.formatId==='linkedin')return {placementId:'custom:studio-linkedin-post',label:'LinkedIn post',width:1200,height:627};
    if(o.width!==1080)return null;
    if(o.featureId===1&&o.height===1080&&o.formatId==='square')return {placementId:'custom:studio-social-square',label:'square post',width:1080,height:1080};
    if(o.featureId===8&&o.height===1920&&o.formatId==='story')return {placementId:'custom:studio-social-story',label:'Instagram Story',width:1080,height:1920};
    return null;
  }
  // Asset picker catalogue (docs/asset-picker-spec-20261108.json, approved 8 Nov 2026).
  // Names, divisions, size labels and order follow the spec exactly. Presets only start
  // drafts through existing recipes: a card is 'ready' solely when its preset reaches an
  // existing generation profile. 'soon' and 'plan' cards save planning briefs and their
  // outputs carry planningOnly, which generationProfile never routes to generation.
  const messageTypes=['Benefit','Product launch','Offer / price / EMI','Proof / claim','Technology','Comparison','Store news'];
  const assetDivisions=[['social','Social'],['ads','Ads'],['website','Website'],['marketplace','Marketplace'],['messaging','Messaging'],['retail','Retail & print'],['corporate','Corporate & employee'],['partners','Partners & PR'],['sales','Sales & training']].map(([id,name])=>({id,name}));
  const assetCatalogue=(function(){
    const fmt=(featureId,formatId,width,height,staticValues,extra={})=>({featureId,formatId,width,height,...(staticValues?{staticValues}:{}),...extra});
    const social=(platform,publishing)=>({...(platform?{platform}:{}),publishing});
    // Planning-only starting canvas. formatId 'custom' keeps even older engines from matching a profile.
    const plan=(featureId,width,height,extra={})=>({featureId,formatId:'custom',width,height,planningOnly:true,...extra});
    const A4=[1240,1754];
    const rows={
      social:[
        ['instagram-post','Instagram Post','1080 × 1080','Instagram','Organic','ready','instagram',fmt(1,'square',1080,1080,social('Instagram','Organic'))],
        ['instagram-portrait-post','Instagram Portrait Post','1080 × 1350','Instagram','Organic','ready','instagram',fmt(1,'portrait',1080,1350,social('Instagram','Organic'))],
        ['instagram-story','Instagram Story','1080 × 1920','Instagram','Organic','ready','instagram',fmt(8,'story',1080,1920,social('Instagram','Organic'))],
        ['instagram-carousel','Instagram Carousel','Slides · 1080 × 1350','Instagram','Organic','ready','instagram',fmt(9,'portrait',1080,1350,social('Instagram','Organic'),{slides:5})],
        ['facebook-post','Facebook Post','1080 × 1080','Facebook','Organic','ready','facebook',fmt(1,'square',1080,1080,social('Facebook','Organic'))],
        ['facebook-story','Facebook Story','1080 × 1920','Facebook','Organic','ready','facebook',fmt(8,'story',1080,1920,social('Facebook','Organic'))],
        ['facebook-carousel','Facebook Carousel','Slides · 1080 × 1080','Facebook','Organic','ready','facebook',fmt(9,'square',1080,1080,social('Facebook','Organic'),{slides:5})],
        ['landscape-post','Landscape Post','1200 × 628','Facebook / LinkedIn','Organic','ready','landscape',fmt(1,'feed-landscape',1200,628,social('','Organic'))],
        ['linkedin-post','LinkedIn Post','1200 × 627','LinkedIn','Organic','ready','linkedin',fmt(13,'linkedin',1200,627,social('','Organic'))],
        ['linkedin-carousel','LinkedIn Carousel','PDF slides','LinkedIn','Organic','ready','linkedin',fmt(9,'square',1080,1080,{platform:'LinkedIn',narrativeType:'Feature',publishing:'Organic'},{slides:5})],
        ['youtube-community-post','YouTube Community Post','Square or portrait','YouTube Community','','soon','youtube',plan(1,1080,1080)],
        ['meme-trend-post','Meme / Trend Post','1080 × 1350','Instagram / Facebook','','soon','spark',plan(1,1080,1350)],
        ['creator-ugc-post','Creator / UGC Post','1080 × 1350','Instagram / Facebook','','soon','camera',plan(1,1080,1350)]
      ],
      ads:[
        ['instagram-feed-ad','Instagram Feed Ad','1080 × 1350','Instagram','Paid','ready','instagram',fmt(1,'portrait',1080,1350,social('Instagram','Paid'))],
        ['instagram-story-ad','Instagram Story Ad','1080 × 1920','Instagram','Paid','ready','instagram',fmt(8,'story',1080,1920,social('Instagram','Paid'))],
        ['facebook-feed-ad','Facebook Feed Ad','1080 × 1080','Facebook','Paid','ready','facebook',fmt(1,'square',1080,1080,social('Facebook','Paid'))],
        ['facebook-story-ad','Facebook Story Ad','1080 × 1920','Facebook','Paid','ready','facebook',fmt(8,'story',1080,1920,social('Facebook','Paid'))],
        ['google-pmax-set','Google PMax Set','Landscape, square, portrait','Google Performance Max','Paid','ready','google',fmt(1,'square',1080,1080,{platform:'PMax',imageRatios:'Landscape + square + portrait',publishing:'Paid'})],
        ['google-display-banners','Google Display Banners','Standard sizes','Google Display','Paid','soon','google',plan(1,1200,628,{staticValues:{publishing:'Paid'}})]
      ],
      website:[
        ['website-banner','Website Banner','1920 × 640','Own website','','ready','web',fmt(7,'banner',1920,640,{websiteType:'Banner',brandedHost:'Yes'})],
        ['homepage-hero','Homepage Hero','≈ 1920 × 700','Own website','','ready','web',fmt(7,'custom',1920,700,{websiteType:'Banner'})],
        ['mobile-banner','Mobile Banner','1080 × 1350','Own website (mobile)','','ready','mobile',fmt(7,'portrait',1080,1350,{websiteType:'Banner',brandedHost:'Yes'})],
        ['category-tile','Category Tile','Choose size','Own website','','ready','tile',fmt(7,'custom',1080,1080,{websiteType:'Category tile'})],
        ['collection-card','Collection Card','Choose size','Own website','','soon','tile',plan(7,1080,1080)],
        ['multi-category-module','Multi-category Module','Homepage module','Own website','','soon','grid',plan(7,1920,1080)],
        ['landing-page-hero','Landing Page Hero','Desktop + mobile','Own website','','ready','web',fmt(7,'banner',1920,640,{websiteType:'Banner',responsiveMode:'Desktop + mobile',mobileWidth:'1080',mobileHeight:'1350'})],
        ['landing-page-modules','Landing Page Modules','Benefit · feature · CTA','Own website','','soon','grid',plan(7,1440,900)]
      ],
      marketplace:[
        ['product-page-images','Product Page Images','12-image PDP pack','Own website / marketplace','','ready','bag',fmt(5,'custom',1600,1600,null,{pdpPack:true})],
        ['marketplace-product-images','Marketplace Product Images','White background + gallery','Marketplace','','soon','bag',plan(1,1600,1600)],
        ['listing-feature-cards','Listing Feature Cards','Benefit & feature cards','Own website / marketplace','','soon','cards',plan(1,1080,1080)],
        ['amazon-aplus','Amazon A+ Content','Premium page (recommended) · Basic · Brand Story','Amazon','','ready','amazon',{featureId:6,aplusPage:'premium'}]
      ],
      messaging:[
        ['whatsapp-image','WhatsApp Image','1080 × 1080','WhatsApp','','ready','whatsapp',fmt(14,'square',1080,1080,{channel:'WhatsApp'})],
        ['whatsapp-status','WhatsApp Status','1080 × 1920','WhatsApp','','ready','whatsapp',fmt(14,'story',1080,1920,{channel:'WhatsApp'})],
        ['email-banner','Email Banner','Header / hero','Email','','ready','email',{featureId:14,emailPreset:'Email hero'}],
        ['email-product-block','Email Product Block','Product module image','Email','','soon','email',plan(14,600,400)],
        ['rcs-card','RCS Card','Rich card image','RCS','','ready','rcs',{featureId:14,rcsPreset:'Single card · medium image'}],
        ['rcs-carousel','RCS Carousel','Card set','RCS','','ready','rcs',{featureId:14,rcsPreset:'Carousel medium · medium image'}],
        ['web-push','Web Push','Push image','Web push','','ready','bell',{featureId:14,push:['Web','Landscape image · 2:1']}],
        ['web-push-icon','Web Push Icon','Icon from brand artwork','Web push','','soon','bell',plan(14,512,512,{tool:'push-icons'})]
      ],
      retail:[
        ['google-business-post','Google Business Post','Update · offer · event','Google Business Profile','','ready','pin',{featureId:10,retailPreset:'store'}],
        ['in-store-screen','In-store Screen','Product · offer · campaign slide','Retail screen','','ready','screen',{featureId:10,retailPreset:'screen'}],
        ['store-banner','Store Banner','Choose size','Store','','ready','store',{featureId:10,retailPreset:'store-banner'}],
        ['window-artwork','Window Artwork','Glass panels','Store','','ready','window',{featureId:11,retailPreset:'window'}],
        ['standee','Standee','Roll-up','Store','','ready','standee',{featureId:11,retailPreset:'standee'}],
        ['shelf-wobbler','Shelf Wobbler','Shelf · dangler','Store','','ready','tag',{featureId:11,retailPreset:'wobbler'}],
        ['counter-product-card','Counter / Product Card','Physical size','Store','','ready','cards',{featureId:11,retailPreset:'product-card'}],
        ['wall-graphic','Wall Graphic','Seams & obstructions','Store','','ready','wall',{featureId:11,retailPreset:'wall'}],
        ['price-offer-board','Price / Offer Board','Prices, terms, expiry','Store','','ready','price',{featureId:11,retailPreset:'price'}],
        ['poster-flyer','Poster / Flyer','A4 · A3','Store','','ready','print',{featureId:11,retailPreset:'poster'}],
        ['brochure','Brochure','Panels & folds','Store','','ready','book',{featureId:11,retailPreset:'brochure'}]
      ],
      corporate:[
        ['linkedin-square-post','LinkedIn Square Post','1080 × 1080','LinkedIn','','ready','linkedin',fmt(13,'square',1080,1080)],
        ['linkedin-portrait-post','LinkedIn Portrait Post','1080 × 1350','LinkedIn','','ready','linkedin',fmt(13,'portrait',1080,1350)],
        ['product-announcement','Product Announcement','LinkedIn / social','LinkedIn','','ready','megaphone',fmt(13,'linkedin',1200,627,{occasion:'Product announcement'})],
        ['leadership-post','Leadership Post','Portrait, name & title','LinkedIn','','soon','person',plan(13,1080,1350)],
        ['hiring-post','Hiring Post','Role announcement','LinkedIn','','soon','briefcase',plan(13,1200,627)],
        ['employer-branding-post','Employer Branding Post','People & culture','LinkedIn','','soon','people',plan(13,1080,1080)],
        ['award-milestone-post','Award / Milestone Post','Recognition','LinkedIn','','soon','award',plan(13,1080,1080)],
        ['packaging-still','Packaging Still','Packaging details','LinkedIn / social','','soon','box',plan(13,1080,1080)],
        ['employee-share-card','Employee Share Card','For sharing','WhatsApp / LinkedIn','','soon','share',plan(14,1080,1080)],
        ['employee-status','Employee Status','Vertical','WhatsApp Status','','soon','mobile',plan(14,1080,1920)],
        ['internal-portal-banner','Internal Portal Banner','Employee news','Internal portal','','soon','web',plan(7,1600,400)]
      ],
      partners:[
        ['co-branded-post','Co-branded Post','Two brands','Social','','soon','handshake',plan(12,1080,1080)],
        ['partner-announcement','Partner Announcement','Alliance launch','Social','','soon','handshake',plan(12,1080,1080)],
        ['partner-social-set','Partner Social Set','Coordinated series','Social','','soon','cards',plan(12,1080,1350)],
        ['product-press-image','Product Press Image','High resolution','Media','','soon','camera',plan(1,2400,1600)],
        ['leadership-press-image','Leadership Press Image','High resolution','Media','','soon','person',plan(13,1600,2000)],
        ['product-seeding-pack','Product Seeding Pack','Ordered image set','Media','','soon','box',plan(1,1080,1350)],
        ['blog-hero','Blog Hero','Lead image','Blog','','ready','news',fmt(15,'custom',1200,628)],
        ['article-illustration','Article Illustration','Visual story','Blog','','soon','news',plan(15,1600,900)],
        ['infographic','Infographic','Facts or steps','Blog / social','','soon','chart',plan(15,1080,1350)],
        ['blog-link-preview','Blog / Link Preview','1200 × 630','Website / blog','','soon','link',plan(15,1200,630)]
      ],
      sales:[
        ['sales-one-pager','Sales One-pager','A4','Internal / dealer','','soon','file',plan(11,...A4)],
        ['product-cheat-sheet','Product Cheat Sheet','A4','Internal / dealer','','soon','checklist',plan(11,...A4)],
        ['mobile-reference-card','Mobile Reference Card','Phone screen','Internal / dealer','','soon','mobile',plan(1,1080,1920)],
        ['battlecard','Battlecard','Comparison facts','Internal / dealer','','soon','compare',plan(11,1754,1240)],
        ['training-deck','Training Deck','16 : 9 slides','Internal / dealer','','soon','slides',plan(1,1920,1080)],
        ['catalogue','Catalogue','GT / COCO · planning','Internal / dealer','','plan','book',{featureId:11,retailPreset:'catalogue',planningOnly:true}]
      ]
    };
    // Search-only synonyms; names and labels stay exactly as approved.
    const keywords=(sizeLabel,publishing,status,preset)=>[/1080 × 1920|Vertical|Phone screen/.test(sizeLabel)?'story vertical status':'',/Slides|slides|Card set/.test(sizeLabel)||preset.slides?'carousel slides':'',publishing==='Paid'?'ad advert paid':'',status==='soon'?'coming soon':status==='plan'?'plan planning':'',preset.retailPreset&&preset.featureId===11?'print':''].filter(Boolean).join(' ');
    return assetDivisions.flatMap(division=>rows[division.id].map(([id,name,sizeLabel,channel,publishing,status,glyph,preset])=>Object.freeze({id,name,division:division.name,divisionId:division.id,sizeLabel,channel,...(publishing?{publishing}:{}),status,glyph,keywords:keywords(sizeLabel,publishing,status,preset),preset:Object.freeze(preset)})));
  })();
  function assetCard(id){return assetCatalogue.find(c=>c.id===id)||null;}
  // Builds one draft output through the existing preset helpers; never a new profile.
  function assetCardOutput(cardOrId,language='English'){
    const card=typeof cardOrId==='string'?assetCard(cardOrId):cardOrId;if(!card)throw Error('Choose an available asset.');
    const p=card.preset,o=output(p.featureId);
    if(p.retailPreset)applyRetailPreset(o,p.retailPreset);
    else if(p.emailPreset)applyEmailPreset(o,p.emailPreset);
    else if(p.rcsPreset)applyRcsPreset(o,p.rcsPreset);
    else if(p.push)applyPushPreset(o,p.push[0],p.push[1]);
    // A+ card (9 Nov 2026): the whole Premium page by default; Basic and Brand Story stay one select away.
    else if(p.aplusPage)applyAmazonPreset(o,aplusPresetName(p.aplusPage));
    else{
      Object.assign(o,{formatId:p.formatId,width:p.width,height:p.height});if(p.slides)o.slides=p.slides;
      if(p.staticValues)o.staticValues=clone(p.staticValues);
      if(p.pdpPack){o.pdpPack=true;o.staticParts=pdpSlots.map(name=>({id:uid(),name,copy:'',alt:'',width:1600,height:1600}));}
    }
    o.name=card.name;o.assetCardId=card.id;o.assetChannel=card.channel;o.language=language||'English';
    if(card.status!=='ready'||p.planningOnly)o.planningOnly=true;
    return o;
  }
  // One card starts a quick design; several start one campaign with one output per card.
  function startAssetDraft(brandId,ids){
    const cards=[...new Set(ids||[])].map(assetCard);if(!cards.length||cards.some(c=>!c))throw Error('Choose at least one available asset.');
    const d=startDraft(brandId,cards.length>1?'campaign':'quick',cards[0].preset.featureId);
    d.outputs=cards.map(c=>assetCardOutput(c,d.language));if(cards.length===1)d.name=cards[0].name;
    return d;
  }
  // Fallbacks (8 Nov 2026): when a slow main model was replaced by the job's pinned backup model,
  // say so plainly on the project. A direct re-send to the same model is not worth a label.
  function backupModelNote(job){
    const used=(job?.budget?.receipts||[]).filter(r=>r?.fallback&&r.fallback.model&&r.fallback.model!==r.fallback.primaryModel);
    if(!used.length)return '';
    const models=[...new Set(used.map(r=>r.fallback.model))].join(', ');
    return 'Backup model used: part of this project was planned with '+models+' because the main AI model was slow. The same brand and product checks were applied.';
  }
  // User decision, 8 Nov 2026: a product with one variant uses it; a mattress (website category
  // Mattress/Mattresses) defaults to the standard Queen 72 x 60, else its first Queen size. The
  // default is shown as a suggestion and stays changeable. Anything else still asks.
  function defaultVariant(p){
    const v=p?.variants||[];if(v.length===1)return String(v[0].id);
    if(!/mattress/i.test(String(p?.category||'')+' '+JSON.stringify(p?.taxonomy||'')))return '';
    const queen=v.filter(x=>/^\s*queen\b/i.test(x.name||''));
    const pick=queen.find(x=>/\b72\s*x\s*60\b/i.test(x.name||''))||queen[0];
    return pick?String(pick.id):'';
  }
  // The artwork uses the official product name (the planner's citation check enforces it).
  // Compare the words the brief used for the product with the official name, variants, SKU and
  // brand name, so the appreciation page can flag e.g. "Arctic Ice Pro" before anything is paid for.
  function productNameCheck(product,evidence,brandName=''){
    const shortName=String(product?.name||'').split('|')[0].trim(),words=x=>String(x||'').normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}.+-]*/gu)||[];
    const known=new Set([product?.name,product?.sku,brandName,...(product?.variants||[]).flatMap(v=>[v.name,v.sku]),...(product?.variants||[]).flatMap(v=>v.options||[])].flatMap(words));
    const ignore=new Set(['the','a','an','and','or','for','of','in','on','with','our','new','sofa','mattress','bed','pillow','seater','size','sizes']);
    const extra=[...new Set(words(evidence).filter(w=>!known.has(w)&&!ignore.has(w)&&!/^\d+([.,]\d+)?$/.test(w)))];
    // Show the brief's own spelling ("Pro", not "pro") for display.
    const original=String(evidence||'').normalize('NFKC').match(/[\p{L}\p{N}][\p{L}\p{N}.+-]*/gu)||[],shown=extra.map(w=>original.find(o=>o.toLowerCase()===w)||w);
    return {shortName,extra,shown};
  }
  // The product name exactly as the brief wrote it. Older readings only had a free-text
  // evidence note: use a quoted part of it, and only when the brief contains it word for word.
  function readingBriefName(result,brief=''){
    const p=result?.product||{},text=String(brief||'');if(typeof p.briefName==='string')return text.includes(p.briefName)?p.briefName:'';
    for(const m of String(p.evidence||'').matchAll(/[“"']([^”"']{3,160})[”"']/g))if(text.includes(m[1]))return m[1];
    return '';
  }
  // Home-page brief box (8 Nov 2026): turn the server's brief reading into an ordinary
  // draft. Every value stays editable on the appreciation page and is confirmed there;
  // nothing here is generation authority. Unclear product/variant and offer gaps stay
  // empty so validation keeps asking. See docs/brief-reader-20261108.md.
  function draftFromReading(brandId,reading,{brief='',products=[],today=new Date().toISOString().slice(0,10),id=null,briefDocuments=null}={}){
    const r=reading?.result;if(!r||!Array.isArray(r.assets))throw Error('The brief has not been read yet.');
    const ids=[...new Set(r.assets.map(a=>a.cardId))].filter(id=>assetCard(id)?.status==='ready');
    const d=startAssetDraft(brandId,ids);d.intakeVersion=2;d.brief=String(brief||'');
    // Documents attached on Home were saved under this reserved id; keep both so preflight can verify them.
    if(typeof id==='string'&&/^draft-[a-z0-9-]+$/.test(id))d.id=id;if(Array.isArray(briefDocuments)&&briefDocuments.length)d.briefDocuments=clone(briefDocuments);
    d.briefAutofill={version:1,enabled:false,owned:{},manual:{}}; // the reading replaces local pattern autofill
    const p=products.find(x=>x.id===r.product?.productId&&x.brandId===brandId);let variantName='';
    let variantDefaulted=false;if(p){const v=(p.variants||[]).find(v=>String(v.id)===String(r.product.variantId))||(()=>{const id=defaultVariant(p);variantDefaulted=!!id&&(p.variants||[]).length>1;return (p.variants||[]).find(x=>String(x.id)===id)||null;})();variantName=v&&v.name!=='Default Title'?v.name:'';selectBriefProduct(d,p,v?String(v.id):'');
      const loose=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),wanted=(r.features||[]).map(loose).filter(Boolean),facts=productRtbs(p);
      const matched=facts.filter(f=>wanted.some(w=>loose(f).includes(w)||w.includes(loose(f))));if(matched.length)d.selectedRtbs=matched;else if(!facts.length&&(r.features||[]).length)d.rtbs=r.features.join('\n');}
    if(languages.includes(r.language?.value)){d.language=r.language.value;for(const o of d.outputs)o.language=d.language;}
    if(['Awareness','Consideration','Purchase','Engagement','Education'].includes(r.objective?.value))d.objective=r.objective.value;
    if(r.audience?.value)d.audience=r.audience.value;
    if(r.occasion?.value)d.occasion=r.occasion.value;
    if(r.messageType?.source!=='none'&&messageTypes.includes(r.messageType?.value))applyMessageType(d,r.messageType.value);
    const offer=r.offer||{};
    for(const o of d.outputs){const v=o.staticValues??={};
      if(v.promotionMode==='Yes')Object.assign(v,{offer:offer.wording||'',offerSku:p?p.name+(variantName?' · '+variantName:''):'',offerValidity:'Date range',offerStart:offer.startDate||today,offerEnd:offer.endDate||'',terms:offer.terms||''});
      if(!r.contactDetails&&!v.contactMode)v.contactMode='None';}
    const mandatory=(r.exactWording||[]).filter(w=>!['offer','terms','validity'].includes(w.kind)).map(w=>w.text);if(mandatory.length)d.mandatoryInfo=mandatory.join('\n');
    d.name=projectTitle(d,{automatic:true,productName:p?.name});
    d.briefReading={version:1,id:reading.id,readAt:reading.updatedAt||null,decision:ids.length>1?'campaign':'design',result:clone(r),offerStartAssumed:!!(d.messageType==='Offer / price / EMI'&&!offer.startDate),variantDefaulted};
    return d;
  }
  // Existing placement rules, surfaced before generation. Reads profiles; changes no policy.
  function assetPlatformNote(o){
    if(!o||o.planningOnly)return '';const v=o.staticValues||{},p=generationProfile({focus:'product',outputs:[o]});if(!p)return '';
    if(o.featureId===8)return v.publishing==='Organic'?'Organic stories leave out the added corner logo — the account already shows the brand.':v.publishing==='Paid'?'Story ads keep the approved logo in a top corner.':'Stories: choose Organic or Paid. Organic stories leave out the added corner logo.';
    if(['custom:studio-web-banner','custom:studio-web-mobile-hero'].includes(p.placementId))return v.brandedHost==='Yes'?'Own-website banners leave out the added corner logo — the site header already shows the brand.':v.brandedHost==='No'?'This banner keeps the logo because its page has no branded header.':'Website banners: confirm whether the page header shows the brand. If it does, the added logo is left out.';
    if(p.carouselSlideCount)return 'Carousels show the logo on the first and last slides only.';
    if(p.omitLogo)return (o.name||'This format')+' leaves out the added corner logo.';
    return '';
  }
  function assetPlatformNotes(outputs){return [...new Set((outputs||[]).map(assetPlatformNote).filter(Boolean))];}
  // Single-select message type. Offer turns on the existing promotion fields and
  // records which outputs it changed, so choosing another type restores them.
  function syncMessageTypeOffer(d){
    const offer=d.messageType==='Offer / price / EMI',owned=new Set(d.messageTypePromotion||[]);
    for(const o of d.outputs||[]){
      if(offer){if(o.staticValues?.promotionMode!=='Yes'){(o.staticValues??={}).promotionMode='Yes';owned.add(o.id);}}
      else if(owned.has(o.id)){if(o.staticValues?.promotionMode==='Yes'){delete o.staticValues.promotionMode;if(!Object.keys(o.staticValues).length)delete o.staticValues;}owned.delete(o.id);}
    }
    const ids=new Set((d.outputs||[]).map(o=>o.id)),list=[...owned].filter(id=>ids.has(id));
    if(list.length)d.messageTypePromotion=list;else delete d.messageTypePromotion;return d;
  }
  function applyMessageType(d,type){
    if(type&&!messageTypes.includes(type))throw Error('Choose a supported message type.');
    if(type&&d.messageType!==type)d.messageType=type;else delete d.messageType;
    return syncMessageTypeOffer(d);
  }
  function creativeKey(p,r){return 'creative:'+JSON.stringify([p.id,r.placementId,r.route,r.versionId||'original',r.imageHash||r.imageUrl||'unavailable']);}
  // Labels only: callers escape display text and retain original records unchanged.
  function searchExplanation(query,fields){
    const words=String(query||'').normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    if(!words.length||!searchMatch(query,...Object.values(fields)))return '';
    const labels=Object.entries(fields).filter(([,value])=>words.some(word=>searchMatch(word,value))).map(([label])=>label.toLowerCase());
    return labels.length?'Matches '+labels.slice(0,3).join(' and '):'';
  }
  function browserTitle(brand,view,project){
    const labels={home:'Home',projects:'Projects',brief:'Brief',understood:'Your brief',review:'Design',editor:'Editor',progress:'Progress',download:'Download',versions:'Versions',campaign:'Project',library:'Brand library',favourites:'Favourites',settings:'Settings',costs:'Spend (₹)',deliverables:'Formats',trash:'Trash'};
    const screen=labels[view]||'Studio';
    return (project?project+(view==='project'?'':' · '+screen):screen)+(brand?' — '+brand:'')+' · Creative AI';
  }
  function searchMatch(query,...values){const text=values.flatMap(v=>typeof v==='object'?JSON.stringify(v):String(v??'')).join(' ').normalize('NFKC').toLocaleLowerCase();return String(query||'').normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).every(word=>text.includes(word));}
  function composerStorage(store){
    const defaults=()=>({prompt:'',productId:'',audience:'',style:'',featureId:1,formatChosen:false});
    const key=id=>'creative-ai-home:'+id;
    function read(id){const raw=store.getItem(key(id));if(raw===null)return {version:1,brandId:id,revision:0,data:defaults()};try{const value=JSON.parse(raw);if(value.version!==1||value.brandId!==id||!Number.isInteger(value.revision)||value.revision<1||!value.data)throw Error();for(const field of ['prompt','productId','audience','style'])if(typeof value.data[field]!=='string')throw Error();if(!features.some(f=>f.kind==='image'&&f.id===Number(value.data.featureId)))throw Error();return {...value,data:{...defaults(),...value.data}};}catch{throw Error('Your saved Home draft could not be read. It has not been overwritten.');}}
    function save(id,value){const current=read(id);if(current.revision!==value.revision)throw Error('Home was changed in another tab. Your text is still here; copy it before reloading the saved version.');const data={...defaults(),...value.data};for(const field of ['prompt','productId','audience','style'])if(typeof data[field]!=='string'||data[field].length>50000)throw Error('Home inputs must be text under 50,000 characters.');data.featureId=Number(data.featureId);if(!features.some(f=>f.kind==='image'&&f.id===data.featureId))throw Error('Choose an available image format.');const next={version:1,brandId:id,revision:current.revision+1,data,updatedAt:new Date().toISOString()};store.setItem(key(id),JSON.stringify(next));return next;}
    return {read,save};
  }
  // "Continue working" (user request, 8 Nov 2026): like Canva's recent designs, show every project
  // (drafts with a product, in progress, ready and needing attention) by most recent edit, the same
  // order as the Projects page; ready work is no longer hidden.
  function activeWork(projects){
    return projects.filter(p=>!p.local||!!p.productId).slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  }

  const navigation={
    parse(hash){const [path,query='']=String(hash||'home').replace(/^#/,'').split('?');return {path,view:path.split('/')[0],parts:path.split('/'),params:new URLSearchParams(query)};},
    projects(v={}){const q=new URLSearchParams();for(const [k,value,defaultValue] of [['status',v.filter,'all'],['sort',v.sort,'edited'],['format',v.formatFilter,'all'],['q',v.search,'']])if(value&&value!==defaultValue)q.set(k,value);return 'projects'+(q.size?'?'+q:'');},
    brandRoute(hash){
      const r=this.parse(hash),q=new URLSearchParams();
      if(r.view==='projects')return hash;
      // Keep the section, never a product, reference or project owned by another brand.
      if(r.view==='library'){
        if(['book','asset','inspiration'].includes(r.parts[1]))return 'library/brand';
        if(r.parts[1]==='product')return 'library/products';
        if(r.parts[1]==='manage'&&['logo','reference','font','source'].includes(r.params.get('section')))q.set('section',r.params.get('section'));
        return r.path+(q.size?'?'+q:'');
      }
      if(r.view==='tools'){
        if(['tools/category','tools/assets'].includes(r.path)&&/^[a-z-]+$/.test(r.params.get('group')||''))q.set('group',r.params.get('group'));if(r.path==='tools/assets'&&['quick','campaign'].includes(r.params.get('mode')))q.set('mode',r.params.get('mode'));
        if(['home','library','library/brand','library/products','projects','create'].includes(r.params.get('from')))q.set('from',r.params.get('from'));
        return r.path+(q.size?'?'+q:'');
      }
      if(['home','create','recipes','creatives','favourites','costs','settings','search'].includes(r.view))return r.path;
      return 'projects';
    }
  };
  function toolFormats(group){const catalogue={
    social:[[1,'Instagram Post','1080 × 1080 px'],[8,'Instagram Story','1080 × 1920 px'],[9,'Instagram Carousel','1080 × 1080 px · Slide set'],[1,'PMax Image Set','Multiple sizes · Image set',null,null,'PMax']],
    website:[[7,'Website Banner','1920 × 640 px'],[5,'Product Images','1080 × 1080 px · Image set'],[6,'Marketplace A+ Images','Premium page · 14 images · one story',null,null,null,null,aplusPresetName('premium')],[6,'Amazon A+ Feature Module','300 × 300 px · single module',null,null,null,null,'Amazon feature module'],[6,'Amazon A+ Lifestyle — Image Header','970 × 600 px · single module',null,null,null,null,'Amazon lifestyle module'],[6,'Amazon Brand Story','5 images · background + 3 cards',null,null,null,null,aplusPresetName('brand-story')],[6,'Amazon Basic A+ Page','6 images · 4 modules',null,null,null,null,aplusPresetName('basic')],[7,'Homepage Category Tile','1080 × 1080 px · Adjustable',null,null,null,'Category tile']],
    retail:retailEntries.map(e=>[e.featureId,e.name,e.planningOnly?'Planning brief':e.printId?'Physical size · Print':e.key==='screen'?'1920 × 1080 px · Adjustable':'1080 × 1080 px · Adjustable',null,null,'Retail:'+e.key]),
    messaging:[[14,'WhatsApp Visual','1080 × 1080 px'],[14,'Email Header / Hero','1200 × 600 px',null,null,'Email'],[14,'RCS Card Images','1260 × 540 px · Adjustable',null,null,'RCS'],[14,'Push Notification Image','1024 × 512 px · Adjustable',null,null,'Push'],[14,'Push Notification Icons','Multiple sizes · Icon set',null,null,'Push icons']],
    corporate:[[13,'LinkedIn Post','1200 × 627 px'],[9,'LinkedIn Feature Carousel','1080 × 1080 px · Page set','LinkedIn','Feature'],[9,'LinkedIn Story Carousel','1080 × 1080 px · Page set','LinkedIn','Story'],[15,'Blog / Link Preview','1080 × 1080 px · Adjustable']]
  };return (catalogue[group]||[]).map(([id,name,ratio,carouselPlatform,narrativeType,imagePlatform,websiteType,amazonPreset])=>({id,name,ratio,carouselPlatform,narrativeType,imagePlatform,websiteType,amazonPreset}));}
  return {aplusPageTypes,aplusSlots,aplusSummary,aplusPage,aplusPresetName,aplusNotes,aplusModuleRows,messageTypes,assetDivisions,assetCatalogue,assetCard,assetCardOutput,startAssetDraft,draftFromReading,productNameCheck,readingBriefName,defaultVariant,backupModelNote,assetPlatformNote,assetPlatformNotes,applyMessageType,syncMessageTypeOffer,campaignValidation,campaignGenerationSupported,selectBriefProduct,toolFormats,communicationParts,communicationText,syncCommunicationGoal,autofillSignature,draftAutosaveReady,searchExplanation,browserTitle,projectTitle,projectBriefFocus,nextProjectName,disambiguateProjectNames,shortProductName,briefUnderstanding,useBriefAsset,assetValues,responsiveSlots,assetRequirementSummary,requirementSnapshot,confirmRequirements,confirmationCurrent,fieldProvenance,briefAutofillCandidates,applyBriefAutofill,protectBriefField,undoBriefAutofill,intakeOptions,creativeCount,requiredAssetFields,productRtbs,selectedProductRtbs,rtbItems,suppliedRtbOptions,intakeContext,intakeProgress,catalogueVisuals,retailPrintPresets,retailEntries,retailSizes,retailEntry,applyRetailPreset,retailRecipe,retailProfile,pushDestinations,pushPresets,pushImage,applyPushPreset,pushPreview,rcsPresets,rcsImage,rcsCount,rcsPreview,applyRcsPreset,emailPresets,emailImage,applyEmailPreset,amazonTemplates,amazonImageSlots,amazonImageTemplate,staticRecipeForOutput,applyAmazonPreset,assetCollections,collectionPages,pdpSlots,jobProgress,createProgressPoller,navigation,composerStorage,activeWork,sameDownloadSelection,completeSet,carouselDownload,generationProfile,formatPreviews,staticRecipe,staticParts,featureCoverage,validateBrief,workspaces,workspaceFor,startDraft,assetPlan,planIssues,organization,creativeKey,searchMatch,journeys,reviewSummary,feedbackKey,groups,features,fields,formats,languages,uid,clone,newDraft,output,validate,requiredDetails,units,status,designCheck,safeAsset,normalizeJob,storage};
});
