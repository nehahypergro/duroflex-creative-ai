'use strict';
function config(){return {jobId:'synthetic-activity-job',assignmentId:'synthetic-bottle-assignment',mode:'demo',concepts:[{id:'concept-continuity',route:'continuity'},{id:'concept-exploration',route:'exploration'}],placements:[{id:'synthetic-small-square',label:'Small square demonstration'}]};}
function event(jobId,type,key,overrides={}){return {version:1,jobId,idempotencyKey:key,type,agent:'workflow-producer',scope:{},description:'Synthetic '+type.replaceAll('.',' '),outcome:'Fixture outcome only; no live work occurred.',artifactRefs:[],sourceRefs:[],upstreamHandoffIds:[],dependencyIds:[],unresolvedIssueRefs:[],evidence:{mode:'synthetic-fixture',adapterId:'synthetic-fixture',receiptId:key},details:{},...overrides};}
module.exports={config,event};
