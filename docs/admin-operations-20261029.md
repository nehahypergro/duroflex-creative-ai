# Admin operations — 29 October 2026

Activated locally at `http://127.0.0.1:1842/admin` through the existing authenticated Studio supervisor. Atlas and public hosting remain deferred.

## Added

- Overview for requests without an update for 30 minutes, requests needing attention, unresolved client reports, and current-image decisions. Each links to the relevant request, Studio project or exact client report.
- Request journey with document upload/import, manual autofill overrides, submission, image creation, saved canvas edits, decisions, retry requests and download signals. Wall-clock timings include waiting and time away.
- Read-only health checks for the admin database, saved request storage, recorded creation activity, document import records, tracking writes and the saved cost snapshot. Provider availability and balances are explicitly not probed.
- Account-scoped saved dashboard views in MongoDB, including rolling date ranges and product/engineering presets. Administrators can save or remove their own views. Team members do not gain admin access.
- Shared light/purple design, compact controls, clear loading transitions and the Studio stages Draft, Creating, Ready and Needs attention. Automated review flags and human approvals remain separate.

## Evidence and limits

- The overview shows the first 20 records in each attention list and checks decisions on the 20 most recently updated requests with images. Total request/report counts and the review sample size are explicit. The review count is not a full-workspace approval backlog.
- Recorded progress age is a signal to inspect a request, not proof of a dead worker. Refreshing the dashboard never retries a job.
- New manual autofill overrides record field categories only, not brief values or keystrokes. Existing browser outbox and account isolation remain in use; tracking failure cannot block the brief.
- Historical steps are not reconstructed when their evidence is absent. Generated-image timestamps come from the verified activity journal; manual edit timestamps come from saved revision history. Bounded automatic layer correction is excluded from user edits.
- Download requested/prepared does not prove the browser saved the file or that the creative was published. All dashboard dates use India Standard Time.
- Saved views persist per administrator; they are not shared team dashboards. Existing analytics exports remain available.

## Validation

61 relevant checks passed across admin operations, the existing console, analytics, tracking, account protection and brief documents. Browser checks cover both brands and laptop/narrow widths; live verification covers the authenticated overview and a saved request journey. Test-only snapshots use temporary directories.

Activation was performed only after all saved requests were non-active. Hash verification confirmed 308 job files and the saved cost snapshot were unchanged. Automatic job resumption remains disabled; no artwork or paid provider calls were made.

Evidence: `work/admin-operations/`, `work/admin-operations-final.log`, `work/admin-operations-browser-final.log` and `work/admin-operations-regression.log`. The regression log retains an initial outdated-heading assertion; the updated console run passes.
