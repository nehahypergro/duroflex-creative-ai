'use strict';
// Runtime-owned print proof data is checked separately from the model's package
// schema. It remains in the hashed package; it is never stripped to pass review.
function validate(record){
 const p=record.printProduction;if(p===undefined)return;
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid print proof metadata');
 const inputs=['trimWidthMm','trimHeightMm','bleedMm','safeMm','proofPpi','requiredPpi','fold','panelWidthsMm','keepoutTopMm','keepoutBottomMm','templateNote'];
 const generated=['proofWorkflowVersion','geometry','raster','colourSpace','pdfStandard','printerAccepted','set'];
 if(Object.keys(p).some(k=>![...inputs,...generated].includes(k)))throw Error('Unknown print proof metadata');
 if(!['none','half','z','letter'].includes(p.fold))throw Error('Unknown print fold');
 const s=p.set;if(!s||Object.keys(s).some(k=>!['id','name','index','count','label'].includes(k))||!['id','name','label'].every(k=>typeof s[k]==='string'&&s[k].length>0)||!Number.isInteger(s.count)||!Number.isInteger(s.index)||s.index<1||s.index>s.count)throw Error('Invalid print proof set');
 const raw=Object.fromEntries(inputs.filter(k=>Object.hasOwn(p,k)).map(k=>[k,p[k]]));
 const expected={...require('./print-production').specFor({print:raw}),set:s};
 if(!require('../art-director').same(p,expected))throw Error('Print proof metadata differs from its computed geometry or claims unsupported printer approval');
}
module.exports={validate};
