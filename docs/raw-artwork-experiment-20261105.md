# Original artwork experiment — 5 November 2026

An opt-in, administrator-only experiment at `/creative-ai/experiments/raw-artwork/index.html`.

The starting example is the saved Duroflex Octave website banner. It displays the original generated image, before editable conversion. **Generate another image** reuses that project's exact saved brief, copy, art direction, selected SKU references and composition guide, and makes one new scoped image call. It does not start a new strategy/concept planning cycle.

No OCR, editable reconstruction, background repair, reviewer model, corrective generation, resize or overlay runs after generation. New output bytes are saved unchanged and marked **unreviewed**, with `ready:false` and `qualityVerified:false`. The original project and its review remain unchanged. No campaign logo is automatically added; this example was planned for a branded website header.

Brand isolation, authentication, same-origin protection, source bindings, prompt/request validity, provider capacity, billing receipts, request identity and the existing INR testing allowance remain enforced. New experiment jobs have their own budgets and receipts, with zero reasoning calls allowed and one image call allowed. The standard runtime rejects experiment jobs, including after restart. Interrupted/failed jobs require reconciliation; the UI does not automatically start another paid attempt.

Implementation: `lib/creative-ai/experiments/raw-artwork.js`, isolated page and authenticated `/creative-ai/api/experiments/raw-artwork` endpoint. No reviewer or main-generation defaults changed. Removing the page/API registration and experiment module disables this experiment; saved files and cost records should be retained.

This is a saved-plan experiment, not an alternative full brief builder. Existing originals can be viewed without paid generation. Reloading an active experiment resumes polling rather than submitting another request.

Validation: six focused tests cover both brand scopes, unchanged image bytes, no reviewer/reconstruction calls, repeated runner invocation, failure preservation, unsafe unit identifiers and rejection by the standard engine. The companion legacy text-layer suite passed 21 tests but one browser-rendering case could not launch Chrome under the sandbox. Live UI verification uses the Codex in-app browser.

Final browser verification caught the standard file route blocking experiment images. Added an admin-only experiment image endpoint, retaining scoped job access and restricting generated file names. The actual image now renders in the Codex browser. Seven focused tests pass. No additional paid generation was needed. Screenshot: `work/raw-artwork-experiment-20261105/browser-proof.jpg`.
