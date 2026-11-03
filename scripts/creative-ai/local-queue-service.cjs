'use strict';
// Install a user LaunchAgent: survives closing the chat, starts at login, no root.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),label='com.neha.creative-ai.local-queue',dir=path.join(root,'work/local-workers-20261103');
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
(async()=>{
 if(process.platform!=='darwin')throw Error('This service installer requires macOS');
 const file=path.join(os.homedir(),'Library/LaunchAgents',label+'.plist'),domain='gui/'+process.getuid();
 const text='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n<key>Label</key><string>'+label+'</string>\n<key>ProgramArguments</key><array><string>'+xml(process.execPath)+'</string><string>'+xml(path.join(__dirname,'local-queue.cjs'))+'</string><string>--wait-for-owner</string></array>\n<key>WorkingDirectory</key><string>'+xml(root)+'</string>\n<key>RunAtLoad</key><true/>\n<key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>\n<key>ThrottleInterval</key><integer>30</integer>\n<key>StandardOutPath</key><string>'+xml(path.join(dir,'service.log'))+'</string>\n<key>StandardErrorPath</key><string>'+xml(path.join(dir,'service-error.log'))+'</string>\n</dict></plist>\n';
 await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,label+'.plist'),text);
 if(!process.argv.includes('--install')){console.log('Prepared service definition: '+path.join(dir,label+'.plist'));return;}
 await fs.mkdir(path.dirname(file),{recursive:true});
 try{const old=await fs.readFile(file,'utf8');if(old!==text)throw Error('Existing service differs; inspect before replacing.');}catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(file,text,{flag:'wx'});}
 try{execFileSync('/bin/launchctl',['print',domain+'/'+label],{stdio:'ignore'});console.log('Service is already registered; no duplicate supervisor started.');}
 catch{execFileSync('/bin/launchctl',['bootstrap',domain,file],{stdio:'pipe'});console.log('Registered '+label);}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
