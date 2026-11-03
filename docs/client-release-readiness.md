# Client release readiness — 23 October 2026

Status: BLOCKED. Target: 25 October 2026 (two days requested by the user).
A target date is not a certification. No claim of permanent elimination of external outages or generative defects.

## Changes made in this pass

- Recorded reasoning-service 429/500/502/503/504 errors now respect Retry-After (seconds or HTTP date). A minimum delay prevents immediate retry storms. The deadline is persisted with the error, so a restart cannot skip it. A delay exceeding the remaining job budget stops before a second reservation. The existing one-recovery limit and unknown-charge accounting remain.
- Image admission has a bounded queue (64 pending, existing active limit unchanged). Cancelled/expired waiting calls are removed; they cannot reserve a paid request. Capacity returns after success or failure. This is process-local admission, not a distributed queue.
- Feed portrait, LinkedIn square/portrait and website mobile/client desktop variants resolve to exact canvases. Existing presets retain their IDs; client-specific dimensions use explicit custom profiles. No silent resizing or platform certification. These changes connect model/runtime routing; catalogue discovery and rendered acceptance are separate outstanding checks.
- Updated two obsolete unit expectations to match requested client labels and draft visibility. Updated the Story browser journey to assert that manual project naming is absent.

Evidence directory: `work/client-readiness-20261023/`. Before/after regression logs, browser results, source matrix and repeated-round logs are retained. Existing historical jobs, artwork, verdicts and costs were not rewritten.

## Acceptance for each original issue

| Issue | Current disposition | Evidence required before closing |
|---|---|---|
| PDP upload loses response | Bulk upload removed from the paid image request; brand-scoped verified CDN references are staged first. Ten live transfer checks and one live image proof passed. | Historical socket origin remains unproven; ten varied complete live runs per affected route and full pairs/sets still required. See creative-ai-reliability-fixes.md. |
| WhatsApp incomplete pair | Open | Both options generated and independently checked; one option is not a passing pair |
| Website review connection loss | Open | Repeated complete generation/review at the real site breakpoint, plus recovery without missing assets |
| Explicit provider HTTP error | Recovery pacing fixed and tested | Live recovery evidence still separate; sustained errors must stop visibly |
| Reading-policy version mismatch | Previous compatibility fix retained | Policy-version compatibility regressions and both-brand recorded fixtures |
| Supporting copy omitted | Previous counting fix retained | Exercise all roles and multilingual copy; verify rendered reading size |
| Landscape over-capacity | Previous height-aware limit retained | Actual phone/desktop previews; concise planning must result in legible rendered text |
| A+ copy/layout conflict | Open | Negotiated copy and layout, including exact qualifiers; passing actual small-preview artwork |
| LinkedIn revision grows copy | Guard retained | Fresh successful live revision after final guard; rejected growth is not successful recovery |
| LinkedIn tiny CTA/supporting copy | Open | Independently readable rendered result at intended viewing width |
| Distorted Airboost product marking | Open | Exact selected-SKU reference comparison; no inferred replacement branding |
| Logo-clipping false positive | Open/uncertain | Compare exact approved logo and output; preserve reviewer evidence and classify defect vs evaluator error |
| Desktop tested at phone width | Classification fixed; integration open | Actual host component desktop/mobile behavior and breakpoint checks |
| Banner dimension mismatch | Partial | Single declared contract across catalogue, brief, request, preview and downloaded bytes |
| PDP feature/dimension misclassification | Classification fixed; visual acceptance open | Complete pack, including measurement labels and unsupported internal-layer exclusions |
| Incomplete verification | Must remain pending/flagged | Missing evidence completed for the exact final hash; cannot be waived through packaging |
| Unknown charges | Preserved, not resolved | Provider billing reconciliation; no blind resend and no zero-cost substitution |

## Delivery scope and release conditions

| Requested family | Required deliverable | Work still required |
|---|---|---|
| Full 12-image PDP | Two complete ordered options, 12 slots each; slot purpose, exact SKU and matching source evidence | Durable parent/set manifest and bounded child batches; three-placement and six-unit caps cannot simply be raised without budget/context work. Resume missing children, never regenerate completed children. Gate whole-set Ready on all required checked slots. |
| Feed/LinkedIn/PMax/YouTube Community | Each requested ratio plus separate accompanying/native copy | Finish catalogue-to-route mapping and PMax/Community contracts; distinguish Community from video thumbnails. Render and inspect each ratio. |
| Website | Desktop/mobile hero, banner, tiles and landing modules; alt text and host handoff | Complete route selection, actual container/crop checks, image byte/dimension checks and responsive HTML requirements. Raster alone is not website delivery. |
| Marketplace | Listing set, standard/Premium A+ and comparison charts | Exact selected marketplace template/eligibility; required slot count; source-backed comparisons; target preview. A generic raster module is not Premium A+ acceptance. |
| Print/retail | Window, standee, wobbler, product/price cards and wall graphics | Vendor dimensions/template, physical PDF boxes, source PPI and colour workflow. Obtain actual operator profile/proof where needed. Digital proof cannot be labelled press-approved. |
| Email/RCS/push | Hero assets plus channel fields, HTML/plain text where applicable | Connect creation routes; validate live text/links, required fields and provider templates; client preview and image-off behavior. Do not package a WhatsApp image as another channel. |
| PR/documents | High-resolution photos, fact sheet, release, Q&A, demo guide, article, training/FAQ/sales/CX documents | Source-bound writing/review and actual native/document export. Page structure, typography, pagination and editable files where contracted. PNG slides are not native documents. |

## Repeated-test policy

Separate counts for: (1) contract/unit regressions, (2) recorded saved-job replays, (3) mocked browser journeys, (4) new paid generation, (5) real publisher/vendor acceptance.

This pass adds ten recovery-delay variations, ten source-encoding variations, ten queued-admission repetitions, ten exact-format cases for each brand, and ten browser journeys. The repeated-round runner executes the selected regression suite ten times in rotated order. This does **not** satisfy ten live generated cases for every open creative defect, SKU or delivery family.

For live cases, pin brand, saved SKU/variant/source hashes, format, route, copy language, browser entry point, final artifact hashes and review state. Include refresh, navigation away/back, concurrent projects, delayed/failed provider response, cancelled queue entry, stale tab and partial set. Record failures in the denominator. A retry must not erase the failed original.

## Remaining release blockers

1. Complete route-level live acceptance of the staged CDN upload fix. One live image proof passed; unknown paid responses remain protected from automatic resend.
2. Get passing full pairs/sets for PDP, A+, LinkedIn and WhatsApp; inspect image quality.
3. Implement missing delivery families rather than treating specification coverage as execution coverage.
4. **Closed 23 October:** navigation/cache/mobile fixes and current-UI regression updates pass the full offline suite (971/971), 20 repeated navigation cycles and both-brand saved replays. See `docs/navigation-reliability.md`. This closes the navigation test gate only.
5. Complete ten varied live scenarios per affected release-critical path and make results inspectable.
6. Verify real platform/site/print integration where required; mark external prerequisites explicitly.

Do not mark client-ready while these gates are open.
