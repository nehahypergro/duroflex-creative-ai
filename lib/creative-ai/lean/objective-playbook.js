'use strict';
// Objective playbook v1 (user request, 8 Nov 2026): a short rule per campaign objective,
// adapted to the format's viewing context. New lean jobs pin objectivePlaybookVersion 1;
// the rule enters the plan as a planning-only mandatory decision. It shapes the plan's
// copy volume, hierarchy and call to action; the existing visual review then checks the
// artwork against that plan. It never adds offers, prices, deadlines or claims: those
// still come only from the brief and the exact-SKU evidence.
const VERSION=2;
const OBJECTIVES=['Awareness','Consideration','Purchase','Engagement','Education'];
const STAGES={TOFU:'Awareness',MOFU:'Consideration',BOFU:'Purchase'};
// Studio intake stores its internal value (studio-objective.js); 'other' covers both Engagement
// and Education, so only the submitted label can tell them apart.
const INTERNAL={awareness:'Awareness',consideration:'Consideration',action:'Purchase'};

const core={
 Awareness:'AWARENESS (top of funnel): one memorable emotional or brand idea; brand and product recognisable at a glance; minimal words (a short headline, at most one supporting line); soft call to action or none. No price, offer or urgency unless the brief supplies an offer.',
 Consideration:'CONSIDERATION (middle of funnel): lead with ONE key benefit tied to a real need, backed by one or two cited proof points (technology, specification, certification); product shown clearly enough to evaluate; clear headline, proof, action hierarchy; an exploring call to action (Explore, Compare, Know more).',
 Purchase:'PURCHASE (bottom of funnel): the exact product is the hero and instantly recognisable; the reason to buy now is the main message: the supplied offer, price or EMI wording verbatim when the brief gives it, otherwise the strongest supported benefit; one strong, prominent, direct call to action (Shop now, Buy now, Visit store). Urgency words (ends soon, last days, limited time, countdown) only with a real end date in the brief. Never invent an offer, price or deadline; keep supplied terms legible.',
 Engagement:'ENGAGEMENT: invite a response with a relatable moment, question or shareable idea; brand present but not a hard sell; the call to action invites interaction suited to the channel (comment, share, reply, tag). No price or urgency unless supplied.',
 Education:'EDUCATION: teach one thing clearly (how a supported technology works, how to choose, how to care); plain explanatory hierarchy; show only exact-SKU technology evidence, never invented layers or diagrams; more words only where the format is read closely; a learn-more call to action.'
};

// Formats grouped by how people meet them. Order matters: the first match wins.
const CLASSES=[
 ['notification',/web.?push|push.?image|push.?icon|\bpush\b/i,'Notification image: no campaign words on the image; the call to action lives in the notification text.'],
 ['marketplace',/a\+|aplus|marketplace|product.?page.?images|listing|pdp|commerce|gallery/i,'Marketplace / product page: shoppers are evaluating; each image does one evidence-backed job; follow the native versus on-image text policy.'],
 ['close-read',/brochure|catalogue|catalog|one.?pager|cheat.?sheet|battlecard|training|reference.?card|infographic|leaflet/i,'Close reading: richer information is welcome in a clear hierarchy across the available panels.'],
 ['at-shelf',/wobbler|counter|price|offer.?board|shelf/i,'At the shelf or counter: the shopper is beside the product; short, scannable, decision-support words.'],
 ['distance',/poster|flyer|standee|window|wall|store.?banner|in.?store|hoarding|billboard|signage|screen/i,'Seen from a distance: one dominant message, very few large words, recognisable product and brand.'],
 ['story',/story|stories|status|reel/i,'Full-screen vertical story: stop the thumb in the first glance; keep words and logo inside the safe area away from the top and bottom bars.'],
 ['carousel',/carousel|slides?\b/i,'Carousel: the first card earns the swipe; later cards develop the message; the final card carries the action.'],
 ['messaging',/whatsapp|email|rcs|sms|message/i,'Message image: one relevant message read on a phone; detail and links belong in the accompanying message text.'],
 ['banner',/banner|display|pmax|hero|tile|collection.?card|module|link.?preview|blog|portal/i,'Banner / web: small or glanced at beside other content; very few words, one clear action, product and brand legible at small sizes.'],
 ['feed',/post|feed|ad\b|social|linkedin|facebook|instagram|youtube|ugc|meme|press|announcement|share/i,'Social feed: compete in a scrolling feed; one clear focal point, readable on a phone without zooming.']
];

// v2 (9 Nov 2026, live run: Purchase ads came back with feature-label headlines and only a
// "Shop now" button): Purchase sells instead of describing. v1 jobs keep their saved v1 wording.
const purchaseV2='PURCHASE (bottom of funnel): sell, do not describe. The headline is a direct, buyer-focused message in active words that speak to the shopper (second person, "you/your") and make them want to buy now, for example "Get firm back support, night after night" or "Upgrade to orthopedic comfort" - not a feature label or spec list. The strongest supported feature or technology is the reason that backs the headline in one short supporting line. Use real purchase reassurances from the cited product facts when present (trial nights, warranty, delivery). The supplied offer, price or EMI wording appears verbatim and prominently when the brief gives it. One strong, prominent, direct call to action (Shop now, Buy now, Order yours, Visit store). The exact product is the hero and instantly recognisable. Urgency words (ends soon, last days, limited time, countdown) only with a real end date in the brief. Never invent an offer, price or deadline; keep supplied terms legible.';
// One sentence per objective x format class: how that objective changes in that context.
const cells={
 Awareness:{notification:'One evocative, recognisable brand or product moment.',marketplace:'Lead with the product in its most recognisable, aspirational view; no hard-sell wording.',
  'close-read':'Open with the brand idea; keep detail light and inviting.','at-shelf':'Name the product and one memorable idea.',distance:'One emotional headline of a few words and a striking image.',
  story:'One striking full-screen moment and a short headline; a soft swipe or tap prompt at most.',carousel:'First card is the emotional hook; later cards may reveal the idea; soft action at the end.',
  messaging:'One warm, recognisable image with a short line; no hard sell.',banner:'Brand idea and product only; a headline of a few words; soft action.',feed:'One emotional idea with a short headline; product and brand present without hard selling.'},
 Consideration:{notification:'The key benefit made visible in one subject.',marketplace:'Each image proves one supported benefit or detail (technology, material, dimension view).',
  'close-read':'Organise benefits and cited proof points into a scannable hierarchy.','at-shelf':'The one benefit that helps choose, with its proof point.',distance:'One benefit headline with the product; proof stays short.',
  story:'Benefit headline plus one proof point, inside the safe area; explore action.',carousel:'Hook with the benefit, then one proof point per card, then the explore action.',
  messaging:'The benefit and one proof point; detail in the message text.',banner:'Benefit headline, product and an explore action; no long proof text.',feed:'Benefit headline with one cited proof point and an explore action.'},
 Purchase:{notification:'The exact product, clean and recognisable; offer and action stay in the notification text.',marketplace:'Exact product hero with its supported reason to buy; follow the platform rules on prices and offers.',
  'close-read':'Product, supported reason to buy and the supplied offer or terms, clearly laid out; strong action.','at-shelf':'Product name, the supplied price or offer when given, and one reason to buy.',distance:'Product plus the supplied offer in large, few words; a strong action.',
  story:'Product hero, the supplied offer when given and a strong action inside the safe area.',carousel:'First card shows the product and the supplied offer when given; the final card has the strong action.',
  messaging:'Product, the supplied offer when given and one strong action; terms in the message text.',banner:'Product, the supplied offer when given and one prominent action button area.',feed:'Product hero, the supplied offer when given and a prominent direct action.'},
 Engagement:{notification:'A relatable moment that invites a tap.',marketplace:'Show the product in real, relatable use.',
  'close-read':'A question or tip that invites conversation.','at-shelf':'A friendly prompt to try or ask.',distance:'A short, relatable line people want to react to.',
  story:'A question or relatable moment that invites a reply or tap.',carousel:'A relatable story or question across cards; the end invites a comment or share.',
  messaging:'A friendly question or moment that invites a reply.',banner:'A short relatable prompt with an interaction action.',feed:'A relatable moment or question that invites comments or shares.'},
 Education:{notification:'One visual of the supported feature, with no diagram callouts.',marketplace:'One supported technology or detail explained per image, using exact-SKU evidence only.',
  'close-read':'Explain step by step with clear headings, using exact-SKU evidence only.','at-shelf':'One quick fact that helps understand the product.',distance:'One simple idea people can grasp at a glance.',
  story:'One idea per screen, plain words inside the safe area.',carousel:'One step or fact per card in order; learn-more action at the end.',
  messaging:'One useful tip or fact; detail in the message text.',banner:'One simple fact and a learn-more action.',feed:'One clear explanation with a learn-more action.'}
};

function objective(value,stage){
 const v=String(value||'').trim(),match=OBJECTIVES.find(o=>o.toLowerCase()===v.toLowerCase());
 return match||INTERNAL[v.toLowerCase()]||STAGES[String(stage||'').trim().toUpperCase()]||null;
}
function formatClass(selection){
 const d=selection?.description||{},text=[d.name,d.formatName,d.formatId,d.profileId,selection?.id].filter(Boolean).join(' ').replace(/[_-]+/g,' ');
 const found=CLASSES.find(([,pattern])=>pattern.test(text))||(d.carousel?CLASSES.find(([id])=>id==='carousel'):null);
 if(found)return found[0];
 const w=d.dimensions?.width,h=d.dimensions?.height;
 return w&&h&&h/w>=1.6?'story':'feed';
}
// Returns the planning rule for one planning group, or null when the brief has no
// recognised objective (the planner then decides as before).
function rule(intake,selections,label,version=1){
 const name=objective(label,null)||objective(intake?.objective,intake?.funnelStage);
 if(!name)return null;
 const classes=[...new Set((selections||[]).map(formatClass))];
 const formats=classes.map(c=>{const row=CLASSES.find(([id])=>id===c);return row[2]+' '+cells[name][c];});
 return {id:'objective-playbook',tier:'contract',version:version===2?2:1,objective:name,formatClasses:classes,
  text:'OBJECTIVE PLAYBOOK v'+(version===2?2:1)+'. '+(version===2&&name==='Purchase'?purchaseV2:core[name])+' FORMAT: '+formats.join(' ')+' Express this through the plan\'s copy volume, hierarchy, product prominence and call to action; on image-only pages express it through the picture alone, with no added words. Supplied wording, mandatory brand rules, exact SKU identity and claim qualifiers take precedence; never invent offers, prices, deadlines or claims to fit the objective.',
  sourceIds:['user:objective-playbook-20261108']};
}
module.exports={VERSION,OBJECTIVES,core,cells,CLASSES,objective,formatClass,rule};
