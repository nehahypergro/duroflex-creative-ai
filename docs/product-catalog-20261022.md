# Product library usability and readiness — 22 October 2026

Shared by Duroflex and Sleepyhead. Website imports use the existing brand-scoped collector. No paid generation, live product import, refresh, historical profile mutation or cost change was performed during this implementation.

## User journey

Brand Library → Products → expandable variants → choose exact variant → Use selected variant → saved brief with the visible variant and SKU. Multiple variants have no default selection. Standard single configurations remain explicit. Existing brief validation and generation checks still apply.

The list separates the official product ID from the product name. Variant rows show their exact saved names, SKUs and labelled attributes. Missing identifiers are labelled as missing, not replaced by names or internal storage IDs. Search includes product identifiers, variant SKUs, variant IDs, names, attributes, categories and tags.

Add product URL is inline: official-domain validation, busy state, persistent inline failure and Retry, then a saved-product preview. Duplicate submissions are guarded. Existing URLs reuse their saved snapshot without website requests. Refresh from website is explicit and preserves prior snapshots. Import results are scoped to the initiating brand even after navigation. There is no redirect to the older interface. This pass implements URL import, not a separate manually authored product record.

Product sources have a direct official-page link and full saved date. Old product identifiers and variant attributes are read from their existing snapshot product JSON; originals are not rewritten.

## Readiness definition

Ready to use means a named product has exact variant IDs/names, a description or saved product content, and at least one readable saved product photograph. Image checks verify the existing hash when present, dimensions and decoding. Missing/corrupt photographs result in Images missing. Missing information results in Details needed. All applicable issues remain visible; missing identifiers alone do not invalidate otherwise usable products. Readiness is source availability, not artwork approval or a guarantee that every variant has a matched photograph. Brief creation remains available while generation retains its own requirements.

## Regression evidence

- Added failing-before tests for official identifiers/variant attributes and nonexistent local-file readiness checking; fixed in the shared parser/catalog presentation.
- Source-link browser test reproduced missing official links before the fix: the image asset URL filter rejected ordinary product URLs. Product links now use HTTP(S) URL validation separately.
- Existing direct-detail reopening test caught a synthetic action lacking a DOM closest method. Optional DOM lookup restores persistent product-detail routes.
- Existing table test updated to count product rows separately from expandable detail rows.
- Final focused run: 43 tests passed, plus four relevant existing browser journey tests passed. The broader initial 88-test pass found the two table/detail issues above; both were subsequently rechecked successfully.
- Saved provider replays: Duroflex and Sleepyhead, zero failed stages and zero paid calls. Historical evidence untouched.
- Live read-only verification: 15 Duroflex products and 13 Sleepyhead products; all 28 have official IDs recovered from saved sources and pass current source-availability checks. No page errors or desktop horizontal overflow.

Evidence and screenshots: `work/product-catalog-20261022/`.
