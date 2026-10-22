#!/usr/bin/env python3
"""Restore only canvas-feature source changes, with hash guards and a safety archive."""
import argparse, hashlib, json, pathlib, tarfile, datetime, io
root = pathlib.Path(__file__).resolve().parents[2]
snapshot = root.parent / 'rollback-snapshots/duroflex-before-editable-2026-10-15'
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--apply', action='store_true', help='Apply a verified rollback; otherwise inspect only')
a = p.parse_args()
manifest = json.loads((snapshot / 'editable-feature-files.json').read_text())
changes = manifest['files']
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None
conflicts = [name for name, spec in changes.items() if digest(root/name) not in (spec['after'], spec['before'])]
if conflicts:
    raise SystemExit('Stopped: later changes must be preserved first:\n' + '\n'.join(conflicts))
print(f'{len(changes)} feature files checked. Generated work, .env, brand assets and costs are not changed.')
if not a.apply:
    print('Dry run only. Add --apply to restore the source snapshot. Stop the local server first.')
    raise SystemExit(0)
stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
backup = snapshot / ('before-rollback-' + stamp + '.tar.gz')
with tarfile.open(backup, 'w:gz') as arc:
    for name in changes:
        if (root/name).exists(): arc.add(root/name, arcname=name)
with tarfile.open(snapshot/'source.tar.gz', 'r:gz') as arc:
    members = {m.name.removeprefix('./'):m for m in arc.getmembers()}
    for name, spec in changes.items():
        target = root/name
        if spec['before'] is None:
            if target.exists(): target.unlink()
        else:
            data = arc.extractfile(members[name]).read()
            if hashlib.sha256(data).hexdigest() != spec['before']: raise SystemExit('Snapshot checksum mismatch: '+name)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
print('Source restored. Restart the server. Safety archive: '+str(backup))
