'use strict';
// Server-owned policy for NEW Studio jobs. Existing snapshots never change.
// User decision, 8 Nov 2026: retire gpt-image-2.6-sunburst; new jobs make one gpt-image-2 design per
// format. Jobs admitted earlier keep their pinned two-option snapshot (jobOptions below).
const options=[{route:'continuity',model:'gpt-image-2',quality:'high'}];
const roles={'lean-planning':{model:'gpt-6.1-sol',reasoningEffort:'high'},'lean-review':{model:'gpt-6.1-sol',reasoningEffort:'medium'},'lean-correction':{model:'gpt-6-luna',reasoningEffort:'medium'},'lean-reference':{model:'gpt-6-luna',reasoningEffort:'medium'},'lean-fingerprint':{model:'gpt-6-luna',reasoningEffort:'medium'}};
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
// labelGenerationVersion 1 (9 Nov 2026): the same label close-up is also sent to the image request
// (lean/sku-check.js generationLabel), so the image model sees the genuine label up close.
// layoutCheckVersion 1 (9 Nov 2026): planned positions are advisory; only real layout defects block
// (lean/visual-review.js layoutInstructions).
// reviewCheckVersion 1 (9 Nov 2026): the review reply schema lists the exact requirement IDs, one
// check each (lean/visual-review.js schemaFor). Older records keep their saved schema.
// planRulesVersion 1 (10 Nov 2026, lean/plan-rules.js): margins, no added counters, carousel square, no repeated set headlines.
// Image checker (user decision, 10 Nov 2026, checker trial in docs/review-checklist-20261110.md): new jobs check
// images (lean-review: main check, correction re-check, AI-edit product check, Re-run check) with gpt-6.1-sol
// medium. It caught 7 of 8 failing images against 2 of 8 for gpt-6-luna medium. Role models are pinned per job at
// admission, so earlier jobs keep gpt-6-luna. Correction diagnosis stays gpt-6-luna.
// marketingRulesVersion 1 (user decision, 11 Nov 2026, marketing-manager review; lean/marketing-rules.js): fresh
// headlines across a product's campaign, short product name in ad copy, features shown working, story safe zones,
// bigger web/distance text, a free spelling check and warranty wording without "conditional".
// featureEvidenceVersion 1 (live test, 17 Nov 2026; lean/checklist.js PHOTOS_WIN): when a saved product reading
// contradicts the official photos, the image check follows the photos.
// storyRedrawVersion 1 (user decision, 17 Nov 2026; runtime/lean-workflow.js redrawStory): a story whose measured safe-zone
// check fails is drawn once more with the problem described, and the redraw is kept only if it is better.
// outputLimitRetryVersion 1 (user decision, 17 Nov 2026; runtime/provider.js): after an explicit Continue, a planning
// step whose saved answers were cut off at the output limit is asked once more with the largest answer length.
// ctaArrowVersion 1 (user decision, 18 Nov 2026, live Instagram post; lean/plan-rules.js): one small arrow right after
// the call-to-action words is part of the button and no longer fails the composition rule.
// productNameProtectionVersion 1 (19 Nov 2026, live rerun test; lean/correction.js): the single local correction accepts
// product protection named after the product type (sofa, mattress, topper …), not only the word "product".
// labelRepairVersion 1 (18 Nov 2026; lean/correction.js) is NOT pinned on new jobs: Neha turned it off the same day after
// 0 of 4 label repairs worked (about ₹19 each). Jobs that already pinned it keep it.
// setRuleCheckVersion 1 (18 Nov 2026, big sets never fully checked; lean/visual-review.js): product-page rules about
// the whole gallery or the review process stay in planning and are not judged on each single picture.
// typefaceNoteVersion 1 (user decision, 17 Nov 2026, Sleepyhead live test; lean/visual-review.js): a brand typeface
// rule the checker cannot confirm from the picture is a listed note and no longer withholds Ready.
// conditionalRuleVersion 1 (19 Nov 2026, live QA; lean/planning.js): the conditional feature-demonstration rule written
// as not-applicable with a reason, or a named Studio process rule written as not-applicable, is recorded as applied
// (the rule still reaches the brief and the check) instead of failing the job.
// brandRuleNoteVersion 1 (user decision, 17 Nov 2026, after the live test; lean/planning.js): a brand rule whose note
// the planner skipped is filled as "apply" instead of failing the job.
// warrantyCheckVersion 1 (live test, 17 Nov 2026; lean/visual-review.js): the image check applies the 11 Nov warranty
// wording decision, so a missing "conditional" is not flagged.
// channelCraftVersion 1 (user decision, 11 Nov 2026, grade-by-grade review; lean/channel-craft.js): picture jobs for
// A+, PMax, carousels and RCS; push crop; story and website-hero layout; display look; campaign look; no web address.
// reviewChecklistVersion 1 and edgeFitVersion 1 (user decision, 10 Nov 2026, after the asset evaluation):
// lean/checklist.js (product fingerprint, pointer, slot, room, label wording, set rules, text size) and
// lean/edge-extend.js (a product cut by the edge is given room by extending the scene). Earlier jobs keep theirs.
// directCheckVersion 1 (user decision, 10 Nov 2026): image checks (lean-review) are sent directly, not through
// the background queue (runtime/provider.js). Earlier jobs keep the queue.
// planningCallScaleVersion 1 (user request, 10 Nov 2026): the planning call limit grows with the number of
// images (runtime/provider.js callLimits). Earlier jobs keep the fixed limit.
// planningWaitVersion 1 (user decision, 19 Nov 2026): lean planning waits 7 minutes (plus 20 s per extra image, at
// most 10 minutes) before the backup model takes over, instead of 4 (runtime/provider.js planningMs). Earlier jobs keep theirs.
// planningWaitVersion 2 (Neha, 19 Nov 2026 evening, after the live recheck): 10 minutes, plus 20 s per extra image, at most
// 12 minutes. Jobs that pinned version 1 keep 7.
// realismCheckVersion 1 (user request, 10 Nov 2026: "a person is floating in the mattress"): the existing
// review call also checks that the scene is physically believable. Earlier records keep their contract.
// layoutRedrawVersion 1 (Neha, 22 Nov 2026: "Yes, one redraw"): any layout finding gets one full redraw with every finding
// described, kept only if its check is better (lean-workflow.js redrawLayout). Supersedes the 9 Nov "layout is not
// auto-corrected" rule, edge fit and the measured story redraw for new jobs. Earlier jobs keep their correction.
// edgeFillVersion 1 (Neha, 22 Nov 2026): no mirrored edges; the drawing is enlarged evenly and the extra band trimmed,
// and the model is told to keep that band plain (exact-canvas.js). shadowCheckVersion 1: shadows must follow their object's
// shape (visual-review.js SHADOW). Earlier jobs keep their fit and wording.
// scaleCheckVersion 1 (Neha, 22 Nov 2026: "Yes, planner writes it"): the planner gets the SKU's stated size and writes
// how people sit against it; the check asks "People to scale" (a layout finding, so one redraw). lean/product-scale.js.
// foldPanelVersion 1 (Neha, 21 Nov 2026): folded print faces are drawn panel by panel and joined at the fold
// (runtime/fold-panels.js). Earlier jobs keep one drawing per face.
function configure(config,intake){return enabled(intake)?{...config,leanContextVersion:1,leanPlanningContractVersion:2,leanReferenceVersion:1,exactCanvasVersion:1,edgeLineVersion:1,edgeFillVersion:1,shadowCheckVersion:1,layoutRedrawVersion:1,scaleCheckVersion:1,objectivePlaybookVersion:2,correctionAlignVersion:1,correctionScopeVersion:1,technologyVisualVersion:1,skuCheckVersion:1,reviewCheckVersion:1,labelCheckVersion:1,labelGenerationVersion:1,layoutCheckVersion:1,realismCheckVersion:1,planRulesVersion:1,planningCallScaleVersion:1,planningWaitVersion:2,directCheckVersion:1,reviewChecklistVersion:1,edgeFitVersion:1,marketingRulesVersion:1,channelCraftVersion:1,warrantyCheckVersion:1,featureEvidenceVersion:1,brandRuleNoteVersion:1,typefaceNoteVersion:1,setRuleCheckVersion:1,ctaArrowVersion:1,outputLimitRetryVersion:1,storyRedrawVersion:1,productNameProtectionVersion:1,conditionalRuleVersion:1,foldPanelVersion:1,...(intake.creativeReference?{creativeReferenceVersion:1}:{}),...(intake.aplusVersion===1?{aplusVersion:1}:{}),...(intake.displayBannersVersion===1?{displayBannersVersion:1,displayBannerFitVersion:1}:{}),leanImageOptions:structuredClone(options),imageModel:options[0].model,imageOptionModels:options.map(o=>o.model),roleModels:{...(config.roleModels?.['product-audit']?{'product-audit':config.roleModels['product-audit']}:{}),...roles},fallbackModels:structuredClone(fallbacks)}:config;}
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
