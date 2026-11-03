'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('every local Studio script and stylesheet has a server public asset route',()=>{
 const source=fs.readFileSync('lib/creative-ai/runtime/http.js','utf8'),declaration=source.match(/ const publicAssets=(.*);\n/)[1];
 const assets=vm.runInNewContext('('+declaration+')'),html=fs.readFileSync('public/creative-ai/studio.html','utf8');
 for(const m of html.matchAll(/(?:src|href)="(\/creative-ai\/[^"?]+\.(?:js|css))"/g))assert.ok(assets[m[1]]||m[1]==='/creative-ai/session.js'&&fs.readFileSync('lib/admin/studio-access.js','utf8').includes("p==='/creative-ai/session.js'"),'Missing route: '+m[1]);
});
