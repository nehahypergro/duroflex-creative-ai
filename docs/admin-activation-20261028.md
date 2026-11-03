# Local Studio activation — 28 October 2026

The approved parallel pilot is merged into the main Studio and active at
http://127.0.0.1:1842/admin. The existing launchd supervisor now starts the
authenticated server. Automatic resumption of saved generation jobs is disabled.

## Available

- Individual login, password changes, account creation/reset/disable, and administrator/team-member role assignment.
- Requests, submitted briefs, progress, saved outputs, failure details, usage and unknown charges.
- Adoption, turnaround, failure and approval analytics with filters and report exports.
- Reported issues with project/image context and an administrator resolution history.
- Clearer waiting/recovery messages, visible brand and product context, protected drafts, and current ordered downloads.
- The newer main Studio editor controls, image navigation, before/after comparison, asset chooser and selected-image downloads remain present.

The first administrator must choose their own credentials using the private setup
screen opened in Codex. No placeholder account or shared password was created.
Existing server projects remain available to administrators as Legacy/system;
historical user ownership is not invented. Browser storage is account-scoped:
old anonymous device drafts remain in the original browser storage and are not
automatically assigned to a new account.

## Verification

- 82 account, admin, reporting, delivery and startup checks passed.
- The broad browser/editor pass ran 113 checks. Its six initial failures all passed targeted reruns: two needed matching preview/export browser engines, two used superseded selectors, and two exposed duplicate destination previews. The duplicate RCS/push previews were corrected and checked for both brands.
- 11 image validation, print template and proof-rebuild checks passed.
- Sharp was updated from 0.34.5 to 0.35.5. The dependency audit reports no known advisories.
- All 314 saved job records retain their original hashes. No image generation or paid provider request was dispatched by deployment or verification.

Evidence and the source rollback snapshot are in `work/deployment-20261028`.
`verification.json` retains the failed first pass and the successful reruns rather
than hiding failures. Both brands use shared implementation and isolated fixtures.

## Operations

`npm start` and direct `node server.js` now start authenticated Studio using
`scripts/admin/local-studio.js`. An unavailable database fails closed; there is
no anonymous fallback. The localhost MongoDB replica set persists in
`work/admin-private/database` on port 28571; its setup token and deployment
metadata are private. Shutdown retains the database. The old separate preview
on port 1857 is stopped; its original data and a second backup are preserved.

The installed `com.neha.creative-ai.server` supervisor restarts Studio if it
exits. Use that service when doing maintenance instead of launching competing
servers. Restarting this service does not automatically resume the old batch.

Atlas, HTTPS/public team hosting and shared production job storage are still
separate deployment tasks. This is a local activation, not a publicly accessible
client deployment. Scripts that call protected Studio HTTP routes must use an
authorized session; authentication is not bypassed for historical batch scripts.
The stopped batch and its provider-access failure were not retried or resolved
as part of this deployment.
