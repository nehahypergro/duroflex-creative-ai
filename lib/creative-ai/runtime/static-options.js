'use strict';
// Studio design presets. Physical sizes are editable job specifications, never
// universal printer/operator standards. Official evidence is kept separately.
const checkedAt='2026-10-09';
const sources=[
 {id:'google-display',title:'Google uploaded display ad specifications',url:'https://support.google.com/google-ads/answer/1722096?hl=en',checkedAt,authority:'official-platform',scope:'Listed fixed sizes and 150 KB image upload cap. Some sizes have regional restrictions; HTML5 has a different cap.'},
 {id:'youtube',title:'YouTube custom thumbnails',url:'https://support.google.com/youtube/answer/72431?hl=en',checkedAt,authority:'official-platform',scope:'Recommended video 3840×2160; minimum width 640. Upload limits depend on mobile/desktop; vertical-video surfaces may replace the thumbnail.'},
 {id:'linkedin-image',title:'LinkedIn single image ads',url:'https://business.linkedin.com/advertise/ads/ads-guide/single-image-ads',checkedAt,authority:'official-platform',scope:'Recommended landscape/square/portrait canvases; native fields remain separate.'},
 {id:'pinterest',title:'Pinterest creative best practices',url:'https://business.pinterest.com/en-gb/creative-best-practices/',checkedAt,authority:'official-platform',scope:'Vertical image design and product clarity.'},
 {id:'adobe-bleed',title:'Adobe bleed and slug areas',url:'https://helpx.adobe.com/indesign/desktop/print/page-set-up-and-printer-marks/print-bleed-and-slug-areas.html',checkedAt,authority:'production-guidance',scope:'Extend artwork beyond trim; trim, bleed and printer marks are distinct.'},
 {id:'adobe-boxes',title:'Adobe PDF printer marks and page boxes',url:'https://helpx.adobe.com/acrobat/using/printer-marks-hairlines-acrobat-pro.html',checkedAt,authority:'production-guidance',scope:'MediaBox, TrimBox and BleedBox; confirm marks with printer.'},
 {id:'moo-flyers',title:'MOO flyer artwork guidelines',url:'https://www.moo.com/us/flyers/design-guidelines',checkedAt,authority:'vendor-specific',scope:'MOO specifies 300dpi photographs, safe area and bleed. Its exact sizes/margins are not universal.'},
 {id:'hopkins-folds',title:'Hopkins folding templates',url:'https://www.hopkinsprinting.com/folding/',checkedAt,authority:'vendor-specific',scope:'Roll/letter folds may require narrower inner panels; use the selected printer template.'},
 {id:'vista-materials',title:'VistaPrint India marketing materials',url:'https://www.vistaprint.in/marketing-materials',checkedAt,authority:'vendor-specific',scope:'Material categories and vendor templates; no universal dimensions/dielines.'}
];
const digital=[
 ['linkedin-square','LinkedIn image · square','Social',1200,1200,'LinkedIn','linkedin-image'],
 ['linkedin-portrait','LinkedIn image · portrait','Social',720,900,'LinkedIn mobile','linkedin-image'],
 ['whatsapp-status','WhatsApp status','Social',1080,1920,'WhatsApp'],
 ['whatsapp-card','WhatsApp share card','Social',1080,1080,'WhatsApp'],
 ['web-mobile-hero','Website hero · mobile','Web & email',1080,1350,'Website'],
 ['web-banner','Website banner','Web & email',1920,640,'Website'],
 ['email-banner','Email banner','Web & email',1200,400,'Email'],
 ['app-banner','App promotional banner','Web & email',1200,600,'Owned app'],
 ['commerce-collection','Collection cover','Commerce',1600,900,'Product page'],
 ['commerce-gallery','Product gallery image','Commerce',1600,1600,'Product page'],
 ['commerce-comparison','Product comparison chart','Commerce',1600,1200,'Product page'],
 ['sales-one-pager','Digital sales one-pager','Marketing',1240,1754,'Sales'],
 ['presentation-cover','Presentation cover','Marketing',1920,1080,'Presentation'],
 ['event-agenda','Digital event agenda','Marketing',1080,1920,'Digital marketing'],
 ['store-screen-landscape','Store screen · landscape','Retail screens',1920,1080,'Retail display'],
 ['store-screen-portrait','Store screen · portrait','Retail screens',1080,1920,'Retail display'],
 ['youtube-thumbnail','YouTube thumbnail','Social',3840,2160,'YouTube','youtube']
].map(([slug,name,category,width,height,platform,source])=>({id:'custom:studio-'+slug,name,category,width,height,platform,kind:'static',sourceIds:source?[source]:[],guidelines:category==='Commerce'?'Keep the exact SKU recognizable. A promotional tile is not a certified marketplace primary image.':'Use one clear message and readable type at the final viewing size. Keep captions/native publishing controls separate.'}));
const thumbnail=digital.find(p=>p.id.endsWith('youtube-thumbnail'));thumbnail.maxBytes=1999999;thumbnail.guidelines='Video thumbnail, 16:9, using the current recommended 3840×2160 canvas. Studio conservatively keeps this PNG under 2 MB for mobile uploads; desktop permits larger files. Export resolution does not establish native 4K generated detail. Preview at thumbnail size; some vertical-video surfaces replace this with a 4:5 auto-thumbnail.';
// Listed fixed sizes, including regional sizes; not all are globally eligible.
const display=[[200,200,'small-square'],[240,400,'vertical-rectangle'],[250,250,'square'],[250,360,'triple-widescreen'],[300,250,'inline-rectangle'],[336,280,'large-rectangle'],[580,400,'netboard'],[120,600,'skyscraper'],[160,600,'wide-skyscraper'],[300,600,'half-page'],[300,1050,'portrait'],[468,60,'banner'],[728,90,'leaderboard'],[930,180,'top-banner'],[970,90,'large-leaderboard'],[970,250,'billboard'],[980,120,'panorama'],[300,50,'mobile-banner-300'],[320,50,'mobile-banner-320'],[320,100,'large-mobile-banner']].map(([width,height,slug])=>({id:'custom:studio-display-'+slug,name:'Display · '+slug.replaceAll('-',' ')+' · '+width+'×'+height,category:'Display',width,height,platform:'Google Display',kind:'static',sourceIds:['google-display'],maxBytes:150000,guidelines:'Fixed uploaded static image. Minimal headline, logo and action; no dense body copy. Inspect legibility at actual '+width+'×'+height+' pixels. Native campaign settings and publisher approval remain separate.'}));
for(const [slug,market] of [['triple-widescreen','Sweden'],['netboard','Norway'],['top-banner','Denmark'],['panorama','Sweden']]){const p=display.find(p=>p.id.endsWith('-'+slug));p.guidelines+=' Google lists this as a regional image size for '+market+'; verify campaign inventory and region before publishing.';}
const physical=require('../../../public/creative-ai/studio-model').retailPrintPresets;
module.exports={checkedAt,sources,presets:[...digital,...display,...physical]};
