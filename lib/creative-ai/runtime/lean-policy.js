'use strict';
// Server-owned policy for NEW Studio jobs. Existing snapshots never change.
// User decision, 8 Nov 2026: retire gpt-image-2.6-sunburst; new jobs make one gpt-image-2 design per
// format. Jobs admitted earlier keep their pinned two-option snapshot (jobOptions below).
const options=[{route:'continuity',model:'gpt-image-2',quality:'high'}];
const roles={'lean-planning':{model:'gpt-6.1-sol',reasoningEffort:'high'},'lean-review':{model:'gpt-6-luna',reasoningEffort:'medium'},'lean-correction':{model:'gpt-6-luna',reasoningEffort:'medium'}};
// Backup model for planning (user decision, 8 Nov 2026): used only for the one replacement
// request after a confirmed cancellation (stuck in the queue or past the planning call limit).
const fallbacks={'lean-planning':{model:'gpt-6-luna',reasoningEffort:'high'}};
const enabled=intake=>intake?.leanWorkflowVersion===1;
const isRole=role=>Object.hasOwn(roles,role);
// correctionScopeVersion 1 (9 Nov 2026): auto-correct only what a local masked repaint can fix; size/position/crop/composition stay as they are (lean/correction.js scope).
// correctionAlignVersion 1 (9 Nov 2026): line a correction up with the original (edit-align.js) before restoring protected pixels.
// objectivePlaybookVersion 1 (8 Nov 2026): objective x format planning rule (lean/objective-playbook.js).
// leanReferenceVersion 1 (8 Nov 2026): do not send the protected SKU reference together
// with the website photo it was resized from (lean-context.js packet).
// aplusVersion 1 (9 Nov 2026): an Amazon A+ page is planned as one set with on-image text rules,
// SKU technology evidence and Amazon text fields (runtime/aplus.js). Only jobs whose Studio request
// asked for an A+ page (intake.aplusVersion 1) receive it.
// displayBannersVersion 1 (9 Nov 2026): a Google Display banner set is planned as one message with
// per-size text budgets and keeps its planned band when fitted (runtime/display-banners.js). Only jobs
// whose Studio request asked for a banner set (intake.displayBannersVersion 1) receive it.
// technologyVisualVersion 1 (9 Nov 2026): one shared technology rule for every format
// (runtime/technology-visual.js): exact SKU technology fact + its official picture.
// skuCheckVersion 1 (9 Nov 2026): the reviewer gets up to three exact-SKU angles with stricter product
// wording, review pictures are hash-checked then shrunk under a size cap, and AI edits get one product
// check (lean/sku-check.js).
// labelCheckVersion 1 (9 Nov 2026): a close-up crop of the genuine label in the official exact-SKU photo
// and a separate "Product label/markings" requirement (lean/sku-check.js locateLabel/labelCrop).
// layoutCheckVersion 1 (9 Nov 2026): planned positions are advisory; only real layout defects block
// (lean/visual-review.js layoutInstructions).
// reviewCheckVersion 1 (9 Nov 2026): the review reply schema lists the exact requirement IDs, one
// check each (lean/visual-review.js schemaFor). Older records keep their saved schema.
function configure(config,intake){return enabled(intake)?{...config,leanContextVersion:1,leanPlanningContractVersion:2,leanReferenceVersion:1,exactCanvasVersion:1,objectivePlaybookVersion:2,correctionAlignVersion:1,correctionScopeVersion:1,technologyVisualVersion:1,skuCheckVersion:1,reviewCheckVersion:1,labelCheckVersion:1,layoutCheckVersion:1,...(intake.aplusVersion===1?{aplusVersion:1}:{}),...(intake.displayBannersVersion===1?{displayBannersVersion:1}:{}),leanImageOptions:structuredClone(options),imageModel:options[0].model,imageOptionModels:options.map(o=>o.model),roleModels:{...(config.roleModels?.['product-audit']?{'product-audit':config.roleModels['product-audit']}:{}),...roles},fallbackModels:structuredClone(fallbacks)}:config;}
function assertLegacyAction(job){if(enabled(job.intake))throw Object.assign(Error('This project uses the simplified artwork workflow. Continue interrupted saved work through its recovery action; legacy review, reconstruction and component repair do not apply.'),{code:'LEAN_WORKFLOW_ACTION_UNAVAILABLE'});}
// Conformance v1 (8 Nov 2026) is pinned in each NEW planning record and copied onto its
// published result: non-pixel requirements leave the visual review, a candidate is
// promoted once its original mismatches pass, and a result with no remaining concrete
// mismatch is deliverable while unable_to_verify stays visible and uncertified.
// Records and results saved without the pin keep the strict all-pass contract.
const conformanceVersion=1;
const conformance=record=>record?.leanConformanceVersion===conformanceVersion;
function deliverable(job,result){return enabled(job?.intake)&&conformance(result)&&result.ready===true&&result.visualReview?.status==='completed'&&['no_mismatch','unable_to_verify'].includes(result.visualReview.conclusion);}
// Compatibility contract for jobs admitted before option snapshots existed. Never derive it from live defaults.
function jobOptions(job){return job.runtimeConfig?.leanImageOptions?.length?structuredClone(job.runtimeConfig.leanImageOptions):[{route:'continuity',model:job.runtimeConfig?.imageOptionModels?.[0]||'gpt-image-2',quality:'high'},{route:'exploration',model:job.runtimeConfig?.imageOptionModels?.[1]||'gpt-image-2.6-sunburst',quality:'high'}];}
module.exports={jobOptions,options,roles,enabled,isRole,configure,assertLegacyAction,conformanceVersion,conformance,deliverable};
