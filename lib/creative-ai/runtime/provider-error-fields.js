'use strict';
// Persist only diagnostic identifiers; error messages can echo private prompts or signed URLs.
function fields(json){const e=json?.error;const clean=x=>typeof x==='string'&&/^[A-Za-z0-9_.\[\]-]{1,120}$/.test(x)?x:null;return {errorCode:clean(e?.code),errorType:clean(e?.type),parameter:clean(e?.param)};}
module.exports={fields};
