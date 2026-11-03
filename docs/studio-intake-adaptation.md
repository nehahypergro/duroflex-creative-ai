# Static Studio intake adaptation — 28 October 2026

The Hypergro Static Studio form patterns were adapted into the existing vanilla JavaScript Studio. Source inspected: `hypergro-website-remix/app/routes/static-studio+/_index.tsx`, form validation, setup options and completion component. No Remix shell, Redux store, authentication, analytics or remote service was imported.

## Connected

- Existing named-brand switch, saved product library, exact variants, collections and brand-only focus.
- Existing full asset catalogue, per-output sizes and language, preset-specific inputs, ordered slots, physical print requirements and planning-only labels.
- Brief, message, RTBs, objective/funnel stage, audience, age, markets, optional themes/tone, background and additional directions. New directions reach the existing runtime brief and strategy. Optional audience fields never become universal generation gates.
- Saved product RTBs use explicit feature text only; absent structured features are not fabricated. Selected facts are bound to the saved product and revalidated against that product on submission. User RTB notes remain supplied brief evidence.
- One or two creative options bind to existing concept routes; every option includes all pack slots. Existing drafts without this choice retain two options. Cost examples now match the selected option count rather than halving unrelated historic bills.
- Completion and links to missing required inputs. Commercial requirements share the existing runtime field list. Incomplete planning previews remain available. Readiness checks and paid submission remain distinct from form completion.
- Device-scoped draft saving, recovery, brand switching and current generation action are retained.

## Explicit limitations

- PDF attachment is device-only IndexedDB storage with name, size and signature validation (20 MB maximum); it is not PDF parsing or safety certification. Download and reload are verified. Automatic extraction and cloud attachment synchronization are not connected. Users must enter requirements as text; PDF contents are not sent to any provider. Replacements preserve earlier stored bytes to avoid destructive overwrites on a failed draft save.
- Local image reference uploads retain their previous Brand Library processing requirement. A device-only visual reference is not silently treated as a provider attachment.
- Multi-format campaigns and existing planning-only formats do not gain generation merely from the new interface. Readiness retains the supported-route boundary.
- The engine supports one or two concept options, not Hypergro's three-option choice. Pack image counts remain independent.
- No paid generation occurred in this adaptation. Backend readiness and request handoff were checked with saved sources and providers that reject paid calls.

## Verification

- Existing Studio browser suite: 88 initially passed; one planning-preview regression reproduced, fixed and passed its focused rerun (89 scenarios total).
- Existing saved-brand generation suite including new intake handoff: 20 passed; final new handoff rerun passed after funnel mapping changes.
- New model tests: 3 passed.
- New browser test: passed PDF attachment/download byte comparison, reload, same-brand product/variant selection, direction saving, all 42 asset forms per brand, zero foreign requests and widths 1366, 1024 and 390.
- Visual review of the generated screenshots plus interactive in-app browser checks. Production authentication remains intact.

Local interface preview can be started with `node tests/creative-ai/helpers/intake-preview.cjs 1857`. It reads saved brand/product profiles, disables all write/API operations, and marks generation unavailable. It is a development preview, not an alternate authenticated client deployment.

## Live brief autofill

Added local, debounced (700 ms) extraction from typed brief text. It recognises explicit language/count/funnel instructions, labelled audience/markets/age/RTBs/message/background/direction, exact or unique same-brand product matches, supported theme/tone lists, and labelled fields belonging to the selected single asset. It deliberately does not infer unsupported narrative intentions, switch brands, change structural presets/pack counts, or submit generation. PDF extraction remains separate.

Field provenance records the supporting text and original value. Explicit field edits—including clearing a field—protect that field from later autofill. Removing supporting text restores the previous value only while autofill still owns it. Pause retains values; Undo restores autofilled values and pauses. Language reaches per-output settings while preserving manually edited output languages. All state persists in the existing draft store.

Checks: six focused model scenarios and the three intake checks pass. Both-brand browser typing checks pass (caret, manual overrides, reload, language handoff, undo/resume, no generation/foreign requests); existing all-42-format intake browser test also passes. Testing exposed a null theme-list rendering error after removing supporting text; the renderer now tolerates empty lists and the same browser scenario passes. Saved-product data and production jobs were not changed. No server restart or paid API calls were required.

## Compact brief-first intake — 28 October 2026

The brief, brand/product and output choices stay visible. Product fact emphasis, manual product fallback, audience/message, tone/context, and image direction/references use expandable sections. Required placement fields retain their existing validators and progress links; no asset catalogue, generation payload, worker or provider changes were made in this pass.

“Review all inputs” builds an inventory from the actual rendered controls for the selected assets (including ordered slots and read-only sizes), shows their current values and opens the matching field on Edit/View. Disclosure state is kept per draft during frontend rerenders so typing/autofill does not close the section being edited. A reload begins with optional sections closed while their saved values remain intact. Optional values are not silently removed.

The searchable scope inventory is `work/compact-intake-20261028/input-inventory.html`, based on the existing 42-asset coverage catalogue. It distinguishes core fields, optional preferences and placement-specific fields. The live form remains authoritative for conditional preset fields. No unsupported creativity control, Word import or PDF extraction was added.

Verification: compact-intake browser check (both brands, inventory links, unchanged manual values, autofill disclosure preservation, independent draft state and unique sequence jump targets); existing intake browser coverage (all 42 asset forms for both brands, PDF byte roundtrip, saved values and 1366/1024/390 widths); autofill browser checks; six autofill and three intake model checks. The prior browser test was updated to expand optional sections before interacting with them. All final runs pass; no paid image generation or production job mutation occurred.

### Brand logo preview regression

The read-only intake preview omitted the brand canvas-asset route, causing both switcher logo requests to return 404 and display text fallbacks. It now serves only approved, same-brand logo files named in each saved brand manifest, with image content types; unknown and cross-brand filenames remain unavailable and writes remain disabled. The work preview entry point reuses the regression helper instead of duplicating the server. `studio-intake-logos-browser.test.js` reproduced the missing logos before the fix and passes for both brand workspaces afterward. Visually confirmed original Duroflex and Sleepyhead logos in preview; production server/workers were not restarted.

## Assignment-first intake — 28 October 2026

The primary intake now begins with the user's brief, followed by a compact brand,
product and asset row. Product browsing uses the saved categories and thumbnails;
asset browsing groups all existing feature families and adds direct shortcuts to
Amazon/Premium modules, retail/print, email, RCS, push, PMax and LinkedIn presets.
Planning-only families retain their production-pending labels.

Brief details and asset requirements occupy separate columns. Optional audience,
occasion, RTBs, exclusions and supplied visual constraints are disclosed on demand.
Existing per-format fields remain accessible, including complete pack contents and
supplied item instructions. Intake never generates copy, scene plans or images.
The three wording choices are writing later, exact supplied wording, or no added
text. Required facts and qualifiers travel through the existing shared brief.

Autofill runs locally while typing, without a toggle or provider calls. It extracts
supported explicit details, including unique same-brand product matches, carousel
count/channel, language and wording mode. It does not imply general LLM document
understanding. Ambiguous details stay unresolved. Manual changes, including empty
values, win. Undo restores only autofill-owned values and suppresses refilling the
same text until the brief changes. Sources distinguish brief, library, defaults,
manual choices and explicitly recorded suggestions; no inferred recommendation is
misrepresented as library truth.

Version-2 briefs require a confirmed requirements snapshot. Save timestamps and
UI metadata do not invalidate it; requirement edits do. The shared server validator
checks the snapshot before preparation, and the existing readiness token still
binds submission to the exact draft and source versions. Existing jobs and legacy
submitted contracts are not migrated. New fields are passed through the existing
strategy/generation brief, while admin submission capture retains the whole draft.

Verification covered both saved brands, all 42 existing asset forms, every new
preset shortcut, thumbnails, brand logos, exact supplied wording, manual precedence,
undo, PDF byte-preserving storage/download, reloads, confirmation invalidation and
1440/1024/390-pixel layouts. Shared generation readiness tests use isolated pinned
brand evidence and fail if a paid provider call is attempted. Evidence is in
`work/assignment-intake-20261028`.

The idle supervised server was restarted to load these rules; all 308 saved job
records matched their prior SHA-256 hashes. No batch was resumed. Local admin setup
is still required for authenticated use; the read-only preview on 1857 remains
available for inspecting the form. PDF text extraction, uploaded-reference processing,
new generation capabilities and live artwork testing are not delivered by this UI
change. Existing provider/format limits still apply (including the current live
carousel profile's 2–6-card range; longer saved plans are not newly enabled here).

## Brief document import and account sync — 28 October 2026

Supersedes the earlier PDF/Word integration limitations for **authenticated Studio**. The read-only intake preview deliberately retains device-only PDF storage.

- `Add PDF or Word` accepts native PDF and Word `.docx` originals (20 MiB each). A separate short-lived parser reads PDF text and DOCX body/table/header/footer/note text without executing macros, external links or embedded objects. Original bytes, SHA-256 and extraction status are retained in private MongoDB GridFS / metadata. PDF parsing is bounded to 100 pages and 45 seconds; each import is limited to 100,000 text characters. Up to 20 included documents / 100,000 characters per brief; archived uploads are retained separately.
- A scanned, protected, damaged or otherwise unreadable document remains downloadable with `needs-text`; mixed readable/unreadable PDF pages and Word embedded content / tracked changes report partial coverage. There is **no OCR**. Older binary `.doc` must be saved as `.docx`. Visual references embedded in documents are not automatically added to the brand library or image generator.
- Extracted text is inspectable in the attachment and confirmation views. Supported details feed the existing local autofill. Explicit typed brief fields take precedence over documents; manual field changes take precedence over both. Ambiguity remains visible; unsupported details are not invented. Undo binds to both the typed brief and included document contents. Removal retracts document-owned values only.
- The short campaign brief contains the document names, not a pasted book. Immutable document text/hashes are pinned in canonical campaign input and supplied to the shared guardian/strategy handoff in bounded source chunks. Original wording is not silently truncated or interpreted as mandatory literal artwork copy. Typed brief / confirmed choices take priority. Uploaded originals/text are authenticated and checked again before readiness/generation.
- Briefs sync to the signed-in account with server revisions and comparison-and-swap writes. Another account (including an administrator) cannot retrieve these private drafts or originals via the brief APIs. Same-brand/draft document ownership is checked on save and generation handoff. The original files use authenticated download routes, not public CDN URLs.
- Device storage remains the offline recovery copy. Status distinguishes device-only, syncing, account-saved, retry and conflict. Conflicts offer a local JSON export and an explicit choice to load the account version; they never overwrite the server automatically. Lost upload responses can recover originals via `Recover uploaded files`. Interrupted metadata writes can recover a completed GridFS original. Previously device-only PDFs have an explicit import action.
- Account sync covers the brief and these brief documents. Existing visual-reference upload processing, organisation/trash metadata, and generated artwork delivery retain their existing workflows.

### Deployment boundary
The main service remains localhost-only, with persistent local MongoDB and automatic job resumption disabled. Actual phone/remote-computer access still requires the approved hosted HTTPS Studio and shared database setup (Atlas was explicitly deferred). Two isolated browser contexts verify cross-session restoration and conflict handling; this is not a claim of deployed remote access. No production user, password, public sharing or network exposure was created.

### Verification
Evidence: `work/brief-documents-20261028/`.
- Native PDF + Unicode DOCX import, both brands, original-byte downloads, idempotent retry, wrong-account/brand rejection, request-origin protection, stale version rejection, scanned-document handling and interrupted-upload recovery.
- Authenticated browser workflow with two isolated contexts: manual edits survive import; second context restores brief/files; conflicting edits are preserved and explicitly resolved.
- Existing 42-format browser intake coverage, preset shortcuts, PDF device-storage compatibility and saved-brand generation readiness checks pass without paid provider calls.
- Long imported source handoff retains every character/qualifier while leaving the short request under its existing limit; changing document content changes readiness identity.
