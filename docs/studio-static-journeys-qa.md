# Static Studio journey completeness and QA — 20 October 2026

## Scope

All 42 feature IDs are mapped in `studio-static-feature-coverage.csv`. IDs 1–15 belong to Static Studio and are covered here. IDs 16–33 are Video, 34–38 Copy/Documents, and 39–42 Adaptation: their editors and feature logic are unchanged. Image reuse by those workspaces does not silently expand this pass.

The work is frontend journey implementation and regression testing. New generation remains unconnected in the redesigned interface. A saved brief can reach a specific deliverable plan and an honest generation-unavailable state; existing generated jobs can proceed through review, editing and download. The tests do not claim that fresh AI output or a complete marketplace/print production package was generated.

## Customer journeys and screen ownership

| Journey | Implemented sequence | Continuity / recovery |
| --- | --- | --- |
| One static post | Quick Create → recipe → one-page inputs → generation review → project → deliverable plan | One recipe; changing it replaces it; exact product variant; output language and fields survive reload |
| Multi-asset campaign | Brief → strategy → concepts → asset plan → grouped overview → deliverable plan | Stable IDs; per-deliverable details; rename persists; removing concept retains unassigned deliverables |
| Benefit / technology / claim | Brief → benefit or technology / exact claim and source → review reminders → saved creative | Supplied source stays distinct from artwork checks; no invented approval |
| Offer | Price / offer wording → terms → dates / destination → review | Reversed dates and unsafe/invalid destination URLs show errors without clearing input |
| Product-image set | Ordered images → purpose, planned copy and alt text → sequence plan | Add, remove, reorder and undo; one set remains one deliverable, item count reflects contents |
| Marketplace A+ | Marketplace / template / eligibility → ordered modules and module dimensions → handoff | Per-module sizes; no claim of account eligibility, marketplace acceptance or upload |
| Website / blog hero | Placement or article → destination / file requirement / image description → saved review / export | Correct pixel export; site integration remains separate |
| Story | Platform / safe-area notes / interaction plan → portrait creative review | Interface clearance must be reviewed against supplied notes; no fabricated safe-area certification |
| Carousel | Slide count → ordered per-slide copy / alt text → sequence review | Reduced slide count retains hidden slide text for expansion; explicit removal can be undone |
| Store post | Store / address / map or destination / local CTA → review → image download | One-store source stays with brief; no map publishing or QR generation implied |
| In-store print | Vendor / template / finished size / units / bleed / stock → proof/handoff instructions | Screen PNG/JPEG is not certified print-ready; existing print service remains the handoff destination |
| Partner creative | Partner / approved asset reference / lockup / reviewer → review | Partner review is a requirement note, not an invitation or recorded approval |
| Corporate LinkedIn | Occasion / names, roles, dates / supporting source → review | Literal wording survives punctuation, Unicode and reopening |
| Messaging visual | Channel / file limits / placeholder examples / fallback → review | Visual download only; no sending or actual customer-data merge |
| Collection | Select saved products → exact variant per product → shared brief | Unavailable products or missing variants block progression; brand-isolated sources |
| Existing artwork | Project → exact option → editor → original/revision export | Correct job / route / placement dispatch; direct original download does not imply it includes editor revisions |
| Missing image / failed download | Retained project → retry image or retry download → same review | Missing item links back; HTML/error payloads cannot masquerade as image exports |
| Return / recovery | Browser Back / project / saved draft / reload | Exact download breadcrumb preserves option; storage and stale-write recovery remain available |

Per-deliverable details are progressively disclosed in the same brief page. Older shared detail inputs remain visible when populated; new static briefs do not duplicate those fields. The dedicated deliverable screen carries the brief, format, language, individual inputs, ordered parts, review reminders, and handoff instructions. Reminders are explicitly not completed checks.

## Bugs and gaps addressed

1. **Download breadcrumb lost the selected option.** Reproduced: option 1 returned to `/0`. The link retains the complete item/option path. Before evidence: `browser-before.log`.
2. **Campaign asset rename disappeared in review.** Reproduced: named homepage asset became “Website banner.” Project item mapping now uses the saved output name. Before evidence: `browser-before.log`.
3. **Original export accepted non-image content.** Reproduced: HTTP 200 HTML was prepared as a saved image. All export formats now decode the source first; a decode failure remains visible and downloads nothing. Before evidence: `export-before.log`.
4. **No exit on missing download item.** Added a project recovery link.
5. **Variant checks differed by entry point.** Brief and campaign review now use one context-aware validation function, including stale IDs, collection members and each selected variant.
6. **Custom sizing reset a chosen story to square.** Selecting Custom preserves current dimensions.
7. **Retired feature metadata crashed the brief renderer.** Unknown recipes remain visible with retained inputs and a removal action.
8. **Reference-library outage looked like an empty library.** Added an explicit unavailable state and retry that preserves the draft.
9. **Late export could complete after leaving its view.** View/brand epoch check cancels delivery after navigation.
10. **Special static recipes had no specific screen content.** Added structured recipe details, ordered image/module/slide plans, collection selection and explicit handoff distinctions. This is a frontend capability addition, not proof that the corresponding generation backend is connected.

11. **Changing a set or carousel format left item dimensions stale.** A failing model regression reproduced the problem. Product-image and carousel items now follow the parent format while retaining their wording, including hidden slides. Marketplace modules keep their independent dimensions. Before evidence: `part-size-before.log`; model and browser after checks: `model-final.log` and `size-ui-final.log`.

## QA evidence

`work/studio-static-journeys-20261020/` contains before/after test logs, planning matrix JSON, saved-art matrix JSON, replay output and screenshots. The checkpoint in `before/` preserves this pass's starting frontend files.

- Planning matrix: 15 static recipes × 2 brands × 2 creation paths = 60 journey combinations. Each executes entry, input, specific fields, confirmation/plan, deliverable screen, reopening and return-to-inputs. Unicode and literal markup are tested.
- Saved-artwork matrix: 15 static features × 2 brands = 30 combinations. Select exact second option, verify job/brand/placement/route passed to the editor, download original/PNG/JPEG, read actual file dimensions and format, return to the exact option. The matrix stubs editor opening to check dispatch; actual Fabric editing/export is tested separately by `editor-rigorous.test.js` and `editor-production.test.js`.
- Edge cases: collection and variant errors, independent offer fields, dates/URLs, custom size, retired recipes, multi-part reordering and hidden-slide retention, asset/reference retry, invalid-image payload, late navigation, existing quota/revision conflict and brand isolation cases.
- Existing generic screen catalogue also exercises 45 preview/recovery states across both brands. These render checks are distinct from end-to-end production generation.

### Verification results

- Complete UI suite: **49 passed, 0 failed**, in `full-ui-tests.log` (about 111 seconds). This includes the 60 planning combinations and 30 saved-artwork combinations; these are expanded within browser tests, not 90 separate test-runner assertions.
- Shared editor / frontend / workspace regressions: **68 passed, 0 failed**, in `shared-editor-tests.log`. These exercise the real editor separately from the matrix dispatch stub.
- Both-brand saved-run checks: **Duroflex 0 failures; Sleepyhead 0 failures; 0 paid calls**, in `brand-replay.log`. Historical records remain unchanged.
- Final focused sizing / sequence browser checks: **2 passed**, including desktop widths 1280 and 1920 for product sets, marketplace modules, carousels and print, across both brands. Stable viewport screenshots are saved in `screens/deliverable-*.png`.
- Model validation includes invalid module dimensions, print dimensions, exact variants, parent-size propagation, independent module sizes and retained copy.
- Generation cost for this QA: **₹0 in paid generation/API calls**. This does not estimate the cost of Codex development usage.

## Practical limits

No paid generation, external publication, partner approval, marketplace upload, email/WhatsApp send, printer proof or billing change is performed. Manual planning data is saved in this browser. No claims of zero future bugs or completion of all 42 production engines are made. Saved original downloads and editor revision downloads are separate actions; the original remains unchanged.
