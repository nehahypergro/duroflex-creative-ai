# Essential feature checklist

The main brief details now show Features & reasons to believe outside Additional details. Product briefs need at least one selected saved feature or supplied RTB before confirmation. Brand-only briefs remain optional. Existing preview and legacy validation remain supported.

Saved website feature list items retain their wording and conditions. The catalog reads the exact archived HTML only when its hash matches the saved profile. This enriches the returned catalog without rewriting product snapshots, historical jobs, reviews or costs. Unstructured feature sections use conservative sentence/list boundaries. Older whole-section selections are retained and expanded to their original items where possible.

Supplied RTBs can be added and individually selected/deselected. Deselected entries remain available in the draft but are excluded from intakeContext; selected entries retain the existing rtbs text handoff. Saved library choices remain product-scoped. Manual supplied choices take priority over autofill. Confirmation becomes outdated after selection changes.

Verified: model validation/handoff/autofill; explicit list parsing; both saved brands; hash mismatch; profile immutability; select/deselect/add/Enter; save/reload; product switch; required confirmation; desktop/mobile overflow. Browser screenshots are in work/rtb-checklist-20261029. Tests use read-only fixtures and no paid calls.

Delivery: the read-only preview on port 1857 has been refreshed. Frontend files are served from disk. The already-running authenticated server on port 1842 has not been restarted; its new catalog feature-list enrichment becomes active on its next controlled restart. No generation workers or live jobs were changed.
