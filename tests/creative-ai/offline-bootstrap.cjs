'use strict';
// Test-only public DNS fixtures. Never loaded by the application.
const dns=require('dns/promises'),originalFetch=global.fetch;
dns.lookup=async(host,options)=>{
 if(['example.com','example.org','example.net','example.edu','www.example.com','drive.google.com'].includes(host)){
  const address={address:'93.184.216.34',family:4};return options?.all?[address]:address;
 }
 throw Error('Offline test blocked unmocked DNS for '+host);
};
// Tests can install explicit provider/download mocks. Unmocked paid/remote calls
// fail; local HTTP integration tests can still exercise their real test server.
global.fetch=async(input,options)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('Offline test blocked unmocked request to '+url.hostname);
 return originalFetch(input,options);
};
// Production snapshots are read-only fixtures. A network guard alone cannot stop
// a test server from claiming queued work or overwriting a live job on failure.
const fs=require('node:fs'),path=require('node:path'),protectedRoot=path.resolve(__dirname,'../../output');
function outputPath(value){if(typeof value!=='string'&&!Buffer.isBuffer(value)&&!(value instanceof URL))return false;let resolved=path.resolve(value instanceof URL?require('node:url').fileURLToPath(value):String(value));let parent=resolved,suffix='';while(!fs.existsSync(parent)){const next=path.dirname(parent);if(next===parent)break;suffix=path.join(path.basename(parent),suffix);parent=next;}try{resolved=path.join(fs.realpathSync(parent),suffix);}catch{}return resolved===protectedRoot||resolved.startsWith(protectedRoot+path.sep);}
function deny(value){if(outputPath(value))throw Error('Offline test blocked mutation of production output; use a temporary fixture workspace.');}
for(const [name,indices]of Object.entries({writeFile:[0],appendFile:[0],unlink:[0],rm:[0],rmdir:[0],rename:[0,1],copyFile:[1],cp:[1],truncate:[0],chmod:[0],chown:[0],utimes:[0],symlink:[1],link:[1]}))for(const [api,key]of [[fs,name],[fs,name+'Sync'],[fs.promises,name]]){const original=api[key];if(original)api[key]=function(...args){for(const i of indices)deny(args[i]);return original.apply(this,args)};}
for(const [api,key]of [[fs,'open'],[fs,'openSync'],[fs.promises,'open'],[fs,'createWriteStream']]){const original=api[key];api[key]=function(...args){const flags=key==='createWriteStream'?args[1]?.flags||'w':args[1];if(typeof flags==='number'?flags!==0:/[wa+]/.test(flags||'r'))deny(args[0]);return original.apply(this,args)};}
