'use strict';
// Regression (live test batch, 17 Nov 2026, Duroflex Cove Facebook story ad in Hindi): planning failed with
// "a story headline is one line of six words or fewer" for the 4-word headline "दो रंग, एक ख़ास अंदाज़।".
// Vowel signs and nukta (\p{M}) were treated as word breaks, so the headline counted as 9 "words". The same word
// splitting is used for repeated headlines and overused opening words. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const cc=require('../../lib/creative-ai/lean/channel-craft'),mr=require('../../lib/creative-ai/lean/marketing-rules');
const plan=text=>({pages:[{id:'story',copy:[{role:'headline',text}]}]}),story={channelCraft:{version:1,storyPages:['story'],heroPages:[],print:false}};

test('short story headlines in Indian languages pass; long ones still fail',()=>{
 for(const text of ['दो रंग, एक ख़ास अंदाज़।','ಆರಾಮದ ನಿದ್ರೆ ಪ್ರತಿ ರಾತ್ರಿ','இனிய தூக்கம் தினமும்','ਆਰਾਮ ਨਾਲ ਸੌਂਵੋ','Lean back, cushions off'])
  assert.doesNotThrow(()=>cc.validate(plan(text),story),text);
 assert.throws(()=>cc.validate(plan('हर रात आराम से सोइए और सुबह ताज़गी से उठिए'),story),/six words or fewer/);
});

test('overused opening words are whole words in Hindi, not single letters',()=>{
 // Three headlines starting with different words that share a first consonant (द).
 const avoid=mr.overusedOpenings(['दो रंग, एक अंदाज़','दिन भर आराम','दफ़्तर के बाद आराम']);
 assert.ok(!avoid.some(w=>[...w].length===1),'no single-letter openings: '+JSON.stringify(avoid));
 assert.ok(!avoid.includes('द'));
});
