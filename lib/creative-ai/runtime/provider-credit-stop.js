'use strict';
function classify(status,json){const e=json?.error,code=e?.code||e?.type||'',message=e?.message||'';const creditsExhausted=[400,402,429].includes(status)&&(/^(insufficient_quota|billing_hard_limit_reached|billing_not_active)$/.test(code)||/no credits remaining|insufficient credits|billing hard limit|exceeded your current quota/i.test(message));return {creditsExhausted,retryable:!creditsExhausted&&[429,500,502,503,504].includes(status)&&!!e};}
function error(){return Object.assign(Error('Provider credits are exhausted. Saved work is preserved; further requests for this project are stopped.'),{code:'PROVIDER_CREDITS_EXHAUSTED',retryableReview:false});}
module.exports={classify,error};
