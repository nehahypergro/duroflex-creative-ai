import type {ReviewLedger} from '../creative-reviewer/lifecycle';
export type Agent='workflow-producer'|'brand-researcher'|'brand-guardian'|'marketing-strategist'|'creative-director'|'copywriter'|'art-director'|'graphic-designer'|'creative-reviewer';
export interface Job {jobId:string;assignmentId:string;mode:'production'|'demo';concepts:{id:string;route:'continuity'|'exploration'}[];placements:{id:string;label:string}[]}
export interface Scope {conceptId?:string;route?:'continuity'|'exploration';placementId?:string}
export interface EventInput {version:1;jobId:string;idempotencyKey:string;type:string;agent:Agent;scope:Scope;description:string;outcome:string;artifactRefs:string[];sourceRefs:string[];upstreamHandoffIds:string[];dependencyIds:string[];unresolvedIssueRefs:string[];evidence:{mode:'production-adapter'|'synthetic-fixture';adapterId:string;receiptId:string};details:{config?:Job;taskId?:string;taskKind?:string;handoffId?:string;targetAgent?:Agent;dependencyId?:string;artifact?:{id:string;kind:string;version:string;reference:string;hash:string};artifactId?:string;replacementArtifactId?:string;reviewLink?:unknown}}
export interface Event extends EventInput {eventId:string;sequence:number;recordedAt:string;previousHash:string;eventHash:string}
export class ActivityLedger {constructor(directory:string);append(event:EventInput):Promise<Event>;read(jobId:string):Promise<Event[]>;project(jobId:string):Promise<unknown>;query(jobId:string,filters?:{agent?:Agent;type?:string;conceptId?:string;placementId?:string;afterSequence?:number}):Promise<Event[]>;appendReviewer(event:EventInput,options:{reviewLedger:ReviewLedger;unitKey:string}):Promise<Event>}
export const agent:unknown,inputSchema:unknown,eventSchema:unknown,jobSchema:unknown;
export function validateJob(job:Job):Job;
export function replay(events:Event[]):unknown;
