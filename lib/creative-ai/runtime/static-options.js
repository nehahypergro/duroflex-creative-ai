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
const physical=[
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
module.exports={checkedAt,sources,presets:[...digital,...display,...physical]};
