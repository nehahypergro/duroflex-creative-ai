'use strict';
module.exports=function resolve(d){
 const selected={Awareness:'awareness',Consideration:'consideration',Conversion:'action',Purchase:'action',Engagement:'other',Education:'other'}[d.objective];
 const objective=selected||({TOFU:'awareness',MOFU:'consideration',BOFU:'action'})[d.funnelStage]||'consideration';
 return {objective,instruction:selected?'Selected communication objective: '+d.objective+'. This explicit objective takes priority over funnel-stage shorthand.':''};
};
