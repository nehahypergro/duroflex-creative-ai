'use strict';
// Persist only diagnostic identifiers; error messages can echo private prompts or signed URLs.
function fields(json){const e=json?.error;const clean=x=>typeof x==='string'&&/^[A-Za-z0-9_.\[\]-]{1,120}$/.test(x)?x:null;const m=String(e?.message||'');
 // A fixed category, never the message itself (17 Nov 2026: a refused picture link gave no clue which way it failed).
 const problem=/timeout while downloading|timed out (?:while )?downloading/i.test(m)?'url-download-timeout':/error while downloading|failed to download|could not download|unable to download/i.test(m)?'url-download-failed':/invalid image|unsupported image|image (?:format|type) (?:is )?not supported|could not (?:process|decode) image/i.test(m)?'invalid-image':null;
 return {errorCode:clean(e?.code),errorType:clean(e?.type),parameter:clean(e?.param),...(problem?{problem}:{})};}
module.exports={fields};
