# Project recovery, search and vocabulary — 30 October 2026

The project screen distinguishes a known Trash entry, an accessible project in another brand, a listed project whose detail failed to load, and a link absent from the accessible index. An absent record cannot prove deletion versus deliberate hiding or account restrictions; the screen says so and directs the user to their administrator. No private unlisted job is fetched to discover ownership. Delayed lookup results cannot replace a newer route.

Failed/partial requests expose recovery on the project screen. Restart still uses the existing read-only preview, INR estimate, explicit paid confirmation, immutable original and deduplication checks. A saved source draft is linked when available; otherwise the user can start a new brief. Empty terminal projects explain that no images were saved, without useless download controls or a misleading change-filter instruction. Active generation is not restarted by viewing these screens.

Terminology: project = work container; design = image; page = ordered image in a sequence; alternative set = another complete treatment. Stored identifiers, route keys and historical artifacts are unchanged. New downloads use the alternative-set display label.

Workspace and project searches explain matching fields. Tab titles use the current project, screen and brand and reset when leaving the project. No internal IDs appear in titles.

## Verification

- 23 focused checks: shared naming/navigation/progress, restart paid-consent/deduplication, client wording, field-based match reasons and both-brand browser scenarios.
- Browser checks cover failed and empty requests, the cost preview (no paid confirmation), missing projects, Trash, cross-brand destination links, search reasons, titles and stale asynchronous lookup protection. No creation POST was sent.
- JavaScript syntax checks passed for all four changed application files.
- Evidence: `work/ux-project-clarity/verified.tap`, screenshots in that directory. Frozen QA execution evidence under `qa/runs/20261030-rigorous-uat` is unchanged.
- Live Studio requires sign-in: the browser returned the admin login page. Visual verification used the isolated current-source fixture; authenticated live verification remains pending. No server or batch worker was restarted.
