import type {Record as GenerationRecord} from '../graphic-designer';import type {Input,Report} from '.';import type {State} from './lifecycle';
export interface Delivery {status:'ready'|'flagged-cap-reached'|'no-output';ready:boolean;synthetic?:boolean;reviewEvidenceMode?:import('.').EvidenceMode;imageData:string|null;conceptId?:string;placementId?:string;fallbackToEarlierArtifact?:boolean;note:string;conceptExplanation:unknown;compositionRationale:unknown;unresolved:unknown[];reviewDecision?:Report['decision']}
export function buildDelivery(state:State,report:Report,record:GenerationRecord,artifact:Input['artifact']):Promise<Delivery>;
export function renderDeliveryHtml(deliveries:Delivery[]):string;
