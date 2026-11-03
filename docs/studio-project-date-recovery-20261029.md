# Projects date recovery — 29 October 2026

## Failure and cause
Opening Projects on the live Duroflex Studio rendered the generic error page. Browser diagnostics reproduced `RangeError: Invalid time value` in `projectCard`. A title equal to the product name triggered an unguarded time formatter. Four saved local campaign briefs had no creation timestamp; `newDraft` recorded only `updatedAt`.

## Shared fix
- Use the existing guarded date formatter for project title dates and times, consistently in Asia/Kolkata.
- Missing/invalid dates display `Date unavailable`. Historical records are not rewritten or assigned invented timestamps.
- New drafts record a creation timestamp once; subsequent saves preserve it.
- Render exceptions are logged to the developer console while the normal UI retains its plain-language error.

## Evidence
- `studio-project-dates-browser.test.js` failed before the fix with zero visible cards instead of five; now passes for both saved-brand fixtures, missing/null/empty/malformed/valid dates and legacy local campaign drafts. It opens affected work and confirms viewing triggers no writes or generation.
- `studio-draft-created-at.test.js` failed before the fix; passes for creation, repeated saves and preserving legacy missing dates.
- 14 focused draft/intake/autofill checks and 4 date/preview browser checks pass. Final expanded legacy-draft browser check also passes.
- Saved handoff replay: both brands pass, zero failed stages; mocked provider only.
- Live browser: Duroflex 264 project cards, Sleepyhead 54 project cards, no generic error. The affected imported campaign opens with its saved 1-set / 8-items / Hindi brief.
- Screenshot: `work/demo-readiness-20261029/projects-date-fix.png`.
- Full offline suite was also started; its separate UI regressions are recorded in `/tmp/studio-project-dates-suite.log`. These must not be represented as a fully green suite.

No artwork generation, provider changes, server restart, history migration or cost changes were needed.
