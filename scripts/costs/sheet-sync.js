'use strict';
const fs=require('fs/promises'),path=require('path');
const {data}=require('./sheet-data');
const {CostTracker}=require('../../lib/cost-tracker');
const root=path.resolve(__dirname,'../..');
function requestsFor(d,config){
 const requests=[];
 const format=(sheetId,rowStart,rowEnd,colStart,colEnd,pattern)=>({repeatCell:{range:{sheetId,startRowIndex:rowStart,endRowIndex:rowEnd,startColumnIndex:colStart,endColumnIndex:colEnd},cell:{userEnteredFormat:{numberFormat:{type:'NUMBER',pattern}}},fields:'userEnteredFormat.numberFormat'}});
 for(const [name,rows] of Object.entries(d.tabs)){
  const sheetId=config.sheetIds[name];if(!Number.isInteger(sheetId))throw Error('Missing observed sheet ID for '+name);
  const width=rows[0].length,rowCount=Math.max(d.capacity,rows.length+100);
  requests.push({updateSheetProperties:{properties:{sheetId,gridProperties:{rowCount,columnCount:Math.max(26,width),frozenRowCount:name==='Summary'?5:1}},fields:'gridProperties.rowCount,gridProperties.columnCount,gridProperties.frozenRowCount'}});
  requests.push({repeatCell:{range:{sheetId,startRowIndex:0,endRowIndex:rowCount,startColumnIndex:0,endColumnIndex:width},cell:{},fields:'userEnteredValue'}});
  for(let start=0;start<rows.length;start+=10){
   const part=rows.slice(start,start+10);
   const values=part.map((row,offset)=>({values:Array.from({length:width},(_,col)=>{
    const v=row[col],isFormula=typeof v==='string'&&v.startsWith('=')&&((name==='Ledger'&&start+offset>0&&col===12)||(name==='Summary'&&col>0));
    return {userEnteredValue:v==null?undefined:typeof v==='number'?{numberValue:v}:isFormula?{formulaValue:v}:{stringValue:String(v)}};
   })}));
   requests.push({updateCells:{range:{sheetId,startRowIndex:start,endRowIndex:start+part.length,startColumnIndex:0,endColumnIndex:width},rows:values,fields:'userEnteredValue'}});
  }
  if(name==='Ledger'){
   requests.push(format(sheetId,1,rowCount,10,13,'"₹"#,##0.0000'));
   requests.push(format(sheetId,1,rowCount,17,19,'"$"0.000000'));
   requests.push({setBasicFilter:{filter:{range:{sheetId,startRowIndex:0,endRowIndex:rows.length,startColumnIndex:0,endColumnIndex:width}}}});
  }else if(name==='Summary'){
   requests.push(format(sheetId,5,12,1,6,'"₹"#,##0.00'));
   requests.push(format(sheetId,14,24,1,3,'"₹"#,##0.00'));
  }else if(name==='Rates'){
   requests.push(format(sheetId,1,rows.length,2,5,'"₹"#,##0.0000'));
   requests.push(format(sheetId,1,rows.length,6,9,'"$"0.000000'));
  }
 }
 return requests;
}
function verify(pending,observed){
 if(observed.fingerprint!==pending.fingerprint||observed.entries!==pending.entries||observed.unknown!==pending.unknown||!Number.isFinite(observed.knownInr)||Math.abs(observed.knownInr-pending.knownInr)>0.00001)throw Error('Sheet readback does not match pending snapshot; sync marker NOT saved.');
}
async function main(){
 const file=path.join(root,'output/cost-tracking/sheet-sync.json'),config=JSON.parse(await fs.readFile(file,'utf8'));
 if(process.argv[2]==='mark'){
  const pending=JSON.parse(await fs.readFile(path.join(root,'work/sheet-sync-pending.json'),'utf8'));
  const observed=JSON.parse(await fs.readFile(path.join(root,'work/sheet-sync-verified.json'),'utf8'));verify(pending,observed);
  await fs.writeFile(file,JSON.stringify({...config,lastSyncedAt:pending.generatedAt,fingerprint:pending.fingerprint},null,2));console.log('Verified sync receipt saved.');return;
 }
 const d=await data(),requests=requestsFor(d,config),tracker=new CostTracker(root,{});
 // Durable independent cost history: deleting a creative must never erase its cost.
 await tracker.save('history.json',d.snapshot.entries);
 await tracker.save('latest-snapshot.json',d.snapshot);
 await fs.mkdir(path.join(root,'work'),{recursive:true});
 const pending={generatedAt:d.snapshot.generatedAt,fingerprint:d.snapshot.fingerprint,entries:d.snapshot.entries.length,unknown:d.snapshot.entries.filter(r=>r.actualInr==null&&r.estimatedInr==null).length,knownInr:d.snapshot.entries.reduce((sum,r)=>sum+(r.actualInr??r.estimatedInr??0),0)};
 await fs.writeFile(path.join(root,'work/sheet-sync-pending.json'),JSON.stringify(pending));
 await fs.rm(path.join(root,'work/sheet-sync-verified.json'),{force:true});
 await fs.writeFile(path.join(root,'work/sheet-sync-request.json'),JSON.stringify({spreadsheet_id:config.spreadsheetId,requests}));
 console.log(JSON.stringify({...pending,path:path.join(root,'work/sheet-sync-request.json'),requests:requests.length,changed:config.fingerprint!==d.snapshot.fingerprint}));
}
module.exports={requestsFor,verify};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
