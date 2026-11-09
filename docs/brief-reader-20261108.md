# Home-page brief box and brief appreciation (8 November 2026)

## What the user asked for
- The home page has one text box where the marketer writes the brief. It replaces the old choice between the two buttons ("Create design" and "Create a campaign").
- An AI call reads the brief. It decides whether the job is a single design or a campaign, and suggests the asset set when the brief names none.
- The result opens a **brief appreciation** page, which shows how the brief was understood. The marketer must confirm every detail there before anything is generated.
- The asset picker and the SKU (product) picker remain available on that page in case the AI gets something wrong.

## Server: `lib/creative-ai/runtime/brief-reader.js`
- **Route:** `POST /creative-ai/api/brands/:brandId/brief-read`
  - Request body: `{brandName, brief, requestKey, briefDocuments?, draftId?}`.
  - `brandName` must match the brand. Brief documents are validated through the existing account document check.
- **Model call:** one reasoning call, `contextKind: 'brief-reading'`.
  - Model: `CREATIVE_AI_BRIEF_READ_MODEL` (default: the normal reasoning model). Effort: `CREATIVE_AI_BRIEF_READ_EFFORT` (default `low`).
  - Limits: at most 3 reasoning calls (including the schema repair), a 4-minute time window, and US$3 reserved.
- **Storage and cost:** each read is a JobStore record under `output/creative-ai/brief-reads`.
  - That folder is now scanned by `lib/cost-tracker.js` and recognised by `reference-storage.namespace`. The cost therefore appears in the normal ledger and the INR cost page as "Generating".
- **Same request twice:** a repeated `requestKey` returns the saved result and makes no new paid call. Reusing a key for a different brief is refused.
- **What the model sees:** only the brief and its documents, this brand's product list (`id`, `name`, `sku`, `category`, `variants`), the ready asset cards from `studio-model.assetCatalogue`, the message types, the languages and the objectives.
- **Checks made in code, after the model answers:**
  - Product, variant and asset IDs must come from the lists sent to the model.
  - Exact wording (offer, price, dates, terms, taglines) must already appear in the brief word for word. Only case, quotes and spacing may differ.
  - An unclear product or variant always becomes a question.
  - On an offer brief, missing offer wording or a missing end date always becomes a question.
  - The model cannot remove these questions.
  - The design-or-campaign decision is fixed in code: one card makes a design, several cards make a campaign.
- **If the read fails:** it is saved as failed with "Nothing else was started", and it is not retried automatically.

## Tests
`tests/creative-ai/brief-reader.test.js` checks:
- the decision, the ID and wording checks and the forced questions;
- that a repeated request key makes no second call;
- that wrong-brand and empty briefs are refused before any paid call;
- the failure path;
- that the cost ledger counts the read;
- one run through the real provider request path (low effort, JSON schema).

## Limits
- The reader suggests; it does not decide. Every value stays editable on the appreciation page, and generation still goes through the existing estimate, confirmation and preflight.
- Brief reading does not use brand research or the verbal style guide. Those still apply at planning time.

## Browser flow (`public/creative-ai/studio.js`, `studio-model.js`, `studio-brief-reader.css`)
- **Home page:** the hero area has one brief box, "What do you want to make?", plus a "Choose formats yourself" link to the asset picker.
  - Pressing **Create** (labelled "Read my brief" until 8 Nov 2026), or Cmd/Ctrl+Enter, calls `D.readBrief`; nothing is generated until the appreciation page is confirmed.
  - Typed text is kept on the device while you write.
- **`M.draftFromReading`** turns the reading into an ordinary draft:
  - It uses `startAssetDraft`: one card makes a quick design, several make a campaign.
  - It sets the product and variant only when they are unambiguous and belong to this brand. Matched brief features become selected product features. If the product has no saved feature list, the brief's own features are used instead.
  - It sets the language, objective, audience and occasion.
  - For an offer it sets the message type and the offer fields: wording, terms, end date, and a start date that defaults to today and is shown as an assumption.
  - Contact details are off unless the brief asked for them. Other exact wording goes to Mandatory information.
  - Local pattern autofill is turned off for these drafts.
  - Coming-soon cards are dropped. The brief is never confirmed automatically.
- **Appreciation page, `#understood/<draftId>`**, shows:
  - the brief in the marketer's own words and "the ask, in one line";
  - cards for product (product picker with best matches, plus a variant picker), formats (suggested ones shown dashed with the reason; **Edit formats** opens the asset picker for this draft), audience, message type and features, exact wording (offer wording, start and end dates, terms, other exact wording), and tone and language;
  - "We assumed these" (objective picker plus the defaults chosen);
  - "Needs you" (validation gaps in plain words, AI questions, another brand mentioned).
  - Coloured dots mark each value: from your brief, we suggested, or needs you. Edits are recorded as "Your choice".
- **Confirm:** once nothing is missing, the page runs the existing preflight on a confirmed copy and shows the real estimate.
  - **Looks right, create N designs** saves the confirmation and calls the existing `submitGeneration`, the same path as the old Review brief dialog.
  - **Edit full brief** opens the full form.

## Live check (8 Nov 2026, both brands)
- **Duroflex:** "Airboost 6.8 Arctic Ice Pro … Instagram story and WhatsApp status … Flat 20% off till 30 Nov, on Queen and King sizes only."
  - Read result: correct product; Instagram Story plus WhatsApp Status; offer wording "Flat 20% off"; end date 2026-11-30; terms copied word for word.
  - The variant was left for the marketer, because the brief named two sizes.
  - This product has no saved feature list, so the features box appeared.
  - The estimate was about ₹114–116 for 2 jobs. Pressing create queued 2 asset jobs.
- **Sleepyhead:** "Sofa Bubbles for first-time renters in Bangalore … compact and colourful."
  - Both Sofa Bubbles products were offered as best matches. The read suggested an Instagram Portrait Post and an Instagram Story with reasons, and chose Benefit and Awareness.
  - After the 3-seater was picked, the 4 official features were selected and the estimate was shown. Nothing was created.
- **Cost:** each read was one gpt-6-luna call at low effort, about 12 s, 14–22k input and about 520 output tokens. That is an estimated US$0.002–0.003, about ₹0.19–0.30 at ₹96.61/USD (RBI, 9 Oct 2026).
- **Generation outcome of the Duroflex test:** both jobs failed in planning. gpt-6.1-sol was intermittently very slow: the cancelled responses produced 350–1,060 output tokens in about 8.5 minutes, against 5,128 tokens in 87 s for a normal call in the same window. That exposed the resume bug recorded in `docs/engine-fixes-20261108.md`, which is now fixed.
  - On the resumed run, the fresh plan used "Airboost 6.8 Arctic Ice Pro", taken from the test brief. The official name has no "Pro", so the citation check correctly rejected it.
  - The repair call then hit the slowdown again and was cancelled. No images were made.
  - Cost: about ₹5.48 estimated, plus 5 cancelled calls recorded as unknown charge. From OpenAI's reported usage, each is about ₹1–3.

## Official product name check (8 Nov 2026)
- The reader now returns `product.briefName`: the product name exactly as the brief wrote it, checked word for word.
- The appreciation page shows "Name on the artwork: <official name before the first |>".
- When the brief's wording adds words that are not in the official name, variants, SKU or brand name, an amber note explains this, for example "“Pro” isn’t in the official name". **Use the official name in my brief** swaps the wording in the brief text with one click.
- This catches the problem from the live test before any paid planning call. The planning citation check still enforces it.
- Older readings fall back to a quoted part of the evidence note, and only when the brief contains it.
- Helpers: `M.productNameCheck` and `M.readingBriefName`. Tests are in `brief-reading-draft.test.js` and `brief-reader.test.js`.

## Later changes (8 Nov 2026)
- **Mattress size:** mattresses default to Queen 72 x 60 through `M.defaultVariant` (a user decision). The page lists it under "We assumed", and the reader no longer asks for the size.
- **Missing answers:** a field that still needs an answer gets a red outline, and the Product card shows a red dot. Each item in "Needs you" jumps to its field. On phones the Create bar stays at the bottom of the screen.
- **Slow reads:** after 20 s the status explains the AI service is slower than usual. A failed read says "We couldn’t read your brief just now… Nothing was started and your text is still here" instead of the generation error. On 8 Nov at about 12:14 UTC, a gpt-6-luna read ran out its 4-minute window while OpenAI was slow.

## Home page and sidebar follow-up (8 Nov 2026)
- **Home:** the hero has one heading, "What do you want to make?", which also labels the text box. The repeated title, subtitle, field label and helper paragraph were removed. A single row holds "Choose formats yourself" and "Read my brief". The status line takes no space while empty. Long placeholder text wraps inside the box.
- **Sidebar:** "+ New" first, then Home, Projects, Favourites and Brand Library, then a FORMATS section with the 9 format groups. Each group opens the asset picker on its tab (a user request; it replaces the "+ New only" version). The navigation test now expects 9 group links.
- **Theme sync safety:** `scripts/sync-visual-theme.js` used to rewrite everything after its BEGIN marker, which would have deleted about 25 KB of later Studio styles. It now replaces only the block between BEGIN and the new END marker (`tests/creative-ai/visual-theme-sync.test.js`).
- **Home, round 2 (user request, 8 Nov 2026):** the decorative pictures beside the heading were removed. "Continue working" (`M.activeWork`) now lists every project, both drafts with a product and in-progress, ready and needing-attention work, newest first like the Projects page. Before, it hid finished projects whose designs were ready. Tests: `studio-home-state.test.js` and `studio-preview-recovery-browser.test.js`.
- **Home, round 3 (8 Nov 2026):** a compact, centred hero. The heading sits above one white composer box, with "Choose formats yourself" and **Create** inside its bottom edge. Below it are "Try" chips that fill a sample brief using this brand's own saved product names (no offers invented). The 180 px heading block left over from the decorative pictures is gone. Card Download buttons are icon-only.
- **Attach a brief on Home (8 Nov 2026):** "Attach brief" (PDF or Word) uploads through the existing account document store under a reserved draft id. Files show as removable chips, and **Create** works with text, a document or both.
  - The reader receives the documents (validated server-side against that draft id). `M.draftFromReading` keeps the reserved id and the documents, so preflight verifies the same files. Test: `brief-reading-draft.test.js`.
  - **Live check:** a one-page PDF with no typed text produced the right product (Sofa Kiki, Sapling Green), format (Instagram Story), audience and tone.
  - The language came back as "Hindi (suggested)" because the test PDF's single long line ran off the page, so "Language: Hinglish" was not extracted. This was a test-file artefact.
- **Design page (8 Nov 2026):** the job view carries `briefSummary` (brief text, product, audience, goal, language, message type, offer). A "Brief" card under the image shows the input next to the output. Like/Dislike are centred under the image. "+ New" opens the home brief box.
