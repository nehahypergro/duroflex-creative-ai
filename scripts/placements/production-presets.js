'use strict';
const formats=require('../../lib/creative-ai/runtime/output-formats');
const print=require('../../lib/creative-ai/runtime/print-production');
process.stdout.write(JSON.stringify(formats.presets.filter(p=>p.kind==='print').map(p=>({id:p.id,name:p.name,print:print.specFor(p),pages:p.pages}))));
