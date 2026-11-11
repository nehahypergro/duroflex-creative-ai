# Review checklist, edge fit and size from the brief (10 Nov 2026)

The asset evaluation of the 9–10 Nov test round found 7 images that did not meet their requirements. The checker had marked 6 of them Ready. The user chose fixes 1–9 and 11 from the suggested list (`work/asset-evaluation-20261110.md`).

New lean jobs pin `reviewChecklistVersion: 1` and `edgeFitVersion: 1`. Earlier jobs keep their saved contracts, verdicts and files.

## Fix 1: Product fingerprint (`lean/checklist.js`)

One small `lean-fingerprint` call (gpt-6-luna, medium) reads the exact SKU's official photos, up to 3. It lists 3–8 must-have visible features and the label's printed words:
- shape
- pattern
- bands in order
- piping and handles
- label shape, colour and position

The call runs alongside planning, so it adds no waiting time.

**Caching.**
- The reading is saved once per brand + product + variant + photo hashes, under `output/creative-ai/brands/<brandId>/product-fingerprints/`.
- Later jobs reuse it without a new call, with provenance (`reused`, `reusedFrom`).
- The other brand never reuses it.

**Rules.**
- Dimensions are refused.
- A failed reading never blocks the plan. It is recorded in `lean-product-fingerprint-error.json`.

**Where the features go.**
- Each feature becomes its own check (`product-feature-N`).
- The image brief lists them as "PRODUCT MUST-HAVES".

## Fixes 2, 3 and 4: New checks

Every image of a pinned job also gets three new checks (`lean/checklist.js` requirements):

| Fix | Check | What it asks |
|---|---|---|
| 2 | `pointers` | Does every pointer or leader line end on the part it names? |
| 3 | `slot-purpose` | Does the image do its planned job and view? The planner is told to name the exact view. |
| 4 | `reference-backdrop` | Does the scene avoid reproducing the product photo's room or props? |

## Fix 5: Label wording and repair

The `label-wording` check reads the label letter by letter against the fingerprint's words.

The local text reader (no paid call) finds the label area in the finished artwork:
- It uses near-miss matching, so garbled words are found too.
- It ignores planned campaign words.
- It keeps the tightest group of words.

The enlarged close-up is sent to the checker as `artwork-label-closeup`.

A `label-wording` mismatch is locally fixable. The single existing correction then also gets the official label close-up to copy from.

## Fix 6: Edge fit (`lean/edge-extend.js`)

Edge fit runs when the only findings are layout, and at least one says content is cut off by the canvas edge.

1. The artwork is scaled to 86%, evenly, never stretched. It is placed so that the new room is on the cut side.
2. One masked gpt-image-2 edit draws only the new border.
3. Every scaled pixel is put back exactly. Only a 6-pixel ring at its edge is blended.

**Brand isolation.** Before the request, brand isolation re-derives the anchor and mask from the unit's saved original (`verifyEdgeAnchor`), and sends nothing unless the bytes are identical.

**Using the candidate.** The candidate is checked like any correction. It is used only when the crop findings pass and nothing new is wrong.

**Other layout findings.** These are still not auto-corrected:
- a missed slot job
- a copied room
- a broken set rule
- text that is too small

## Fix 7: Set rules

A multi-page plan writes `setRules`: 2–6 rules that every page shares, such as the base, room family, colourway and lighting. They are validated, added to every page's image brief, and checked on every page (`set-rules`).

## Fix 8: Text size

The minimum line height depends on how each format is seen:

| Format | Seen at about | Minimum line height |
|---|---|---|
| Phone formats | 390 px wide | 10 CSS px |
| Close-reading formats | 390 px wide | 8 CSS px |
| A+ desktop | 970 px wide | 10 CSS px |
| Product page images | 400 px wide | 10 CSS px |
| Web and display banners | Their own size, up to 1,280 px | 10 CSS px |

- Fine print may be 80% of the minimum.
- Print, distance and notification formats are not measured.

**How it is used.**
- The planner and the image brief get the pixel minimum.
- The local text reader measures planned lines in the finished artwork and adds a `text-size` check. It never adds one when nothing matched.
- A too-small line blocks Ready and is not auto-corrected.

**Replay on the 9–10 Nov images.**
- Flagged: A+ mobile chips (about 10 px, minimum 16), the A+ mobile lifestyle name (14 px) and the infographic labels (14 px, minimum 23).
- Passed: the A+ desktop hero.

## Fix 9: Size from the brief (`studio-model.js`)

A brief that names a paper size ("an A4 Poster") chooses the matching print preset of the same kind on the read-back page, which says so. A later manual choice is kept. `briefSizeMismatch` reports a difference ("Your brief says A4, but this print is set to Poster · A2").

## Fix 11: Checker model trial

`scripts/creative-ai/trial-checker-models-20261110.js --live` re-checks 16 saved images with the new checklist, using three settings: luna medium, luna high and sol medium.
- 8 images are ones the evaluation found failing.
- 8 are ones it found good, to count false alarms.

Requests are sent one at a time and directly. Results and costs are kept under `work/checker-trial-20261110/` and `output/creative-ai/planner-experiments/`. The trial changes no job.

### Trial results (10 Nov 2026)

All three settings used the new checklist and saw 16 saved images: 8 that the evaluation found failing, and 8 it found good. Each check was sent directly, one at a time. There were no errors and no unknown costs.

| Setting | Failing images caught (right reason) | Good images flagged | Average time | Cost per check |
|---|---|---|---|---|
| A gpt-6-luna medium (current) | 2 / 8 (2) | 2 / 8 | 29 s | about ₹0.25 |
| B gpt-6-luna high | 5 / 8 (4) | 2 / 8 | 48 s | about ₹0.35 |
| C gpt-6.1-sol medium | 7 / 8 (7) | 2 / 8 | 32 s | about ₹4.33 |

**What C caught and missed.**
- C caught the A+ wrong pointer, the missing euro-top band, the pillow's invented tag, the PDP alternate angle (missing "Handcrafted for Smart Beds" marking and garbled label), the Marketplace label band, the copied neon room, and "DUTONLEX".
- C missed the Marketplace quilt pattern.

**C's two flags on "good" images can be argued either way.** The A+ hero repeats the reference photo's blue wingback bed styling, and the PDP surface detail lacks the side marking.

**Product fingerprints.** One reading was saved for each of the 7 products tested, in each brand's own store.

**Cost.** The trial cost about ₹79.44 in all (estimate at ₹96.6149/USD, 9 Oct 2026). Of that, C was about ₹69.25. Receipts are in the experiment records under `output/creative-ai/planner-experiments` (`experiment: checker-trial-20261110`).

**Failed attempts.**
- The first attempt stopped before any paid call (picture upload unavailable to scripts).
- The second attempt failed its first fingerprint reading on an empty `labelWords`, a schema bug fixed with a test. It cost about ₹0.20.

**Decision.** The user chose C (10 Nov 2026). New jobs now pin `lean-review` as gpt-6.1-sol medium, and earlier jobs keep gpt-6-luna.

Estimates:
- A run checked by luna adds the measured difference per check: one check per image at the low end, two at the high end.
- In a sol-checked run, the direct image checks count as per-image cost, not planning.
- The estimate message says "and the more careful image checker".

## Fixes from the Sofa Drip Pro live batch (10 Nov 2026)

The 52-card Sleepyhead Sofa Drip Pro batch found three planning failures and three over-strict checks. Each fix has a regression test, and the planning fixes replay the saved failed jobs (6cfc75af, ed731707, abfe8859).

| Problem seen | Fix |
|---|---|
| Brochure failed: the planner wrote no objective-playbook note | A missing note is filled as "Applied automatically…", with a reason that says so |
| Brochure failed "too verbose" | The size check measures only the planner's writing; rule decisions are not counted and set rules get their own room (1,500 characters) |
| LinkedIn Square failed: the planner wrote "adapt" for the brand typeface rule | "adapt" with a reason on a mandatory rule is recorded as "apply" and the note is kept. Only the objective playbook and the PDP technology rule keep "adapt"; "not applicable" still fails |
| Mirrored camera angle flagged as the wrong view | The slot-purpose and structure checks treat front-left and front-right three-quarter views as the same kind of view; the planner names the kind of view, not a direction |
| Readable text flagged as too small | Minimum 8.5 CSS px (fine print 7), 1 px measuring tolerance, wide desktop images judged at a 1280 px screen |
| Images copied the official photos' room | Product fingerprint v2 also describes the photos' room (`photoBackdrop`). The image brief says not to recreate it and the backdrop check names it. v1 readings are not reused |

In the rerun of the 28 cards that were not fully Ready, the first 9 cards went from 15 to 23 Ready images (A+ 6 → 10, PMax 1 → 3). The rest stopped when the OpenAI credit ran out.
