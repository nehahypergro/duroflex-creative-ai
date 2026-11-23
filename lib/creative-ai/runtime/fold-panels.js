'use strict';
// Fold panels v1 (Neha, 21 Nov 2026: "Draw panels separately"). Folded print (bi-fold, letter/tri-fold, Z-fold) was
// drawn as one picture with the fold given only in millimetres and words. The model guessed where the fold went:
// the hosted Prana brochure split at about 40% of the width, and 2 of 4 local faces drew a fold line although
// told not to. Layout findings are not auto-corrected, so every run repeated it. New lean jobs pin
// foldPanelVersion 1: each panel of a folded face is its own picture at the panel's own shape, fitted to the panel's
// exact pixels and joined, so every fold sits exactly where the print geometry puts it. Panels after the first get
// the first saved panel as a continuity reference (verified by brand-isolation.verifyFoldAnchor).
// Fold logo v1 (Neha, 23 Nov 2026: "yes fix both", after the paid local brochures of 22 Nov). Every panel request got
// the logo picture, so the model drew a logo on each panel: the Duroflex outside face and the Sleepyhead inside face
// both came back with two logos and failed "logo once". New lean jobs pin foldLogoVersion 1: the planner names the one
// panel that carries each face's logo (logoPanel); only that panel's request gets the logo picture, and the others get
// a brief that says no logo and numbers the attached pictures without it (record.foldLogo, written at planning).
// Fold redraw v1 (same decision): folded faces were left out of the one layout redraw, so the cut-off cover mattress
// stayed. New lean jobs pin foldRedrawVersion 1: a face with a layout finding is drawn again panel by panel with the
// findings described (lean-workflow.js redrawLayout), joined, checked once and kept only if better.
const sharp=require('sharp');
const VERSION=1,ANCHOR_ID='fold-panel-anchor',LOGO_VERSION=1,REDRAW_VERSION=1;
const ROLES={
 half:[['back panel (left of the fold)','front cover (right of the fold)'],['inside left panel','inside right panel']],
 letter:[['fold-in flap (left panel)','back panel (centre)','front cover (right panel)'],['inside left panel','inside centre panel','inside right panel']],
 z:[['panel 1 (left)','panel 2 (centre)','panel 3 (right)'],['panel 4 (left)','panel 5 (centre)','panel 6 (right)']]
};
function widthsMm(print){
 if(!print||!print.fold||print.fold==='none')return null;
 const t=Number(print.trimWidthMm);if(!(t>0))return null;
 if(print.fold==='half')return [t/2,t/2];
 if(print.fold==='z')return [t/3,t/3,t/3];
 const w=print.panelWidthsMm;return Array.isArray(w)&&w.length===3&&w.every(n=>Number(n)>0)&&Math.abs(w.reduce((a,b)=>a+b,0)-t)<=.05?w.map(Number):null;
}
function panelCount(print){return widthsMm(print)?.length||0;}
// Pixel layout of one flat face: the first panel carries the left bleed, the last the right bleed, and every fold
// sits at bleed + the panels before it, scaled from the artboard to the canvas.
function layout(print,width,height){
 const w=widthsMm(print);if(!w||!Number.isSafeInteger(width)||!Number.isSafeInteger(height))return null;
 const bleed=Number(print.bleedMm)||0,artboard=Number(print.geometry?.artboard?.width)||Number(print.trimWidthMm)+2*bleed,scale=width/artboard;
 const folds=[];let at=bleed;for(const mm of w.slice(0,-1)){at+=mm;folds.push(Math.round(at*scale));}
 const edges=[0,...folds,width];
 return {fold:print.fold,foldsPx:folds,panels:edges.slice(0,-1).map((x,i)=>({index:i,x,width:edges[i+1]-x,height}))};
}
function roleOf(print,faceIndex,i){const set=ROLES[print.fold]||ROLES.z;return (set[faceIndex>=2?1:0]||[])[i]||'panel '+(i+1);}
// logo: 'here' (this panel carries the face's one logo) or the role of the panel that does (no logo on this one).
// redraw: the ONE REDRAW points in the base brief were found on the whole face.
function prompt(base,{print,faceIndex,faceLabel,panel,count,anchored,logo=null,redraw=false}){
 const role=roleOf(print,faceIndex,panel.index);
 const logoLine=logo==='here'?' This panel carries this face\'s one brand logo (the attached identity image): draw it once, here.':logo?' No brand logo on this panel: this face\'s one logo sits on the '+logo+', which is drawn separately. Do not draw the brand logo or wordmark here; logos printed on the product itself stay as they are.':'';
 const redrawLine=redraw?' The ONE REDRAW points above were found on the whole face: fix every point that concerns this panel.':'';
 return base+'\n\nFOLD PANEL DRAWING (one panel of '+count+'): this request draws ONLY the '+role+' of the '+(faceLabel||'flat face')+', as a picture of its own. The whole canvas you draw is that one panel: panel '+(panel.index+1)+' of '+count+', left to right. Put on it only the copy, logo, product and imagery that the brief above places on this panel; every other panel is drawn separately and joined to this one exactly at the fold. Do not draw the other panels, a second cover, a fold line, crease, shadow, gutter, divider or border. Let the background run cleanly to the '+(panel.index===0?'right':panel.index===count-1?'left':'left and right')+' edge, where the fold will be. Keep copy, logo and the essential product clear of that edge by the stated fold clearance. Ignore any earlier canvas size or crop instruction: this panel is the whole canvas.'+logoLine+redrawLine+(anchored?' The last attached image is the first panel of this same face, already drawn: match its background colour, lighting, typography style, palette and photographic treatment so the panels read as one design. It is a continuity reference only, not product evidence; do not copy its words, logo placement or product.':'');
}
// Planning note for pinned jobs: panels are planned as separate, equal-weight fold panels.
// Fold logo v1: the planner also names the one panel that carries each face's logo (schema field logoPanel).
function planningNote(print,{logo=false}={}){
 const n=panelCount(print);if(!n)return null;
 return {version:VERSION,panels:n,...(logo?{logoPanel:{version:LOGO_VERSION,rule:'For every face, write logoPanel: the number of the one panel, counted from the left (1 to '+n+'), that carries that face\'s brand logo. The logo is drawn on that panel only, never on another panel of the same face; put it there in logoPlacement too. On a face with no added logo the number is ignored.'}}:{}),rule:'Each flat face is drawn as '+n+' separate panel pictures joined exactly at the fold'+(n>2?'s':'')+'. Plan each panel as its own self-contained layout with its own role (for example back left, cover right). Nothing may cross a fold: no photograph, headline, product or background element spans two panels. Do not ask for a visible fold line, crease, divider or a deliberately off-centre panel split; the fold positions come from the print geometry, not the picture.'};
}
async function join(parts,lay){
 const {width,height}={width:lay.panels.reduce((a,p)=>a+p.width,0),height:lay.panels[0].height};
 return sharp({create:{width,height,channels:3,background:{r:255,g:255,b:255}}}).composite(parts.map((bytes,i)=>({input:bytes,left:lay.panels[i].x,top:0}))).png().toBuffer();
}
function anchor(bytes,bindingKey,sha256){return {assetId:ANCHOR_ID,bindingKey,ownership:'generated-project-reference',roles:['visual-style'],sha256,imageData:'data:image/png;base64,'+bytes.toString('base64')};}
// Extra paid images a pinned job needs: one per extra panel per folded face, per design option.
function extraImages(selection,options=1){return (selection||[]).reduce((n,s)=>n+Math.max(0,panelCount(s.description?.print||s.print)-1),0)*options;}
// Fold logo v1: the attachments for a panel without the logo (the logo picture left out).
function withoutLogo(attachments,foldLogo){return foldLogo?attachments.filter(a=>a.assetId!==foldLogo.logoAssetId):attachments;}
module.exports={VERSION,ANCHOR_ID,LOGO_VERSION,REDRAW_VERSION,widthsMm,panelCount,layout,roleOf,prompt,planningNote,join,anchor,extraImages,withoutLogo};
