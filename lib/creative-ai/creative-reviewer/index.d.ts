import type {Record as GenerationRecord} from '../graphic-designer';
export type Criterion='logo-identity'|'product-identity'|'supported-claims'|'exact-required-copy'|'required-text-legibility'|'mandatory-brand-rules'|'verified-upload-constraints'|'reference-boundary';
export type QualityCriterion='communication'|'brandRecognition'|'placementFit'|'visualCraft'|'emotionalAudienceFit';
export type EvidenceMode='runtime-attestation'|'synthetic-simulation'|'pending';
export interface Evidence {method:'raster-measurement'|'technical-measurement'|'ocr-attestation'|'vision-attestation'|'semantic-attestation'|'synthetic-simulation'|'unavailable';observation:string;expected:string;location:string;sourceIds:string[];ruleIds:string[]}
export interface CriticalCheck {criterion:Criterion;status:'pass'|'fail'|'unknown'|'not-applicable';confidence:number;evidence:Evidence;applicabilityReason:string;tolerance:string}
export interface Quality {criterion:QualityCriterion;score:number;confidence:number;evidence:Evidence}
export type Cause='generated-typo'|'copy-weak-wording'|'art-weak-hierarchy'|'art-direction-ignored'|'source-logo-wrong'|'logo-render-distorted'|'concept-strategy-mismatch'|'brand-rule-ambiguous'|'placement-spec-missing'|'uncertain';
export interface Finding {id:string;criterion:string;severity:'critical'|'creative'|'advisory';authority:'explicit'|'verified-technical'|'policy'|'inferred';defect:string;location:string;confidence:number;evidence:Evidence;correction:string;preserve:string[];cause:Cause;comparison:{stage:'artwork'|'generation-package'|'art'|'copy'|'concept'|'strategy'|'brand-rules'|'source-asset'|'placement';observation:string;referenceId:string}[]}
export interface Input {version:1;package:GenerationRecord;artifact:{origin:'generated'|'synthetic-placeholder'|'missing';imageData:string};evidence:{mode:EvidenceMode;packageHash:string;artifactHash:string;critical:CriticalCheck[];quality:Quality[];findings:Finding[]}}
export interface Routing {findingId:string;status:'advisory'|'focused-diagnostic-required'|'targeted-correction';owner:string;downstream:string[];reason:string;correction?:string;preserve?:string[]}
export interface Report {version:1;agentId:'creative-reviewer';assignmentId:string;conceptId:string;route:'continuity'|'exploration';placementId:string;packageHash:string;artifactHash:string;reviewHash:string;evidenceMode:EvidenceMode;decision:'ready'|'revise'|'unable-to-verify';score:number;qualityVerified:boolean;qualityScores:(Quality & {usedInScore:boolean})[];versionBindings:{conceptHash:string;copyHash:string;artHash:string;brandHash:string;placementHash:string};policy:unknown;criticalChecks:CriticalCheck[];findings:Finding[];routing:Routing[];verificationDependencies:{criterion?:string;findingId?:string;target:string;request:string}[];userNote:string;artifactAvailable:boolean;limits:string[]}
export interface Context {version:1;input:Input;measurement:{artifactHash:string;width:number;height:number;format:string;bytes:number}|null;artifactIssue:string|null;knowledge:unknown;messages:{role:string;content:string}[]}
export const agent:unknown,policy:unknown,inputSchema:unknown,outputSchema:unknown;
export function assembleContext(input:Input):Promise<Context>;
export function evaluate(context:Context):Report;
export function validateOutput(report:Report,context:Context):{valid:boolean;hardErrors:string[]};
