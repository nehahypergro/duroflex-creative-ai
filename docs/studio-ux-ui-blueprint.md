# Studio UX and UI blueprint

Design specification and implemented UI preview · reviewed 19 October 2026

Build the approved **Option B campaign rows** direction into a shared marketer workspace for Duroflex and Sleepyhead. The first release of the redesign is a complete, testable front end. Existing working services can be connected after the interface is verified; new feature engines come later.

The specification below includes intended behaviour beyond the current UI preview. The implementation review immediately below distinguishes what is available now. The accompanying 102-case QA checklist remains a planned acceptance matrix; executed results are recorded separately in [the implementation QA report](studio-ui-implementation-qa.md).

## Implementation review and revisions

Reviewed against all 42 feature IDs, the approved Option B direction and the existing repository contracts before building. The shared front end is available at `/creative-ai/studio.html`; the current application remains at `/creative-ai`.

| Design principle | Decision applied in this build |
| --- | --- |
| Recognition before recall | Home leads with saved artwork and project names, followed by six task groups. Search exposes the full feature inventory when needed. |
| Reduce competing decisions | One main next action per project row; one continuous brief with contextual fields and a project summary. No 42-card home catalogue. |
| Make colour meaningful | Dark aubergine text, purple primary actions and selection, pink and related hues for grouping. Success, attention and failure each have a readable text label; colour is never the only signal. |
| Keep attention on the work | Large uncropped artwork on review screens, restrained dividers, serif display headings and readable system-font controls. Thumbnail cropping is decorative; review/download retain the complete image. |
| Make recovery part of the journey | Independent draft IDs, visible saves, revision conflict detection, save-copy/download recovery, unavailable project placeholders and retry. |
| Match the user's mental model | Home → brief → project → compare → Edit → download. Technical pipeline activity stays in the existing application. |

Revisions from the initial proposal:

1. New briefs use **Preview project**, not a Create button that implies an unconnected generation service. A persistent preview label makes this boundary visible.
2. Drafts, notes, selections, storyboard edits and version plans are stored per brand on this device. They are not presented as cloud-synced work or production approvals.
3. The existing production editor is reused. **Edit** may save a real, separate revision; the review screen says so. No new editor implementation or image-model change was introduced.
4. On mobile the summary follows the brief in the normal document flow. It does not float over fields or the keyboard. A collapsible bottom summary remains a possible later refinement.
5. All 42 capabilities have stable IDs, output types and applicable brief fields. This is not a claim that 42 generation engines exist. Typed CSV mapping, print-vendor preflight, native publishing and detailed external-integration workflows still require their dedicated feature phase.
6. Costs are read from the existing ledger and shown as INR with estimated/confirmed/unknown distinctions and the stored conversion date. New UI tests do not generate paid usage.

### Available in the UI preview

- Shared Home, searchable/filterable Projects and brand-scoped Library.
- One-page brief, product and variant selection, local reference attachments, 42 deliverable choices, dimensions/language/duration/slide settings and contextual details.
- Multiple saved drafts, refresh/reopen, failed-save navigation protection and stale-tab recovery.
- Saved project and alternative review, local selection/notes, preserved original quality flags, existing editor entry and actual PNG/JPEG downloads.
- Resize, translation and store-version **plans** saved separately from their source.
- Manual writing workspace and editable storyboard scenes with live durations, ordering and removal.
- Loading, empty, missing-image, partial-load and retry states; responsive layouts and visible keyboard focus.

### Remaining service and detailed UI work

New-brief generation, AI writing, video rendering/playback, document rendering, actual adaptation batches, multi-product collection selection, customer-data imports, full CSV mapping, approval routing and bulk delivery are not connected in this preview. The existing studio continues to handle its implemented services. These boundaries are shown in the relevant screens; no successful-looking generation or publishing result is fabricated.

Rollback is immediate: open `/creative-ai`. The new preview has separate files and draft keys. A pre-change checkpoint and exact route rollback instructions are recorded in the QA report. No historical jobs, brand knowledge, artwork verdicts or cost receipts were rewritten.

## Design decisions

1. **Start with work, then tools.** Home shows recognisable active campaigns and their next actions before six compact feature groups. It does not show a catalogue of 42 tools, a large welcome hero or technical activity logs.
2. **One project can be small.** A single WhatsApp image and a multi-output campaign use the same project structure. Use “Create a project” and “Create” rather than forcing every task to be called a campaign.
3. **One brief page, with relevant detail.** All inputs remain on one continuous page. Inline sections reveal only the settings needed by selected outputs. One page does not mean squeezing the entire form into one viewport.
4. **Artwork leads.** Large previews, compact actions, restrained separators and contextual controls replace nested cards and permanent technical panels.
5. **A status must suggest an action.** “Needs attention” links to the exact issue. A project with partial success retains usable outputs and shows which item needs attention.
6. **Progressive disclosure must not hide a problem.** Advanced settings can collapse; missing required details, failed saves and blocked downloads remain visible.
7. **Keep the two brands separate.** Shared UI and engine, separate products, references, fonts, logos, drafts and versions. Generic onboarding is deferred to the separate Creative AI Studio project.

## What the repository already provides

| Foundation | Reuse in the redesign |
| --- | --- |
| Plain HTML/CSS/JavaScript interface in `public/creative-ai/` | Introduce small view/controller modules and shared components; no framework migration is required for this UI work. |
| Brand navigation and stale-response guards in `app.js` | Preserve brand scoping and prevent a slow response from replacing a newer screen. |
| Fabric editor and `canvas-model.js` | Retain document format, contextual editing, width reflow, crop, history, unavailable-layer preservation and export rendering. |
| Saved creative versions and accompanying copy | Preserve immutable originals, selected-version checks, review provenance and explicit AI actions. |
| Existing cost ledger | Display INR, distinguish estimates, recorded usage and unavailable billing. Do not duplicate spend during retries or navigation. |
| Existing offline, editor and both-brand replay tests | Extend these tests for integration; do not replace them with screenshot-only checks. |

The brief currently stores form state in session storage under a research-session key, and storage failures are swallowed. That is not a durable multi-project draft system. The redesign needs distinct draft identities and a visible save state. Existing saved accompanying-copy drafts are separate from this brief-draft requirement.

References: [production editor](production-editor.md), [saved creative workflows](creative-workflows.md), [editor QA](editor-qa-matrix.md), [regression policy](creative-ai-regression-policy.md).

## Navigation and hierarchy

**Main navigation:** Home · Projects · Library. Persistent Duroflex / Sleepyhead toggle. Costs are a secondary destination; project-level usage is available within a project. Do not invent account, collaboration or notification controls without a working purpose.

**Hierarchy:** Brand → Project → Deliverable → Creative option → Revision or adapted version.

“Deliverable” means an Instagram story, carousel, website banner, video, email copy or document. A carousel contains ordered slides; it is not a set of unrelated projects. Language, size and store variants stay grouped beneath their source.

| Feature group | Typical entry choices |
| --- | --- |
| Social & campaigns | Posts, stories, carousels, product reels, festive campaigns |
| Website & marketplaces | Product images, banners, A+ content, product explainers |
| Retail & local | Store posts, offers, print, partner creatives, screen loops |
| Customer messaging | WhatsApp, email, RCS, personalised versions |
| Corporate & PR | LinkedIn, articles, announcements, press material |
| Training & sales | Training films, decks, FAQs, sales material, catalogues |

These are shortcuts into shared workflows. A deliverable may appear in more than one shortcut group without creating a second implementation. Resize, translate and store versions are available from existing work and from relevant brief settings.

## Primary journeys

| Journey | Path | Completion and recovery |
| --- | --- | --- |
| Create one item | Home → group shortcut → one-page brief → project → review → optional edit → download | Brief survives validation and navigation; a failed item can be retried without restarting successful items. |
| Create a campaign | Home → Create new → shared brief with multiple deliverables → project workspace | Each deliverable has its own status; the campaign remains usable during partial completion. |
| Resume work | Home campaign row or Projects → action appropriate to its state | Restore the correct draft, creative option or revision; preserve filters and scroll when returning. |
| Make changes | Artwork → Edit → select text/image/logo → change → save → compare | Original remains available. Save conflicts do not silently replace another revision. |
| Adapt selected artwork | Create versions → size/language/store choices → inspect batch → create → review outputs | Source version is explicit. Changed outputs do not inherit their parent's completed review. |
| Reuse saved material | Library → product/reference → Use in a brief | Reuse saved official product evidence; importing a new URL is separate from refreshing an existing product. |
| Deliver work | Selected item or project → Download → select files/settings → prepare → download | Missing files and flagged items are explained individually. Packaging never means published or sent. |

## Screen specifications

### 1 Home

Show a modest “Your work at Duroflex” title, Create new, and three to five recent active project rows. Each row contains a recognisable thumbnail, name, useful status and one primary next action: Continue brief, Review options, Make changes or Download. Secondary actions live in a labelled menu. “View all projects” opens Projects with the same brand.

Below the work rows, show six compact feature-group links with an icon and two or three examples. Use space for actual work, not promotional copy.

Empty state: “Your first project starts here” with Create new and the same six groups. Search-empty and first-use-empty are different states. An unavailable thumbnail retains the row, name and action; it does not erase the project. Archive is preferable to immediate deletion where the existing service supports it; unsupported actions remain absent from live mode.

### 2 Complete brief on one page

Use six sections with a compact sticky output summary and Create action. On narrow screens the summary becomes a collapsible bottom area without obscuring fields.

| Section | Inputs and behaviour |
| --- | --- |
| What are we making? | Editable project name; task group; brief; objective. Entering through a group preselects relevant choices, not a mandatory style. |
| Who and what should it communicate? | Audience from the user's brief, key message, CTA and optional destination. Do not turn assumed audience preferences into verified research. |
| Products and source material | Product/collection/brand-only choice; saved-product search; official URL import; exact variant and source-image selection when ambiguous; uploads and saved reference picker. Brand-only hides irrelevant SKU requirements. |
| Deliverables | Add/remove rows; format, dimensions, slide count or duration; output-specific fields expand inline. Custom width, height and units use ordinary inputs, never JSON textareas. |
| Versions and details | Language; optional offers, dates, disclaimers, partner marks, regional/store data and other relevant requirements. Preserve shared values and explicit per-output overrides. |
| Creative preferences | Optional people, setting, lighting and treatment choices. Default is “Let the creative team decide,” not no people or warm daylight. Pinned brand rules remain distinct from editable preferences. |

The sticky summary shows output count, chosen sizes/languages, a concise missing-details summary, save state and available INR estimate. Required errors link to and focus the corresponding field. Validate on blur and submit; do not shout at untouched fields on initial entry.

Changing group, product, language or output type must not silently delete entered data. Explain material conflicts inline; preserve removed settings in the draft where safe, but never submit hidden incompatible fields. Show affected deliverables when a shared value changes. Deleting a deliverable offers Undo. Removing the final deliverable disables Create with a useful explanation.

Saved products reopen without a new website lookup. Refresh is an explicit Library action. Imported URLs and uploads have independent loading, success, partial-failure and retry states. One failed attachment must not clear the brief.

### 3 Project workspace

Top area: project name, View brief, Add deliverable and Download. Use Images, Videos and Copy & documents filters only when useful. A project row shows artwork, output name, concise format details, status, next action and a versions disclosure.

Progress is truthful and item-specific: Queued, Creating, Ready to review or Needs attention. Do not display a fabricated percentage or ETA. Brief changes after generation create a new brief revision; existing artwork remains tied to its original brief. Existing jobs can populate this screen through an adapter. A unified mixed-media campaign is a proposed contract until its service exists.

Partial completion example: “3 ready to review · 1 needs attention.” Open the three results immediately. The failed item explains what happened and offers only the retry/resume action actually supported by its service. A network disconnect does not imply that a generation job stopped.

Technical activity and raw diagnostics remain available under secondary details, not as the main client experience. Keep actionable quality concerns visible.

### 4 Review options

Show two large alternatives, option names and a one-line creative intent. Provide zoom and a single-option focus view for smaller screens. “At a glance” contains up to three short icon-supported explanations from saved evidence, not invented rationale.

Choosing an option, giving feedback and passing quality checks are separate events. Use “Use this option” for selection. Show actual saved checks and unresolved issues in concise language. Do not claim “Copy is readable” merely because that was the design intention.

Feedback is saved against the exact output and revision and does not silently train the brand. Saving feedback does not trigger paid correction. A separate AI change action explains what it will create and displays an estimate when available.

### 5 Image editor

Artwork dominates the page. Left rail: Text, Images, Brand and Shapes. Show the selected object's primary controls in one place; avoid duplicating the same toolbar in both a floating bar and a large side panel. Position, advanced effects and layers open on demand.

| Selection | Relevant controls |
| --- | --- |
| Nothing selected | Add text/image/shape, fit/zoom, preview, original comparison |
| Text | Inline editing, font, actual weight/style, size, colour, alignment; expandable letter/line spacing and effects |
| Photograph | Crop, reposition, zoom, replace; preserve the current photo until its replacement loads |
| Added image | Move, resize, opacity, crop/replace where supported |
| Official logo | Position, proportional size, compatible saved logo variant; no stretching |
| CTA | Text, background colour, padding, corner treatment and grouping |
| Multiple objects | Align, distribute, group/ungroup, order, duplicate, hide and lock |

Keep snapping, keyboard nudge, undo/redo, contextual delete and width reflow. Text side handles change line wrapping; corner resizing changes type size proportionally. Disable canvas shortcuts while a text field is being typed into. Locked and hidden objects remain reachable through Position/Layers.

Use “Edit” for entry. For flattened artwork, explain the practical choice: “Prepare text for editing” or “Add text and images.” Show a comparison when reconstruction differs from the source. Existing embedded product labels and incidental lettering must stay protected. Never suggest that a flattened source already contains editable text.

Fonts can include brand fonts and other available fonts without an unapproved-font warning. Actual missing files or unsupported characters still require clear recovery before an accurate export. An unavailable image remains in the layer list with its saved geometry and a Retry action.

Save states: Saving… / Saved / Saved on this device / Couldn't save — Retry. Never show Saved before the relevant persistence acknowledgement. Close/back/brand-switch protection is needed only when pending changes cannot be recovered. Manual edits and ordinary exports must not call AI.

### 6 Versions and batch work

Keep the selected source and its revision visible. Tabs: Resize, Translate, Store versions. Choose targets, inspect a count and cost summary, then create. Do not treat one square output as a freshly reviewed story simply by changing its dimensions.

Custom sizes use numeric inputs and explicit units. Translation preserves protected names, numbers and qualifiers; expose language-specific review needs. Store-data import provides a downloadable template, column mapping, sample preview and row-specific errors. Resolve duplicate records and missing QR/offer fields before creation. Do not claim QR destinations have been verified when only their format was checked.

Large batches start with a manageable preview and an exceptions filter, not hundreds of cards. Display succeeded, pending and failed counts. Retry selected failures only when the service supports safe idempotent retries. New versions stay under the original; source files and historical reviews remain untouched.

### 7 Download

List exact selected revisions, output dimensions, file types and associated copy. Default campaign packs exclude flagged artwork and unchecked accompanying copy, matching existing behaviour. An explicit draft/include-flagged option may remain available where supported, retaining its notes. Do not introduce a blanket rule that only formally approved files can be downloaded.

Expose supported PNG/JPEG/WebP, original files and available package exports. Separate artwork copy, accompanying captions and alt text; do not relabel one as another. Missing captions/alt text remain missing unless an explicit generation action creates them. Export never silently adds a paid AI call.

Show Preparing download, Ready to download and failure/retry states. A server-created file is not proof the browser saved it. Print and native/email handoffs keep their existing production-specific requirements; a ZIP, HTML file or raster PDF does not imply publishing, sending or printer approval.

### 8 Projects

Search names and products; filter status/type; sort by recent activity. Retain filters and scroll on return from a project. Distinguish no projects, no matching results and failed loading. Keep project titles editable without changing immutable source identity. Duplication starts a separate draft and does not copy old generation spend or approval.

### 9 Library

Start with Products, Brand assets, Inspiration and Uploads. Stores & data is a proposed section for later data services. Products show variant, saved-source details and Use in a brief. Product Refresh is explicit and preserves historical snapshots.

Logos, fonts and guidelines are clearly distinguished. A stored file is not automatically processed or applied. Reference detail can show what has actually been extracted and its source; missing evidence stays visible. Uploads retain their chosen destination brand even if navigation changes during upload. Do not delete referenced assets through a casual row action.

### 10 Video and document workspaces

These require full front-end scene coverage but must be labelled prototype-only until their respective services are connected. Do not imply that a static timeline is a functioning renderer.

Video: script/storyboard → scene review → edit → preview/export, using the same project shell. Scene list, reorder, duration, footage, captions, voice/music and end-frame controls appear as relevant. Show missing footage, unavailable audio, text-too-long-for-duration, pending scene approval and failed render states. Training quiz design and assessment delivery remain unresolved; a downloadable MP4 is not an interactive assessment engine.

Copy/documents: channel-specific fields or document sections, selection-based formatting, manual edits, original comparison and history. Email subject/preheader/body/CTA, PR fact/quote sections, catalogue data tables and training chapters use the same workspace pattern with different schemas. Rewrite and Translate are explicit AI actions. Saving edits does not imply checks passed or that an email was sent.

## Status and language system

| UI wording | Meaning / action |
| --- | --- |
| Draft | Work can resume; Continue brief |
| Creating | Service confirms a queued/running request; View progress |
| Ready to review | An output exists; Review options |
| Selected | User chose this option; this is not a quality verdict |
| Needs attention | Specific missing details or observed issue; Open issue |
| Checks passed | Only where saved checks support this exact revision |
| Not checked after edits | Artwork or copy changed; do not inherit old checks |
| Saved | Relevant persistence completed, not artwork approval |
| Usage unavailable | Billing data is absent; never replace with ₹0 |

Use violet for primary actions/selection, pink/lilac as supporting surfaces, blue for running work, amber for attention, green for successful saves/checks and red for blocking failures. Always pair colour with text or an icon. Product-brand colours stay within artwork and brand assets; the application chrome remains consistent.

Use serif headings sparingly and readable control text; typography sizes and spacing should serve scanability. Keep borders for inputs, selections and necessary separators. Measure contrast before freezing tokens. Aim for WCAG AA contrast, visible keyboard focus, labelled icon controls, reduced-motion support and usable controls at 200% zoom.

Example errors describe consequence and recovery:

- “This image couldn't load. Your layer is still saved. Retry loading.”
- “Your changes are safe on this device. We couldn't save them to the project. Retry.” Only use this after local persistence succeeds.
- “This project changed in another tab. Compare versions before saving.”
- “We lost the connection. Your request may still be running. Check status.”
- “Choose a mattress height for this variant.”
- “2 store rows need an offer end date. Review rows.”

## State and integration contract

Use explicit brand, draft/project, deliverable, option and revision IDs internally. Never infer identity from display names or the currently visible brand. Separate brief values from request status, save status, selection and quality checks. Dimensions are numeric with units; serialised objects are not JSON inside text fields.

Capture request destination and source revision when an action starts. Use cancellation/stale-response protection for navigation. Prevent duplicate submits; an uncertain network outcome first checks the existing request instead of dispatching another paid one. Meaningful brief changes receive a new request identity.

Local prototype persistence must be separate from production records and labelled “Saved on this device.” Do not put sensitive customer datasets into generic browser recovery storage. Server-backed drafts, mixed-media project aggregation and other missing contracts are later integration work, not assumed existing capabilities.

| Front-end capability mode | Behaviour |
| --- | --- |
| Connected | Uses existing service and its real statuses; no made-up success. |
| Prototype | Uses isolated fixture data, a visible prototype label and simulated responses; no paid or production writes. |
| Unavailable | Explains the dependency and disables the action; browsing/brief preparation can remain possible. |

Create one adapter boundary for live and fixture data. Inventory each action before wiring it. Do not scatter provider calls or brand-specific logic across view components.

## Corrections to the image mockups

The images establish visual direction; this behavioural specification takes precedence over incidental text or imagery in them.

- Projects stays active during project review/editing; Home does not become active in the editor.
- Use original approved logos and saved actual product thumbnails in the implementation, not AI-drawn mockup branding or substitute furniture.
- Reuse the same deliverable list, dimensions and creative revision across screens. A story with one image must not display unrelated carousel thumbnails.
- Remove duplicated editor formatting panels and an account/avatar control without a working purpose.
- Keep selection, human feedback and automated checks distinct. Do not assert all mockup artworks passed review.
- Replace the mockup's blanket approved-only download sentence with existing checked-pack/draft-export behaviour.
- Default creative preferences to brief-led choice; the festive example is sample content, not a global preset.
- No fixed completion percentage, price, product claim or “applied reference” badge without supporting data.

## Implementation sequence and rollback

1. **Freeze interaction contracts.** This blueprint, feature inventory and state checklist define every visible action, input, destination and recovery state. Record missing service contracts without changing generation logic.
2. **Build the shared visual foundation.** Tokens, header, brand switcher, campaign rows, status treatments, fields, menus, drawers, dialogs and responsive shell. Preserve original approved assets.
3. **Build a complete isolated front-end preview.** Connect Home → brief → workspace → review → editor → versions → download plus Projects and Library using deterministic fixtures. Include both brands and every failure fixture. Video/document views remain explicit prototypes where appropriate.
4. **Connect existing working capabilities.** Reuse editor, product/brand library, saved jobs/versions, feedback, exports and INR ledger through adapters. Existing deep links must continue to work. Keep unsupported actions out of live mode.
5. **Validate and offer the new UI.** Run the acceptance checklist, relevant offline tests and both-brand saved-run checks. Compare loaded/reopened/exported designs and exercise failed-network flows. No paid generation is needed for routine UI verification.
6. **Implement new feature logic separately.** Prioritise backend work after the interaction model works; contract-test each service before enabling it in the live UI.

Before UI code changes, create a scoped checkpoint of the files being changed and record the current uncommitted state. Use an isolated preview entry/feature switch until cutover; keep the existing interface accessible. Rolling back the interface must not delete or rewrite jobs, editable documents, assets, cost receipts or historical reviews. Do not reset the dirty repository.

## Acceptance before live cutover

- A marketer can create one item, build a campaign, resume a draft, edit, adapt and download without understanding engine terminology.
- Every visible action has a defined destination and response, including pending, disabled and failed states. Prototype functionality is clearly labelled.
- Multiple drafts coexist, brand switching is safe, Back/refresh/deep links restore the intended context, and failed saves are recoverable.
- Brand guidance and assets never cross workspaces; shared behaviour works for both brands.
- Original artwork and revisions remain intact; missing assets never silently disappear.
- Manual editing, navigation, feedback and ordinary exports trigger no paid model calls.
- Quality limitations remain accessible; selecting, saving and downloading do not promote an unverified output to publish-ready.
- Desktop, narrow layouts, keyboard navigation, zoom, Unicode, long labels and loading/error states are checked, not just the happy-path screenshots.

Use [the QA case inventory](studio-ux-qa-cases.csv) to record execution evidence during the build. Cases are currently planned, not executed.

## Feature coverage from the agreed scope

Source: [Creative AI Scope with Remarks](https://docs.google.com/spreadsheets/d/1jLkA_CIPf62gXiRfdyRi0fbzF0D94rPosU8yKgLD_Wk/edit). The numbered inventory below is a design coverage map, not an assertion that all modules are implemented.

| Scope item | Primary group | Shared surface and special inputs |
| --- | --- | --- |
| 1 Benefit-led static | Social | Brief/review/editor; benefit and evidence |
| 2 Technology static | Website | Supplied CGI and specification annotations |
| 3 Offer static | Social/Retail | Price, EMI, dates, terms, partner logos |
| 4 Proof and claim cards | Social | Claim source and qualification fields |
| 5 PDP product cards | Website | Ordered image set, naming and alt text |
| 6 Marketplace A+ | Website | Module slots, eligibility and comparison data |
| 7 Website banners | Website | Desktop/mobile dimensions and file limits |
| 8 Stories | Social | Safe areas, sequence and platform interaction notes |
| 9 Carousels | Social | Ordered narrative, per-slide copy and caption |
| 10 Store posts | Retail | Location fields, CTA and bulk selection |
| 11 In-store print | Retail | Vendor template, dimensions, bleed and proof requirements |
| 12 Partner creatives | Retail | Partner assets and recorded review requirements |
| 13 LinkedIn corporate static | Corporate | Occasion, facts, names and roles |
| 14 Messaging visuals | Customer messaging | Channel limits, dark-mode preview and personalisation |
| 15 Blog and OG graphics | Corporate | Article source, title and infographic facts |
| 16 Benefit RTB film | Social | Script/storyboard, duration, voice/music and captions |
| 17 Technology RTB film | Website | Exact supplied CGI and explanation |
| 18 Mini marketplace RTB | Website | Functional script and marketplace output constraints |
| 19 Claim video | Social | Sources and disclaimer timing |
| 20 WhatsApp cutdown | Customer messaging | Existing film, duration, compression and thumbnail |
| 21 Slideshow | Social | Existing statics, ordering, transitions and music |
| 22 Store offer video | Retail | Store/city/language, offer, QR and location |
| 23 Trend-led reel | Social | Selected trend reference and usable audio |
| 24 Product reel | Social | Product, hook and captions |
| 25 Avatar content | Training/Corporate | Presenter, voice, consent/approval context and disclosure |
| 26 Benefit reel | Social | Benefit, hook and captions |
| 27 Emotional short | Social | Story premise and cultural context |
| 28 Festive or lifestyle film | Social | Occasion, region and optional offer |
| 29 Training avatar | Training | Chapters, languages, quiz requirements; assessment logic unresolved |
| 30 LinkedIn video | Corporate | Milestone, culture, packaging or branding facts |
| 31 Product launch film | Social | Reveal/cutdown requirements; final production scope to confirm |
| 32 In-store TV loops | Retail | Silent playback, duration, location and offer schedule |
| 33 Influencer finishing | Social | Supplied footage, captions, colour and end slate; not talent production |
| 34 Email copy | Customer messaging | Subject, preheader, body, CTA, segments and placeholders |
| 35 Article | Corporate | Outline, facts, FAQs, links and SEO/AEO needs |
| 36 PR kit | Corporate | Fact sheet, quotes, media Q&A and source material |
| 37 Training and sales deck | Training | Chapters, objections, FAQs, language and quiz needs |
| 38 SKU catalogue | Training | Products, regions, prices, table import and output format |
| 39 Resize | All, via versions | Target placements, crop/reflow and naming |
| 40 Localisation | All, via versions | Languages, protected terms, regional phrasing and review |
| 41 Store and city versions | Retail, via versions | CSV mapping, data validation and QR fields |
| 42 Personalisation | Customer messaging, via versions | Template placeholders, fallbacks and sample validation |

Keep external sender/CRM/QR integrations, partner approval routing, customer-data handling, TV scheduling and training assessment delivery as explicit unresolved service decisions. The frontend must not promise them by placing a successful-looking button on a mockup.
