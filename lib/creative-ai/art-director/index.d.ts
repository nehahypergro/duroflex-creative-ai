export type Json = null | boolean | number | string | Json[] | { [key:string]:Json };
export type JsonObject = { [key:string]:Json };
export type Route = 'continuity'|'exploration';
export type ReferenceRole = 'background'|'scene'|'setting'|'lighting'|'camera-angle'|'texture'|'mood'|'text'|'typography'|'layout'|'logo'|'product'|'identity';
export interface CopyField { id:string; role:'headline'|'body'|'cta'|'disclaimer'|'brand'|'other'; text:string; delivery:'embedded'|'native'; nativeFieldId:string; proofFactIds:string[]; requirement:'mandatory'|'optional'; locked:boolean }
export interface CopyDeck { conceptId:string; placementId:string; fields:CopyField[] }
export interface ReferenceAsset { id:string; label:string; sourceIds:string[]; ownership:'brand-supplied'|'brand-researcher'|'external'; brandName:string; provenance:string; synthetic:boolean; locator:{kind:'embedded'|'local-file'|'missing';value:string} }
export interface ResolvedReference { assetId:string; label:string; ownership:ReferenceAsset['ownership'];brandName:string;provenance:string;sourceIds:string[];synthetic:boolean;status:'resolved'|'missing';reason?:string;sha256?:string;width?:number;height?:number;mime?:string;imageData?:string }
export interface Pin { profileId:string;profileVersion:string;catalogVersion:string;catalogDigest:string }
export interface PlacementSelection { id:string;formatId:string;selectionStatus:'pinned'|'pending';pin:Pin|Record<string,never>;jobInputs:JsonObject }
export interface LockedRule {id:string;domain:string;value:string;sourceIds:string[];text?:string}
export interface Dependency {target:'copywriter'|'brand-researcher'|'brand-guardian'|'workflow-producer'|'creative-director';relatedIds:string[];reason:string}
export interface Input {version:1;directorInput:JsonObject;directorOutput:JsonObject;placements:PlacementSelection[];copy:CopyDeck[];referenceSources:JsonObject[];assets:ReferenceAsset[];visualRules:LockedRule[]}
export interface Annotation {direction:string;sourceStatus:'verified-primary'|'user-specified'|'official-guidance'|'heuristic'|'unknown';ruleIds:string[];sourceIds:string[]}
export interface TextDirection {fieldId:string;exactText:string;delivery:CopyField['delivery'];nativeFieldId:string;hierarchy:number;position:string;font:string;sizeDirection:string;contrastDirection:string}
export interface Specification {conceptId:string;route:Route;conceptHash:string;placementId:string;formatId:string;placementHash:string;copyHash:string;status:'ready'|'blocked';focalCommunication:string;scene:string;composition:string;hierarchy:string[];imageTreatment:string;camera:string;lighting:string;palette:string[];typography:string;text:TextDirection[];references:{assetId:string;roles:ReferenceRole[];instruction:string}[];logo:{assetIds:string[];treatment:string};product:{assetIds:string[];treatment:string};safeAreas:Annotation;crop:Annotation;viewingSize:Annotation;lockedRules:LockedRule[];flexibleChoices:string[];rationale:string;dependencies:Dependency[];reconciliation:{target:'copywriter';status:'aligned'|'revision-required';fieldIds:string[];note:string}[];checkCriteria:string[];brandGuidelineApplications?:{ruleId:string;decision:string;why:string}[];knowledgeApplications:{principleId:string;decision:string;limit:string}[]}
export interface Context {version:1;inputHash:string;input:Input;lockedRules:LockedRule[];references:ResolvedReference[];placements:{selection:PlacementSelection;context:JsonObject;placementHash:string}[];knowledge:JsonObject;messages:{role:string;content:string}[]}
export interface CoreOutput {version:1;agentId:'art-director';assignmentId:string;inputHash:string;workflow:{attempt:number;maxAttempts:1;humanApprovalRequired:false};specifications:Specification[]}
export interface Handoff {version:1;contract:'creative-ai.graphic-designer-handoff.v1';agentId:'graphic-designer';automatic:true;humanApprovalRequired:false;status:'ready'|'partial-ready'|'blocked';dispatchAllowed:boolean;assignmentId:string;inputHash:string;conceptIds:string[];productionMode:'whole-static-image-with-embedded-text';context:unknown;packets:{specification:Specification;artHash:string;attachments:(ResolvedReference & {roles:ReferenceRole[];instruction:string})[]}[];internalDependencies:(Dependency & {conceptId:string;placementId:string})[]}
export interface Output extends CoreOutput {handoff:Handoff}
export const agent:JsonObject;
export const inputSchema:JsonObject,outputSchema:JsonObject,coreOutputSchema:JsonObject;
export function validateInput(input:Input):Input;
export function resolveAssets(input:Input):Promise<ResolvedReference[]>;
export function assembleContext(input:Input,options?:{catalog?:JsonObject}):Promise<Context>;
export function validateCore(core:CoreOutput,ctx:Context):string[];
export function buildAutomaticHandoff(core:CoreOutput,ctx:Context):Handoff;
export function finalizeOutput(core:CoreOutput,ctx:Context):Output;
export function validateOutput(output:Output,ctx:Context):{valid:boolean;hardErrors:string[];limits:string[]};
export function fingerprint(value:unknown):string;
