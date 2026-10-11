import type {Output} from '.';
export interface FinishedResult {assignmentId:string;conceptId:string;placementId:string;packageHash:string;status:'finished'|'pending'|'failed';artifact:{origin:'generated'|'synthetic-placeholder';imageData:string};review:{status:'passed'|'failed'|'pending';evidenceStatus:'runtime-review'|'synthetic-simulation'|'pending';artifactHash:string;packageHash:string;checks:{id:string;status:'pass'|'fail'|'pending';note:string}[]}}
export interface Association {matches:{conceptId:string;placementId:string;packageHash:string;imageData:string;synthetic:boolean;compositionRationale:{status:string;text:string;limits:string}}[];rejected:{conceptId:string;placementId:string;reason:string}[];limits:string}
export function inspectArtifact(imageData:string):Promise<{artifactHash:string;width:number;height:number;format:string;bytes:number}>;
export function associateReviewedResults(packages:Output,results:FinishedResult[],options?:{demo?:boolean}):Promise<Association>;
export function renderReviewedResultsHtml(association:Association):string;
export function buildReviewerHandoff(record:import('.').Record,imageData:string):Promise<unknown>;
