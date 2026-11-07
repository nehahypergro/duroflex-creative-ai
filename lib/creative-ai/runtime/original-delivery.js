'use strict';
const fs=require('node:fs'),path=require('node:path');
function enabled(intake){return intake?.originalArtworkVersion===1;}
function prepare(root,intake){
 intake={...intake};delete intake.leanWorkflowVersion;
 if(intake.rawArtworkExperimentVersion)return intake;
 let settings;try{settings=JSON.parse(fs.readFileSync(path.join(root,'workspace.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return intake;throw e;}
 if(settings.artworkDelivery!=='original')return intake;
 const out={...intake,originalArtworkVersion:1,editableCanvas:false};
 delete out.leanWorkflowVersion;
 if(settings.artworkWorkflow==='lean-v1'){out.leanWorkflowVersion=1;out.conceptRoutes=['continuity','exploration'];}
 for(const key of Object.keys(out))if(/^(editableText|composed|approvedLogoOverlay|componentRecovery|copyLockAuthority)/.test(key))delete out[key];
 return out;
}
const direction='OUTPUT WORKFLOW: deliver the original generated raster artwork. Render required campaign wording and the supplied approved logo within the image according to placement policy; image-only placements retain their no-campaign-text policy. No editable reconstruction, background erasure or post-generation logo overlay follows. Use written brand typography guidance. Preserve exact SKU, approved copy, qualifiers and layout requirements. Print outputs are raster artwork, not certified print-production files.';
module.exports={enabled,prepare,direction};
