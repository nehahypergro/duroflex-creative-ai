# Creative AI placement knowledge foundation

Version **1.0.0**, researched on **4 October 2026**. This local repository provides **131 placement profiles, 186 rules and 38 source records**. It is a broad, extensible static catalog, with explicit partial coverage. It does not claim every conceivable placement or publisher requirement is covered.

The implementation follows the existing CommonJS agent foundations. It owns only this directory and `tests/placement-knowledge`. It does not change the server, main UI, shared agent registry, or another agent's module. There is no live inference, campaign execution, publishing, credential handling, external messaging or recurring automation.

## Read and inspect

- [Studio placement logo rulebook](../../../docs/placements/logo-policy.md):
  client-approved omission contexts and top-left/top-right-only added-logo
  positioning, effective 15 October 2026. Its runtime integration status is
  explicit; this document does not rewrite published catalog snapshots.

- `knowledge/catalog.json`: profiles, tiered rules, source provenance and source conflicts.
- `catalog.schema.json`: Draft 2020-12 machine-readable catalog shape.
- `knowledge/sources.json` and `knowledge/source-inventory.md`: official sources, observation dates and access limitations.
- `knowledge/coverage.json` and `knowledge/coverage-matrix.md`: every included/conditional/unavailable profile and explicit future exclusions.
- `knowledge/design-principles.md`: original scoped heuristics, rationale and family-specific design application.
- `custom-import.schema.json`: future user dimension/use-case list and job-defined native fields.
- `pin.schema.json`: immutable job placement reference.
- `knowledge/versions/1.0.0.json`: saved original catalog snapshot for pinned jobs.
- `index.js`: callable matching, pinning, context assembly, metadata checks and custom import.
- `examples/`: labeled synthetic worked cases and counterexamples.
- `build-catalog.py` / `build-schemas.py`: offline authoring compilers; they do not fetch or refresh evidence.

A source's `accessCheckedAt` records this session's check. `verifiedAt` records content verification only. Inaccessible sources have null verified dates. Search-only Apple guidance is explicitly labeled and supports qualitative recommendations only. Profile `verifiedAt` is a snapshot review date, not a declaration that all requirements are known; `contentVerifiedAt`, `coverageStatus`, `unknowns` and the source inventory qualify it.

## Coverage and rule tiers

Profiles identify **channel, platform, publisher, placement and asset type**. Ratio is an asset constraint, never the selection identity. Supported families include social organic/paid images and carousels, fixed uploaded display banners, responsive ad asset sets, owned web/app imagery, email imagery, native/rich notifications, print documents, static OOH, commerce/catalog images and related thumbnails/marketing assets. Geographic banners and device upload contexts remain separate profiles.

1. **Mandatory**: verified technical/policy requirement, error severity. A user-defined custom spec is separately labeled `user-specified`, never platform verified.
2. **Official guidance**: recommendation, crop/display behavior or safe-area advice, warning severity. Numeric copy targets must not become hard limits.
3. **Heuristic**: original creative reasoning with scope and limits, advisory severity. No claimed performance effect.

Each rule retains source IDs, explicit profile scope, check method, verification/version dates, version, confidence/evidence status and plain-language rationale. Unknowns stay unknown. Profiles with no verified hard rules still expose conditional job inputs and applicable design guidance. `included` means actionable verified partial coverage, not every requirement known. `conditional` needs configured inputs/evidence. `unavailable` marks blocked official documentation. `future` inventory items are not selectable profiles.

Meta feed/story/carousel profiles for Facebook and Instagram are present, but their numeric technical contracts remain unavailable after official login blocks/throttling. Additional Meta surfaces are conditional candidates; still-image Reels eligibility is not assumed. Snapchat numeric Help Center pages returned CSS errors. We did not import third-party cheat-sheet values. TikTok Ad Network static images are separately researched from TikTok feed carousel and reservation fallback. Video production is outside scope; an image carousel requiring audio is not represented as purely static delivery.

## Lookup and version pinning

```js
const pk = require('./lib/creative-ai/placement-knowledge');
const catalog = pk.loadCatalog();
const choices = pk.searchProfiles('carousel', { channel: 'paid' }, catalog);
const profile = pk.resolveProfile({ id: 'google-upload-inline-rectangle' }, catalog);
const pin = pk.pinProfile({ id: profile.id, version: '1.0.0' }, catalog);
const selected = pk.resolvePin(pin, catalog); // profile + rules + sources + conflicts
```

Selection by fields requires platform, placement and assetType; ambiguous/unknown selectors throw. There is no nearest-ratio fallback. Dropdown consumers should show conditional/unavailable badges and gaps rather than implying all options are ready for export.

Jobs must store pins **and the exact catalog snapshot**. The original release is saved at `knowledge/versions/1.0.0.json`. The pin includes profile version, catalog version and SHA-256 digest. A changed rule or source invalidates the pin even if someone forgets to bump a version. Load the archived JSON through `loadCatalog(path)` for an old job. Do not reconstruct old jobs from “latest.” Schema describes shape; runtime additionally validates references, tier severity, evidence eligibility and bidirectional rule scope. Runtime checks are not a full general JSON Schema engine; validate external catalogs with a Draft 2020-12 validator first.

## Agent-facing assembly and conflicts

```js
const context = pk.assembleContext({
  pins: [pin], role: 'marketing-strategist',
  assignment: { objective: 'action', brief: 'Supplied assignment' },
  brandRules: [], truthfulClaims: [],
  constraints: [], conflicts: [],
  jobInputs: { destinationUrl: 'https://example.test', region: 'India' }
}, catalog);
```

Call this per role: `marketing-strategist`, `creative-director`, `copywriter`, `art-director`, `graphic-designer`, `reviewer`. Strategist gets message depth/action context; director evaluates exactly two concepts, continuity and exploration; copywriter supplies baked/native fields and hierarchy; art director gets crop/density/safe-area context; designer gets generation/export constraints; reviewer gets actual-output checks. Both concepts proceed automatically. No intermediate selection or human approval gate is introduced.

For later wiring, map the selected dropdown identity to pins in the workflow producer. Provide this context alongside the existing dossier, guardian guide and strategist/director contracts. Existing agent schemas may need a deliberate adapter for pinned placement context; this repository does not mutate them or send model requests. Whole-artwork generation remains the image-production model. Platform responsive ad assembly requires separately delivered complete image assets, logos and native text; it does not imply splitting artwork into compositional layers.

Brand/product/assignment requirements are preserved verbatim in supplied arrays. Explicit conflicts remain visible. Structured canvas constraints are checked against mandatory dimensions; requested baked promo copy conflicts with Merchant Center primary-image rules and triggers an RDA guidance tradeoff. Natural-language conflicts, ranges beyond this subset, claims and brand fit require semantic review. This foundation deliberately **does not** claim to find every conflict. `constraint-conflict` means resolve the assignment/requirements through targeted correction, not drop a rule. `job-inputs-required` requests missing job data, not human approval.

## Technical checks, native fields and units

```js
const measured = pk.inspectRaster('/absolute/path/final-artwork.png');
const report = pk.reviewTechnical(pin, { assets: { artwork: measured }, native: {} }, catalog);
```

`inspectRaster` measures actual file bytes and PNG/JPEG/GIF header dimensions, retaining path and hash. It is not a full decoder, animation/color-profile validator, OCR or image-quality review. `reviewTechnical` checks **supplied metadata**: exact/allowed pixels, min/max/ratios/megapixels, declared file types, asset counts, native field counts and implemented text measurement. Adapters must inspect actual files, not substitute desired values. It always returns `publisherAccepted:false` and `requiresRenderedReview:true`.

Native text cannot be satisfied by words in the generated image. Automated platform-supplied CTA controls are recorded separately and do not require invented user copy. A native field's character limit, recommended copy budget and likely truncation are distinct. Implemented measurement methods are code points, UTF-16 units, UTF-8 bytes and grapheme clusters **only when explicitly specified** (such as a custom job spec). UTF-8 byte measurement is a separate utility and cannot be supplied as a custom `maxChars` counter; provider payload-byte limits require the actual serialized payload. Official values with undocumented character algorithms return unknown; X weighted URL/Unicode and Google's exact double-width classification are not guessed. There is no universal notification title/body cap. Android's 30/40 values are design guidance for its templates.

KB/MB byte conventions are often unstated. The checker passes below both decimal/binary thresholds, fails above both, and reports unknown between them; strict `<` ceilings remain distinct from `<=`. Document page counts are metadata checks; publisher word counts are unresolved. Rendered/model/qualified human evaluation remains necessary for readability, semantic claim fit, exact baked text, crop/overlay collisions, PDF flattening, fidelity and brand execution. No such evaluation is claimed to have run on real campaign artwork here.

## Import future user specifications

```js
const customCatalog = pk.importCustomProfiles([
  {
    id: 'custom:homepage-launch', name: 'Homepage launch artwork',
    platform: 'owned', publisher: 'our-site', placement: 'homepage-hero',
    assetType: 'whole-image', canvas: { width: 1600, height: 600, unit: 'px' },
    exportContract: { formats: ['png'], maxBytes: 1500000 },
    nativeFields: [{ id: 'altText', required: true, maxChars: 200,
                     countMethod: 'unicode-code-points' }]
  }
], { source: { id: 'user:format-list', title: 'User format list v1',
               url: 'user:provided-format-list', verifiedAt: '2026-10-04' } }, catalog);
```

Custom rows have explicit placement identity, positive dimensions and `px`, `mm` or `in` units. Custom profiles use a separate namespace, retain user provenance and cannot replace official IDs. Native counting is explicit; `exportContract.maxBytes` is an exact byte ceiling. Imports return a new catalog and do not write the old one. Persist it, validate it, pin it and archive its snapshot. A custom dimension does not certify a platform. Only genuinely user-defined constraints belong here; update official evidence through the researched catalog instead of relabeling a guessed platform limit as verified.

For print, `printGeometry({trim, bleed, ppi})` calculates full bleed dimensions and raster pixels only from explicitly supplied physical units and effective PPI. It does not default to 300 DPI or 3mm bleed. Trim, bleed, interior safe area, output color profile, PDF preset, marks, stock, folds/finishing and production scale remain distinct job inputs. Millimeters are converted using 25.4mm per inch; pixel output rounds up and records that choice. No printer acceptance is implied.

## Update and refresh

1. Reopen the official source for the exact placement, objective, market and delivery context. Record content access, verification date, source version/section, short evidence summary and fetch limits. Search excerpts alone cannot support new mandatory numerical rules.
2. Classify each statement: enforced requirement, official recommendation or scoped heuristic. Record counting/byte/unit uncertainties and effective dates; do not copy old image-text percentage rules or blur paid/organic contracts.
3. Compare changed rules and resolve discrepancies explicitly in `sourceConflicts`. Merchant Center's 500-square announcement and current table conflict is intentionally conditional. RDA's two square-size recommendations are also retained as a recommendation conflict. RDA description specs90 versus older guidance80 is recorded; dedicated specs drive the technical contract.
4. Edit the authored compiler or curated JSON deliberately; bump catalog/profile/rule versions as appropriate, regenerate only owned files, validate and run tests. Archive the old catalog for pinned jobs. Do not let the compiler overwrite independently added custom imports.
5. Review rendered synthetic counterexamples; real job reviewers validate actual files and publisher previews when available. Unknowns require targeted data collection, not fabricated defaults.

Refresh high-change ad specs before new publishing and whenever a source announces a change. Schedule nothing unless the user explicitly requests monitoring. No automated source scraping or recurring task was created.

## Verification

```sh
python3 lib/creative-ai/placement-knowledge/build-catalog.py
python3 lib/creative-ai/placement-knowledge/build-schemas.py
python3 lib/creative-ai/placement-knowledge/build-reference.py
node --test tests/placement-knowledge/placement-knowledge.test.js
node lib/creative-ai/placement-knowledge/examples/synthetic.js
```

Tests exercise provenance/tier integrity, precise matching, snapshots, native versus baked text, unknown requirements, measurement differences, byte boundaries, print units, imports, conflicts and role context. Synthetic cases are authored contract demonstrations, not live agent outputs. Main app integration, actual publisher upload acceptance, inference, full image/PDF decoder adapters, exact publisher count implementations and semantic/rendered reviewer execution remain future integration work.
