'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {mergeHistory}=require('../../lib/cost-tracker');
const {data}=require('../../scripts/costs/sheet-data');
const {requestsFor,verify}=require('../../scripts/costs/sheet-sync');
test('cost history survives missing job files for both brands without counting duplicate receipts',()=>{
 for(const brand of ['Duroflex','Sleepyhead']){
  const past={id:brand+':one',brand,estimatedUsd:2,actualUsd:null};
  const live={...past,estimatedUsd:3};
  assert.deepEqual(mergeHistory([past],[]),[past]);
  assert.deepEqual(mergeHistory([past],[live]),[live]);
 }
});
test('resolved requests do not stay in historical unknown costs',()=>{
 const pending={id:'unresolved:reasoning:key',estimatedUsd:null,actualUsd:null};
 assert.deepEqual(mergeHistory([pending],[],new Set(['reasoning:key'])),[]);
});
test('sheet uses INR, keeps source USD, and leaves unknown amounts blank',async()=>{
 const base={id:'one',timestamp:'2026-10-20',brand:'Duroflex',estimatedUsd:1,actualUsd:null,estimatedInr:96,actualInr:null};
 const s={entries:[base,{...base,id:'two',brand:'Sleepyhead',estimatedUsd:null,estimatedInr:null}],brands:[{name:'Duroflex'},{name:'Sleepyhead'}],summary:{unknown:1},active:[],coverage:[],fx:{usdToInr:96,rateDate:'2026-10-09',source:'https://example.com'},generatedAt:'2026-10-20'};
 const d=await data(s);
 assert.equal(d.tabs.Summary[1][1],'INR');
 assert.equal(d.tabs.Ledger[1][10],96);
 assert.equal(d.tabs.Ledger[1][17],1);
 assert.match(d.tabs.Ledger[2][12],/,""\)\)$/);
 assert.equal(d.tabs.Ledger[2][13],'Unknown');
 const actual=await data({...s,entries:[{...base,originalCurrency:'INR',originalAmount:100,actualUsd:1.03,actualInr:100}]});
 assert.equal(actual.tabs.Ledger[1][11],100);
 const requests=requestsFor(d,{sheetIds:{Summary:1,Ledger:2,Rates:3,Coverage:4}});
 for(const request of requests){
  assert.equal(Object.keys(request).length,1);
  if(request.updateCells){
   const {range,rows}=request.updateCells;
   assert.equal(rows.length,range.endRowIndex-range.startRowIndex);
   for(const row of rows)assert.equal(row.values.length,range.endColumnIndex-range.startColumnIndex);
  }
 }
});
test('sync completion requires verified count, amount, unknown count and matching snapshot',()=>{
 const expected={fingerprint:'abc',entries:10,unknown:2,knownInr:100};
 assert.doesNotThrow(()=>verify(expected,{...expected}));
 for(const bad of [{entries:9},{knownInr:99},{unknown:0},{fingerprint:'old'},{knownInr:null}]){
  assert.throws(()=>verify(expected,{...expected,...bad}),/NOT saved/);
 }
});
