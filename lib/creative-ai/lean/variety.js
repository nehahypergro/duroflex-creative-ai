'use strict';
// Variety memory v1 (Neha, 25 Nov 2026: "Yes, all four", after the local variety batch of 6 designs per brand). New lean
// jobs pin varietyVersion 1 (with client creative direction). In that batch Duroflex rooms kept landing on warm ivory
// with the same few props (a yoga mat in two of six) and Sleepyhead people kept wearing an orange or pink tee with purple
// or cobalt trousers, because each plan was written without knowing what the brand's other designs had just used. The
// Studio already remembered each product's recent palettes (channel craft); this remembers each brand's recent scenes:
//  - after planning, each unit's scenes (room or limbo, backdrop, named elements, outfits) are added to the brand's own
//    history file (output/creative-ai/brands/<brandId>/campaign-headlines.json, never shared across brands);
//  - before planning, the brand's most recent designs (any product, last 30 days) are given to the planner with a rule to
//    make this one clearly different within the brand's direction (room type, wall colour or finish, props, outfits);
//  - the planner writes each person's outfit in pages[].scene.wardrobe, so the next design can differ, and the image brief
//    names that outfit.
// Planning guidance only: no plan check and no image check (taste is not pass/fail). Earlier jobs keep their contracts.
const VERSION=1,DESIGNS=8,DAYS=30,PAGES_PER_ENTRY=2;
const clip=(s,n)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,n);

// The scenes one plan used, as saved in the brand's history (first two pages; short, clipped phrases).
function record(plan){
 return (plan?.pages||[]).filter(p=>p.scene&&['room','limbo'].includes(p.scene.type)).slice(0,PAGES_PER_ENTRY).map(p=>({type:p.scene.type,backdrop:clip(p.scene.backdrop,200),elements:(p.scene.elements||[]).map(e=>clip(e,80)).filter(Boolean).slice(0,6),...(clip(p.scene.wardrobe,200)?{wardrobe:clip(p.scene.wardrobe,200)}:{})}));
}
// Sanitises scenes read from or written to the history file.
function clean(scenes){return Array.isArray(scenes)?scenes.filter(s=>s&&['room','limbo'].includes(s.type)).slice(0,PAGES_PER_ENTRY).map(s=>({type:s.type,backdrop:clip(s.backdrop,200),elements:(Array.isArray(s.elements)?s.elements:[]).map(e=>clip(e,80)).filter(Boolean).slice(0,6),...(clip(s.wardrobe,200)?{wardrobe:clip(s.wardrobe,200)}:{})})):[];}

// The head noun of a styling piece ("a rolled yoga mat by the wall" -> "mat"), so the same kind of piece is counted once
// per design whatever its wording.
const AFTER=/\s(?:by|on|in|near|beside|against|with|under|leaning|at|from|across|over|behind|next|resting|draped|hanging|placed|for|and|that|which|to)\s.*$/;
function itemKey(element){
 const words=String(element||'').toLowerCase().replace(/[^a-z\s-]/g,' ').replace(/\s+/g,' ').trim().replace(AFTER,'').split(' ').filter(Boolean);
 let w=words[words.length-1]||'';if(w.length>3&&/[^s]s$/.test(w))w=w.slice(0,-1);return w;
}

// This brand's most recent designs (any product), newest first, excluding the unit being planned. Deterministic for a
// given history; saved once per planning unit with the headlines, so a resumed plan sees the same list.
function recent(history,{jobId,unitKey,now=Date.now(),days=DAYS,designs=DESIGNS}={}){
 const since=now-days*864e5,entries=[];
 for(const e of [...(history?.entries||[])].reverse()){
  if(e.jobId===jobId&&e.unitKey===unitKey||!(Date.parse(e.at)>=since))continue;
  const scenes=clean(e.scenes);if(!scenes.length)continue;
  entries.push(scenes);if(entries.length>=designs)break;
 }
 const all=entries.flat(),distinct=(list,n)=>[...new Set(list.filter(Boolean))].slice(0,n);
 const counts=new Map(),example=new Map();
 for(const scenes of entries){const keys=new Set();for(const s of scenes)for(const e of s.elements){const k=itemKey(e);if(k.length<3)continue;keys.add(k);if(!example.has(k))example.set(k,e);}for(const k of keys)counts.set(k,(counts.get(k)||0)+1);}
 const repeated=[...counts.entries()].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8).map(([k,n])=>({item:example.get(k),designs:n}));
 return {version:VERSION,designs:entries.length,
  rooms:distinct(all.filter(s=>s.type==='room').map(s=>s.backdrop),6),
  limbo:distinct(all.filter(s=>s.type==='limbo').map(s=>s.backdrop),4),
  elements:distinct(all.flatMap(s=>s.elements),16),
  repeated,
  wardrobe:distinct(all.map(s=>s.wardrobe),6)};
}

// Planner rule line (inside the client direction rule). recentDesigns: the saved list for this unit (may be empty).
function rule(variety){
 const ask='Write each person\'s outfit (garments, colours, accessories) in scene.wardrobe, "" when the page shows no one.';
 if(!variety?.designs)return 'VARIETY: '+ask+' The brand\'s next designs will use it to stay different.';
 return 'VARIETY: creativeDirection.variety lists what this brand\'s '+variety.designs+' most recent design'+(variety.designs>1?'s':'')+' (any product) already used. Make this design clearly different, within the brand\'s direction: '
  +[variety.rooms.length?'a different kind of room and a different wall colour or finish from variety.rooms':'',
    variety.limbo.length?'a different backdrop colour from variety.limbo':'',
    variety.elements.length?'different styling pieces from variety.elements'+(variety.repeated.length?' (never use a piece in variety.repeated again: it already appeared in several designs)':''):'',
    variety.wardrobe.length?'when people appear, different garments and outfit colours from variety.wardrobe':''].filter(Boolean).join('; ')
  +'. Where the campaign look asks for this product\'s colour family, keep the family and vary the shade, the room, the pieces and the outfits. '+ask;
}
// The planner's data (input.creativeDirection.variety): what the brand recently used.
function input(variety){return variety?.designs?{version:VERSION,designs:variety.designs,rooms:variety.rooms,limbo:variety.limbo,elements:variety.elements,repeated:variety.repeated,wardrobe:variety.wardrobe}:{version:VERSION,designs:0};}
module.exports={VERSION,record,clean,itemKey,recent,rule,input};
