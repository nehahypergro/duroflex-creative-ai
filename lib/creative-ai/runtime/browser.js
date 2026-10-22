'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
// Reuse an installed browser. Never download software during an export.
function resolveBrowser({configured=process.env.CREATIVE_AI_CHROME,exists=fs.existsSync,home=os.homedir(),readDir=fs.readdirSync,playwrightPath}={}){
 if(configured){if(exists(configured))return configured;throw Error('Configured rendering browser is unavailable. Check CREATIVE_AI_CHROME. Your saved creative is unchanged.');}
 const candidates=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',playwrightPath||require('playwright-core').chromium.executablePath()],cache=path.join(home,'Library/Caches/ms-playwright');
 if(exists(cache))for(const name of readDir(cache).filter(n=>/^chromium-\d+$/.test(n)).sort((a,b)=>Number(b.split('-')[1])-Number(a.split('-')[1])))for(const arch of ['arm64','x64'])candidates.push(path.join(cache,name,'chrome-mac-'+arch,'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'));
 const found=candidates.find(p=>p&&exists(p));if(!found)throw Error('No rendering browser is available. Install Chromium or set CREATIVE_AI_CHROME. Your saved creative is unchanged.');return found;
}
module.exports={resolveBrowser};
