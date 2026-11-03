'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const templates=require('../../lib/creative-ai/runtime/print-template');
const template={widthMm:300,heightMm:200,folds:[{axis:'x',atMm:98},{axis:'x',atMm:199}],cutOutline:[[0,0],[300,0],[300,200],[0,200]],exclusions:[{label:'Mount',x:10,y:10,width:20,height:10}]};
test('template geometry validates supplied folds, closed cutting outlines and mounting exclusions',()=>{
 assert.deepEqual(templates.validate(template),template);for(const bad of [{...template,folds:[{axis:'x',atMm:301}]},{...template,cutOutline:[[0,0],[300,200],[0,200],[300,0]]},{...template,exclusions:[{label:'Bad',x:299,y:0,width:5,height:5}]}])assert.throws(()=>templates.validate(bad));
 const print={trimWidthMm:300,trimHeightMm:200,panelWidthsMm:[98,101,101],safeMm:5,fold:'letter'},p=templates.inspect(template,print);assert.equal(p.checks.find(c=>c.id==='template-folds').status,'pass');assert.equal(p.artworkClearance,'unverified');
 const zones=[{label:'Logo',x:12,y:12,width:5,height:5},{label:'Headline',x:96,y:40,width:10,height:10},{label:'Body',x:220,y:100,width:40,height:20}];const r=templates.inspect(template,print,zones);assert.equal(r.checks.filter(c=>c.status==='fail').length,2);assert.equal(r.checks.find(c=>c.id==='zone-2').status,'pass');
 const mismatch=templates.inspect(template,{...print,trimWidthMm:290});assert.equal(mismatch.checks.find(c=>c.id==='template-trim').status,'fail');
});
test('template boundary scenarios retain missing evidence and reject contradictory supplied geometry',()=>{
 const bad=[{...template,widthMm:0},{...template,heightMm:Infinity},{...template,folds:[{axis:'z',atMm:10}]},{...template,folds:[{axis:'x',atMm:20},{axis:'x',atMm:20}]},{...template,cutOutline:[[0,0],[1,1],[2,2]]},{...template,cutOutline:[[0,0],[300,0],[300,200],[0,0]]},{...template,cutOutline:[[0,0],[301,0],[300,200]]},{...template,exclusions:[{label:'Empty',x:0,y:0,width:0,height:1}]},{...template,exclusions:[{label:'Outside',x:-1,y:0,width:1,height:1}]},{...template,cutOutline:[[0,0],[300,0],[300,200],[150,0],[0,200]]}];for(const value of bad)assert.throws(()=>templates.validate(value));
 const r=templates.inspect({...template,folds:[{axis:'x',atMm:99}]},{trimWidthMm:300,trimHeightMm:200,panelWidthsMm:[98,101,101],safeMm:5});assert.equal(r.checks.find(c=>c.id==='template-folds').status,'fail');assert.equal(r.artworkClearance,'unverified');
});
