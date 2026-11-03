# Campaign PDF upload test - 29 October 2026

Sample: `output/pdf/Duroflex_Airboost_Sample_Campaign_Brief.pdf` (one text-based page, rendered and visually inspected).

Live test used Home > Create a campaign > Attach brief on port 1842, signed into the existing account. The PDF was uploaded through the UI and extracted by the existing account-scoped document service. Draft: `draft-0a40ff61-e3b8-470f-a188-72229d42e301`, Duroflex.

Verified from rendered form and review dialog:
- Airboost 6.8, SKU AIRBOOST68AIPRO720030000800BLUE; Single / 72 x 30 / 8 variant.
- Hindi; consideration / MOFU; audience; age 30–45; Mumbai, Pune, Bengaluru.
- Functional theme; Direct and Sincere tone; supplied RTB selected; required information and exclusions retained.
- Carousel: 6 cards at 1080 x 1350; Instagram story: 1080 x 1920; email hero: 1200 x 600.
- One complete set, 8 images; no QR/contact or promotional information requested.
- Review has no missing-field errors. Draft and attachment saved to the account; no confirmation or generation initiated.

Gaps corrected during testing:
- Campaign document import did not create asset outputs. Explicit supported asset mentions now create the associated existing recipes, with dimensions/card counts scoped to each asset sentence. No scene/headline planning is performed by intake.
- Explicit SKU/variant now selects only a matching saved variant in the current brand.
- Age labels normalize consistently instead of conflicting with the range detector.
- Exclusions mentioning QR/contact no longer turn those optional requirements on.
- The document file input is attached to the DOM while choosing a file; cancelled/selected inputs are removed.
- Imported asset dimensions/counts have document provenance. Manual asset selection remains protected from subsequent imports; undo remains available.

Validation: 21 focused model checks and 3 browser checks passed, covering both brands' shared intake behavior, manual overrides, undo, campaign entry, selection persistence and layout-independent output retention. The live PDF test covered Duroflex only. No arbitrary PDF layouts, scans, or every asset family are implied to have been verified. Complex/ambiguous documents still need review; existing text extraction does not infer facts from images.
