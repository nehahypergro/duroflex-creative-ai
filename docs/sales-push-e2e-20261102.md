# Sales one-pager and push image end-to-end tests — 2 November 2026

Both Duroflex assets completed generation, final review, saved-canvas reopening and PNG export. Neither is ready: the remaining failures concern generated product identity. Final exports reopened byte-identically. No content was sent or published.

## Runs and findings

- Sales first attempt: `creative-b7155965-61c9-4763-9b03-30835b1281ea`, Spine Contour Pillow. Blocked during layout planning; zero image calls. The document policy incorrectly converted its 320-pixel phone stress preview into an 81-pixel preferred body-size floor. A second bug skipped copy recovery because the blocked explanation said "no feasible layout" instead of repeating one of the error detector's failure keywords.
- Sales fresh attempt: `creative-dc355e80-9f41-42f0-a7da-6f09f6769578`. Same brief and SKU, new document policy. Layout passed. Reconstruction first stopped because the dimensions line's unconstrained font calibration jumped 6.67%, exceeding the approved 5%. Continued from the same saved source after fixing the bounded calibration search; original failure snapshot and limits retained. Seven independent editable lines, exact saved wording, two image calls total (source and masked removal). Readability, logo and subject occlusion passed. SKU fidelity 58/100 failed: the image joins the reference's separate contoured pillows into a continuous twin-lobed shape. Brief direction also failed at 62, citing that same shape; this overlaps with SKU fidelity rather than establishing a separate copy/layout failure. Historical verdict remains unchanged.
- Push: `creative-d7faa0de-e951-4912-b5e1-51945d2e7147`, Quboid Arctic Ice, Android 1024×512. New push strategy produced one recognisable exterior, no technical diagram or added campaign copy/logo. Readability, logo, occlusion and brief direction passed (direction 90/100). SKU fidelity 68/100 failed: the generated grey side/orange stripe and "Arctic Ice" label differ from the selected red-striped reference with "ENERGISE QUBOID" markings. One image call. No further replacement generated.

## Shared fixes made during testing

1. `copy-fit-recovery` uses structured blocked status plus copy/layout topic to trigger its existing one-revision path; explanatory prose need not repeat "cannot"/"blocked". Missing factual evidence still does not trigger copy rewriting.
2. Readability policy `2026-11-02.1` removes the assumed phone-width floor for close-read document assets. Explicit display widths still apply; final visual readability remains checked. Old policy versions and saved pins remain valid and unchanged.
3. Editable line calibration searches inside the existing ±5% approved range before testing glyph bounds. A one-pixel rounding difference can be satisfied at the cap instead of making an excessive jump and then rejecting it. Impossible geometry still fails; no wider font tolerance or glyph distortion is introduced. On the actual dimensions line, the result is 30 px from an initial 28.5714 px estimate: exactly +5%.

The saved planning-canvas replay test was corrected to load its archived placement catalogue rather than regenerate today's catalogue for an old pin.

## Evidence and limits

All evidence is in `work/sales-push-e2e-20261102/`. `results.json` records review checks, exact wording, export hashes and byte-identical reopening. `delivery/index.html` shows final composed outputs only. `font-diagnostic-before.json`, `font-diagnostic.json`, `calibration-before.log` and `calibration-after.log` retain the calibration evidence. `fit-before.log`, `document-before.log` and `policy-comparison.json` retain the planning failures.

Focused checks: 50 pass; additional planning/calibration checks: 10 pass; edit/save/reopen browser checks: 3 pass; both-brand saved handoffs: zero failed stages. Full offline run: 1,895 pass, 16 fail, 2 cancelled out of 1,913. One failed archived-catalogue test was subsequently corrected and passed. Other gallery/editor/browser failures remain unresolved; this is not a full-suite pass.

Recorded incremental estimate, including the failed planning attempt: ₹45.02, with no unpriced receipts or unresolved requests in these three jobs. Inherited research receipts excluded and provider IDs deduplicated. Dated FX: ₹96.6149/USD, 9 October 2026, source retained in `costs.json`. Actual billing remains unverified. The estimate is separate from the ₹10,000 per-job admission allowances and historical unknown-charge reserve.

Remaining work is product-fidelity improvement, with source-specific treatment of multiple products in a reference and preservation of actual markings. Do not promote either failed output or silently change the reviews.
