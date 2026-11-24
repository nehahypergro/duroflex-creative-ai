'use strict';
// Live test (23 Nov 2026): the hosted Sleepyhead A4 bi-fold brochure failed planning ("Agent output failed validated
// contract after bounded recovery: …page-01: no web address on the image ("https://mysleepyhead.com/products/original-
// 3-layered-bodyiq-"); links belong in the post, message or page text"). Print may show a bare domain, but the repair
// was told links belong in a post or message, which a brochure does not have, so it kept the full address. The message
// now names the bare domain to write. Pass/fail is unchanged. Both brands; fails before.
const test=require('node:test'),assert=require('node:assert/strict');
const {validate}=require('../../lib/creative-ai/lean/channel-craft');
const CASES=[['Duroflex','https://www.duroflexworld.com/products/back-magic-pro-plus-orthopedic-mattress','duroflexworld.com'],['Sleepyhead','https://mysleepyhead.com/products/original-3-layered-bodyiq-orthopedic-memory-foam-mattress','mysleepyhead.com']];
const input=print=>({channelCraft:{version:1,print,storyPages:[],heroPages:[]}});
const plan=text=>({pages:[{id:'custom_studio-print-brochure-bifold-page-01',copy:[{role:'cta',text:'Explore the range at '+text}]}]});

for(const [brand,url,domain] of CASES)test(brand+': a full web address on print tells the one repair which bare domain to write',()=>{
 assert.throws(()=>validate(plan(url),input(true)),e=>{assert.match(e.message,/no web address on the image/);assert.ok(e.message.includes('write "'+domain+'" with no https://, www. or page path'),e.message);assert.doesNotMatch(e.message,/belong in the post/);return true;});
 assert.throws(()=>validate(plan(domain+'/products/x'),input(true)),new RegExp('write "'+domain.replace('.','\\.')+'"'),'a path without https:// still fails and names the domain');
 assert.doesNotThrow(()=>validate(plan(domain),input(true)),'the bare domain alone is fine on print');
 assert.throws(()=>validate(plan(url),input(false)),/links belong in the post, message or page text/,'a screen format keeps its message');
 assert.throws(()=>validate(plan(domain),input(false)),/links belong in the post/,'and still refuses a bare domain');
});
