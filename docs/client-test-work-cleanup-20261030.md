# Client visibility and admin wording — 30 October 2026

Confirmed internal work is excluded from the Studio job listing for both brands. Non-admin direct job and image requests for internal work are denied. Administrators retain access through Operations → Requests → Activity source → Internal test work. Costs, job records, saved images, revisions and verdicts remain unchanged.

## Existing work

The sidecar register `output/creative-ai/internal-work.json` identifies 259 confirmed internal jobs out of 310: 224 Duroflex and 35 Sleepyhead. The remaining 51 jobs have no matching confirmed internal marker (32 Duroflex, 19 Sleepyhead). This is not a visual approval or full OCR audit of those remaining images. Drafts are not reclassified by this job cleanup.

Evidence includes explicit test briefs, known batch request keys and recorded workflow experiments. The saved editor revision containing “UX audit tab A” belongs to a registered internal project. Generic words such as “test” or “testimonial” alone do not hide work. Original artwork was not rewritten.

For future internal jobs, set `clientVisibility: "internal"` on the job or intake. Existing known test request prefixes are also recognized automatically. The classifier script can rebuild/add confirmed entries; it never deletes job history. To restore a misclassified item, review its sidecar entry and source classification together; removing a register entry alone does not override a recognized test marker.

## Interface

Admin display labels now show readable asset names, Option 1/Option 2, metric names and milestones. Filter values and internal identifiers are unchanged. Technical evidence remains available in expanded details. Unassigned historical requests display “Unassigned / system”. Channel names retain their normal spelling.

Old Studio browser snapshots are invalidated so pre-cleanup galleries do not repaint internal jobs after reload.

## Verification

- 10 Studio access tests passed, including both brands, direct internal-image denial for members, admin retention and unchanged budget records.
- 24 admin console/operations tests passed, including browser filters, review actions, reports, saved views and responsive layouts.
- 11 visibility/label/cache tests passed, including old snapshot rejection and legitimate non-test briefs.
- Live authenticated Studio reloaded successfully for both brands; live admin internal-work filter returned 259 requests.
- Live service restarted only after confirming no active image jobs. Automatic job resumption remains disabled. No paid image generation was performed.

Screenshots are saved in `work/client-visibility-20261030/`.
