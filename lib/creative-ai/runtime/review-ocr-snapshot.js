'use strict';
const fs=require('./artifact-fs'),path=require('node:path'),{fingerprint}=require('../art-director'),{withLock}=require('./file-lock');
// A review resumes the exact evidence that was submitted. A new image/package
// gets a new snapshot; neither confidence jitter nor attempt filenames do.
const algorithm=fingerprint(['ocr.swift','focused-ocr.js'].map(name=>require('node:fs').readFileSync(path.join(__dirname,name),'utf8')));
async function load({dir,record,measurement,recognize}){
 const identity={version:1,algorithm,packageHash:record.packageHash,artifactHash:measurement.artifactHash,exactCopy:record.exactCopy};
 if(!identity.packageHash||!identity.artifactHash)throw Error('Review OCR requires an image and package identity');
 const key=fingerprint(identity),file=path.join(dir,'review-ocr-'+key+'.json');
 return withLock(file+'.lock',async()=>{
  try{const saved=await fs.readJson(file);if(fingerprint(saved.identity)!==key||fingerprint(saved.ocr)!==saved.ocrHash)throw Error('Saved review OCR identity mismatch');return saved.ocr;}catch(e){if(e.code!=='ENOENT')throw e;}
  const ocr=await recognize(),saved={identity,ocr,ocrHash:fingerprint(ocr),recordedAt:new Date().toISOString()};
  // Unavailable OCR is also frozen: a retry must not silently change its input.
  await fs.writeFile(file+'.pending',await fs.jsonBytes(file,saved));await fs.rename(file+'.pending',file);return ocr;
 },{timeoutMs:180000});
}
module.exports={load};
