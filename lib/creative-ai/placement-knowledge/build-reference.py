"""Rebuild human-readable coverage/source indexes from the validated catalog."""
import json
from pathlib import Path
root=Path(__file__).parent; r=root/'knowledge'
c=json.loads((r/'catalog.json').read_text()); cov=json.loads((r/'coverage.json').read_text())
lines=['# Placement coverage matrix','',f"Version {c['version']} — snapshot reviewed {c['verifiedAt']}.",'','Included means actionable **partial** verified requirements; conditional means required job inputs/evidence; unavailable means official access blocked. Every row has design heuristics. Refer to catalog rules for hard limits and official recommendations. Status does not certify upload acceptance.','','| Profile ID | Platform / publisher | Placement / asset | Status | Unresolved requirements |','| --- | --- | --- | --- | --- |']
for p in c['profiles']:lines.append(f"| `{p['id']}` | {p['platform']} / {p['publisher']} | {p['placement']} / {p['assetType']} | {p['coverageStatus']} | {'; '.join(p['unknowns']) or 'See scoped rules and required job inputs'} |")
lines+=['','## Explicit future / excluded inventory','','| Item | Status | Reason |','| --- | --- | --- |']
for x in cov['future']:lines.append(f"| {x['id']} | {x['status']} | {x['reason']} |")
lines+=['','The catalog is extensible; niche regional networks, local printers, placements and new platform formats remain open inventory. Searchable dropdowns should use profile IDs and status badges, never ratio alone.']
(r/'coverage-matrix.md').write_text('\n'.join(lines)+'\n')
lines=['# Primary source inventory','',f"Version {c['version']} — all access checks attempted {c['verifiedAt']}.",'','Short paraphrases and structured facts, not copied articles. No source scrape or recurring refresh job is saved. Content dates are null for unavailable material; search excerpts are explicitly limited.','','| ID / source | Authority / access | Content verification | Scope / limitations |','| --- | --- | --- | --- |']
for s in c['sources']:
 link=f"[{s['title']}]({s['url']})" if s['url'].startswith('https:') else s['title']
 lines.append(f"| `{s['id']}` — {link} | {s['authority']} / {s['accessStatus']} | {s['verifiedAt'] or 'Unverified full content'} | {s['summary']} {s['limitations']} |")
lines+=['','## Source conflicts','','| Conflict | Sources | Handling |','| --- | --- | --- |']
for x in c['sourceConflicts']:lines.append(f"| {x['id']} | {', '.join(x['sourceIds'])} | {x['resolution']} |")
(r/'source-inventory.md').write_text('\n'.join(lines)+'\n')
print('Coverage and source references rebuilt')
