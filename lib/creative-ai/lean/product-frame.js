'use strict';
// Product framing v1 (Neha, 25 Nov 2026: "Yes, fix it", after the local room test: the Duroflex Airboost 6.8 Instagram
// portrait post, creative-37735ea7, had the mattress run off the right edge in its first drawing AND its one redraw).
// Saved checks up to that day: 25 of 188 first drawings of a mattress, topper or protector had the product cut by a
// canvas edge (7 of 25 in tall formats), almost always at the left or right end; 0 of 166 sofa drawings. The planner had
// already written "do not crop the mattress" (the shared COMPOSITION rule) and planned it across 80% of the width; the
// image model draws a long, flat product larger than planned, so one end runs off. New lean jobs pin productFrameVersion 1:
//  - the PLANNER gets this note for a long, flat product and writes the size and the clear space beyond both ends in its
//    own page plan, which is what reaches the image model (no fixed line is added to the image brief; Neha, 22 Nov 2026:
//    "planner writes it");
//  - the one layout REDRAW, when a finding says the product is cut by an edge, is told to draw the product clearly
//    smaller with the camera pulled back (any product; the record pins it).
// No paid call is added. Earlier jobs keep their planning input and redraw wording.
const VERSION=1;
const LONG=/\b(mattress(es)?|topper|protector|bed)\b/i;
function longProduct(name){return LONG.test(String(name||''));}
const tall=s=>{const d=s?.description?.dimensions;return !!(d?.width&&d?.height&&d.width/d.height<0.9);};
// The planner input (input.productFrame), only for a long, flat product.
function section(name,selection=[]){
 if(!longProduct(name))return null;
 const anyTall=selection.some(tall);
 return {version:VERSION,
  rule:'This product is long and flat. Image models draw it larger than planned, so one end runs off the left or right edge: in saved designs this happened to about one mattress drawing in eight'+(anyTall?', and to more than one in four on tall pages,':',')+' while sofas never did. On every page that shows the whole product (not a deliberate close-up of one detail), plan it smaller than you otherwise would: the whole product, with both ends and any base or layer stack, takes at most about two-thirds of the canvas width'+(anyTall?' (about 60% on a tall page)':'')+', with plain floor, wall or backdrop visible beyond both ends. For a three-quarter view, pull the camera back rather than filling the frame. Write this size and the clear space beyond both ends in that page\'s productPlacement and spacingAndCrop, in your own words, so the image model reads it.'};
}
// A finding that says the product is cut by an edge (the same words edge fit looks for, about the product).
const CUT=/cut off|cut by|cropped|clipped|runs? off|extends? (past|beyond|off|through)|beyond the [a-z ]*edge|continues? (through|beyond|past)|truncat|canvas boundary/i;
const PRODUCT=/product|mattress|sofa|couch|seater|recliner|bed\b|base|pillow|cushion|topper|protector|chair|stack/i;
function cutProduct(findings=[]){return findings.some(f=>{const t=String(f.evidence||'');return CUT.test(t)&&PRODUCT.test(t);});}
const REDRAW_LINE=' Last time the product was drawn too large and ran off the edge: draw it clearly smaller this time and pull the camera back, so both ends of the product, with some floor, wall or backdrop beyond them, sit inside the picture.';
function redrawLine(record,findings){return record?.productFrameVersion===VERSION&&cutProduct(findings)?REDRAW_LINE:'';}

// ---- Layer stack v1 (Neha, 25 Nov 2026: "Yes, all four", after the local variety batch) ----
// The Sleepyhead Flip infographic (creative-6957b50b) put its two side labels on the left and the exploded layer stack to
// their right, drawn as wide as the whole mattress, so the stack ran off the right edge in the drawing and in its redraw.
// At least 5 saved designs had an exploded or stacked layer view cut by an edge. The framing note above covers the whole
// product, not a stack that shares the width with its labels. New lean jobs pin layerStackVersion 1: when a page may show
// the inside (an official construction picture is attached), the planner gets this note and writes the stack's width and
// where its labels sit in its own page plan; a redraw for a cut stack says how to fit it. Earlier jobs keep theirs.
const STACK_VERSION=1;
function stackSection(construction){
 if(!construction?.picture)return null;
 return {version:STACK_VERSION,rule:'LAYER STACK: on a page that shows the product\'s layers (an exploded view, a stack of layer slabs or a cutaway), the whole stack, every layer and every label stay inside the canvas with clear space (about 6% of the width) between the stack and each edge. Labels beside the stack share the width with it: with labels on one side, the stack takes at most about half the canvas width and sits clear of the far edge; otherwise put the labels above, below or between the layers. The stack need not be as wide as the whole-product view on the same page. Write the stack\'s width and where its labels sit in that page\'s productPlacement and spacingAndCrop, in your own words.'};
}
const STACK_CUT=/cut off|cut by|cropped|cropping|clipped|cutting off|runs? (off|through)|extends? (past|beyond|off|through)|beyond the [a-z ]*edge|continues? (through|beyond|past)|truncat|canvas boundary/i;
const STACK_WORDS=/layer|stack|exploded|construction|cutaway|slabs?\b/i;
function cutStack(findings=[]){return findings.some(f=>{const t=String(f.evidence||'');return STACK_CUT.test(t)&&STACK_WORDS.test(t);});}
const STACK_REDRAW_LINE=' The layer stack ran off the edge last time: draw the whole stack narrower (at most about half the canvas width) with clear space beyond its far edge, and put its labels on the other side of it or above it, so every layer and label sits inside the picture.';
function stackRedrawLine(record,findings){return record?.layerStackVersion===STACK_VERSION&&cutStack(findings)?STACK_REDRAW_LINE:'';}
module.exports={VERSION,longProduct,section,cutProduct,redrawLine,REDRAW_LINE,STACK_VERSION,stackSection,cutStack,stackRedrawLine,STACK_REDRAW_LINE};
