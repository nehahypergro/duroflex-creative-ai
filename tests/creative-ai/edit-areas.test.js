'use strict';
// Live recheck, 10 Nov 2026 (Sleepyhead LinkedIn design, headline pin): the text block grew from the headline
// into the logo above and the smaller body lines below, became larger than a third of the design and fell back
// to the square, so the headline would again be half rewritten. Lines join only when they are close and of a
// similar size. Rows are the local text reader's real output for that design.
const test=require('node:test'),assert=require('node:assert/strict'),areas=require('../../lib/creative-ai/runtime/edit-areas'),pins=require('../../lib/creative-ai/runtime/edit-pins');
const rows=[['sleepyhead™',0.0376,0.0486,0.2939,0.1144],['Support after',0.0407,0.2086,0.4201,0.1203],['office hours.',0.0392,0.3311,0.3968,0.1173],['Orthopedic base.',0.0436,0.5209,0.2791,0.0696],['Cool-to-touch knit.',0.0422,0.5989,0.2951,0.0590],['Learn about',0.0407,0.7604,0.1875,0.0530]].map(([text,x,y,width,height])=>({text,confidence:1,box:{x,y,width,height}}));
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a headline pin covers both headline lines and nothing else',()=>{
 const [pin]=areas.apply([{type:'pin',number:1,x:0.24,y:0.27,area:'large',comment:'Change this headline to: Rest after long workdays.'}],{rows,width:1735,height:906});
 assert.equal(pin.areaBasis,'text-block');const b=pin.areaBox;
 assert.ok(b.y>0.163&&b.y<0.2086,'starts below the logo: '+JSON.stringify(b));assert.ok(b.y+b.height>0.448&&b.y+b.height<0.5209,'ends above the body text: '+JSON.stringify(b));
 assert.ok(b.x<=0.04&&b.x+b.width>=0.46,'covers the full line width');
 const body=areas.apply([{type:'pin',number:1,x:0.15,y:0.56,area:'small',comment:'Change this line to: Firm base foam.'}],{rows,width:1735,height:906})[0];
 assert.equal(body.areaBasis,'text-block');assert.ok(body.areaBox.y>0.45&&body.areaBox.y+body.areaBox.height<0.75,'the two body lines only');
});
