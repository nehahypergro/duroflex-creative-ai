import type {Finding,Report,Routing} from '.';import type {State,Plan} from './lifecycle';
export function routeFinding(finding:Finding):Routing;
export function consolidatedPlan(report:Report,state:State):Plan;
