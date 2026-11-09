'use strict';
// Asset picker icons (public/creative-ai/asset-icons.js): one distinct, static, decorative
// SVG per catalogue card, with channel badges that match each card's channel field.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const A=require('../../public/creative-ai/asset-icons.js'),M=require('../../public/creative-ai/studio-model.js');
const cards=M.assetCatalogue;
// Minimal well-formedness check: balanced tags, quoted attributes, single root <svg>.
function wellFormed(svg){
 const stack=[];let roots=0;
 for(const m of svg.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+="[^"<>]*")*)\s*(\/?)>/g)){
  const [,close,name,,self]=m;
  if(close){assert.equal(stack.pop(),name,'closing </'+name+'> matches');continue;}
  if(!stack.length)roots++;
  if(!self)stack.push(name);
 }
 assert.equal(stack.length,0,'all tags closed');assert.equal(roots,1,'single root');
 assert.equal(svg.replace(/<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+="[^"<>]*")*)\s*(\/?)>/g,'').trim(),'','no stray text or malformed tags');
}
const expectedBadges=c=>{const ch=c.channel;return [
 [/Instagram/,'instagram'],[/Facebook/,'facebook'],[/WhatsApp/,'whatsapp'],[/LinkedIn/,'linkedin'],[/YouTube/,'youtube'],[/Google/,'google'],[/Amazon/,'amazon'],[/^Email$/,'email'],[/^RCS$/,'rcs'],[/^Web push$/,'web']
].filter(([re])=>re.test(ch)).map(([,n])=>n).sort();};

test('every catalogue card has its own distinct icon and unknown ids fall back safely',()=>{
 assert.equal(cards.length,77);
 assert.deepEqual([...A.ids].sort(),cards.map(c=>c.id).sort(),'icon table covers exactly the catalogue');
 const svgs=cards.map(c=>A.iconFor(c.id));
 for(const [i,svg] of svgs.entries())assert.match(svg,new RegExp('^<svg class="asset-icon" data-asset-icon="'+cards[i].id+'" '),cards[i].id);
 assert.equal(new Set(svgs).size,77,'no two cards share an identical icon');
 assert.equal(new Set(svgs.map(s=>s.replace(/ data-asset-icon="[^"]+"/,''))).size,77,'icons differ beyond their id label');
 for(const bad of ['nope','',undefined,'<script>','__proto__','constructor'])assert.match(A.iconFor(bad),/data-asset-icon="fallback"/);
});

test('icons are well-formed, decorative, static SVG with no scripts, links, ids or fonts',()=>{
 for(const c of cards){const svg=A.iconFor(c.id);
  wellFormed(svg);
  assert.match(svg,/^<svg [^>]*viewBox="0 0 48 48"/,c.id);
  assert.match(svg,/^<svg [^>]*aria-hidden="true"[^>]*focusable="false"/,c.id);
  assert.doesNotMatch(svg,/<script|<foreignObject|<text|<image|<use|<style|href=|url\(|\son\w+=|\sid=|javascript:|@import|https?:/i,c.id);
  assert.ok(svg.length<9000,c.id+' stays small');
 }
});

test('channel badges match each card channel; paid cards carry the Ad tag',()=>{
 for(const c of cards){const svg=A.iconFor(c.id),want=expectedBadges(c);
  assert.deepEqual([...A.badgesFor(c.id)].sort(),want,c.id+' ('+c.channel+')');
  assert.deepEqual([...svg.matchAll(/class="ai-badge ai-badge-(\w+)"/g)].map(m=>m[1]).sort(),want,c.id+' markup');
  assert.equal(svg.includes('class="ai-ad"'),c.publishing==='Paid',c.id+' Ad tag');
  assert.equal(A.isPaidIcon(c.id),c.publishing==='Paid');
 }
 // Spot checks by channel.
 const by=id=>A.badgesFor(id);
 assert.deepEqual(by('instagram-story'),['instagram']);assert.deepEqual(by('facebook-feed-ad'),['facebook']);
 assert.deepEqual(by('whatsapp-status'),['whatsapp']);assert.deepEqual(by('linkedin-carousel'),['linkedin']);
 assert.deepEqual(by('youtube-community-post'),['youtube']);assert.deepEqual(by('google-pmax-set'),['google']);
 assert.deepEqual(by('google-business-post'),['google']);assert.deepEqual(by('amazon-aplus'),['amazon']);
 assert.deepEqual(by('email-banner'),['email']);assert.deepEqual(by('rcs-carousel'),['rcs']);assert.deepEqual(by('web-push'),['web']);
 assert.deepEqual(by('landscape-post').sort(),['facebook','linkedin']);
 for(const id of ['standee','shelf-wobbler','product-press-image','battlecard','catalogue','website-banner','product-page-images'])assert.deepEqual(by(id),[],id+' has no platform badge');
 // Badges are channel labels only: each platform mark is identical wherever it appears.
 for(const p of A.platforms){const marks=new Set(cards.flatMap(c=>[...A.iconFor(c.id).matchAll(new RegExp('<g class="ai-badge ai-badge-'+p+'" transform="[^"]+">(.*?)</g>(?=<g class="ai-badge|</svg>)','g'))].map(m=>m[1])));assert.ok(marks.size<=1,p+' mark is not altered per card');}
});

test('Studio loads the icon module before studio.js and uses it for picker cards and home quick picks',()=>{
 const html=fs.readFileSync('public/creative-ai/studio.html','utf8'),js=fs.readFileSync('public/creative-ai/studio.js','utf8');
 const icons=html.indexOf('src="/creative-ai/asset-icons.js"'),studio=html.indexOf('src="/creative-ai/studio.js"');
 assert.ok(icons>0&&icons<studio,'asset-icons.js loads before studio.js');
 assert.ok(fs.readFileSync('lib/creative-ai/runtime/http.js','utf8').includes("'asset-icons.js'"),'server serves the icon module');
 assert.match(js,/const assetIcon=c=>typeof AssetIcons!=='undefined'\?AssetIcons\.iconFor\(c\.id\):assetGlyph\(c\.glyph\);/);
 assert.match(js,/asset-tile-cue tone-\$\{h\(c\.divisionId\)\}" aria-hidden="true">\$\{assetIcon\(c\)\}<\/span>/,'home quick pick uses the card icon');
 assert.match(js,/function assetThumb\(card,small=false\)\{const icons=typeof AssetIcons!=='undefined';[^\n]*assetIcon\(card\)/,'picker card uses the card icon');
});
