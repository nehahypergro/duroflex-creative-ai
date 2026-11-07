import type {Record as GenerationRecord} from '../graphic-designer';
import type {Report,EvidenceMode} from '.';
export interface State {version:1;unitKey:string;assignmentId:string;route:'continuity'|'exploration';placementId:string;phase:'initial-review'|'correction-planned'|'final-review'|'terminal';correctionCycles:0|1;maxCorrectionCycles:1;currentPackageHash:string;currentArtifactHash:string;authorizationId:string;initialReportHash:string;finalReportHash:string;delivery:'none'|'ready'|'flagged-cap-reached'|'no-output';lastAvailable:{packageHash:string;artifactHash:string;reviewEvidenceMode?:EvidenceMode}|null;history:{phase:string;packageHash:string;artifactHash:string;reviewHash:string;decision:Report['decision']}[]}
export interface Plan {version:1;unitKey:string;cycle:1;maxCorrectionCycles:1;authorizationId:string;automatic:true;humanApprovalRequired:false;packageHash:string;artifactHash:string;preserveVersions:Report['versionBindings'];corrections:Report['routing'];diagnostics:Report['routing'];verificationDependencies:Report['verificationDependencies'];steps:string[];preserveUnaffected:true;instruction:string}
export function consumedReportHash(state:State):string;
export function unitKey(record:GenerationRecord):string;
export function createState(record:GenerationRecord,imageData:string):Promise<State>;
export function consumeReview(state:State,report:Report):{state:State;plan:Plan|null};
export function bindCorrection(state:State,record:GenerationRecord,imageData:string,options:{authorizationId:string}):Promise<State>;
export class ReviewLedger {constructor(directory:string);start(record:GenerationRecord,imageData:string):Promise<State>;review(key:string,report:Report):Promise<State>;correction(key:string,record:GenerationRecord,imageData:string,authorizationId:string):Promise<State>;read(key:string):Promise<State>}
