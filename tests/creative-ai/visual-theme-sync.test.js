'use strict';
// Regression (8 Nov 2026): scripts/sync-visual-theme.js rewrote everything from its BEGIN marker
// to the end of studio.css, which would have deleted ~25,000 characters of later Studio styles
// (asset picker, navigation, download). It now replaces only the marked theme block.
const test=require('node:test'),assert=require('node:assert/strict');
const {sync,marker,endMarker}=require('../../scripts/sync-visual-theme.js');
const theme=require('node:fs').readFileSync(require('node:path').join(__dirname,'../../public/creative-ai/visual-theme.css'),'utf8');
test('theme sync keeps styles that come after the theme block and is idempotent',()=>{
 const later='\n/* Asset picker */\n.asset-card{color:red}\n';
 const withEnd='a{}\n\n'+marker+'\nold theme\n'+endMarker+'\n'+later;
 const out=sync(withEnd);assert.ok(out.includes('.asset-card{color:red}'));assert.ok(out.includes(theme.trim()));assert.ok(!out.includes('old theme'));assert.equal(sync(out),out);
 const legacy='a{}\n\n'+marker+'\n'+theme+later;
 const out2=sync(legacy);assert.ok(out2.includes('.asset-card{color:red}'));assert.ok(out2.includes(endMarker));assert.equal(sync(out2),out2);
 assert.throws(()=>sync('a{}\n'+marker+'\nsomething unknown\n.later{}'),/Cannot find where the shared theme ends/);
 assert.equal(sync(require('node:fs').readFileSync(require('node:path').join(__dirname,'../../public/creative-ai/studio.css'),'utf8')),require('node:fs').readFileSync(require('node:path').join(__dirname,'../../public/creative-ai/studio.css'),'utf8'),'the real studio.css is unchanged by a sync');
});
