# Keeping Creative AI available on this Mac

Configured 20 October 2026, Asia/Kolkata.

## What is installed

Two user login services in `/Users/neha/Library/LaunchAgents`:

- `com.neha.creative-ai.keepawake`: runs `/usr/bin/caffeinate -s`. Prevents system sleep while on AC power; the display can still sleep. Launchd restarts the process if it exits and starts it at the next graphical login.
- `com.neha.creative-ai.server`: runs `scripts/ops/studio-supervisor.cjs`. Preserves an existing listener on localhost port 1842, checks every 10 seconds, and launches `server.js` when that port is free. Once it owns the server, a child exit ends the supervisor so launchd restarts it with a 10-second throttle.

Neither service creates AI jobs, makes paid API calls, exposes a public port, changes authentication, or retries interrupted generation. Existing server PID 88183 was retained during setup.

## Current verification

- AC power confirmed, battery charged.
- Keep-awake loaded and `PreventSystemSleep = 1` verified.
- `/health` responded with `status: ok` and both brands.
- Isolated supervisor test passed: no interruption of existing listener, takeover when released, child failure propagated for launchd recovery.
- **Documents access confirmed on 21 October 2026 at 12:46 IST after the user clicked Allow.** Project files and the cost-sync script are readable again. No system privacy settings were changed automatically.
- `com.neha.creative-ai.server` is running (PID 1176), and its log confirms the existing listener is retained and checked every 10 seconds. `/health` returned `status: ok` for both brands. The server error log is empty. Real production takeover has not been forced; the previously passed isolated recovery test remains the recovery evidence.
- The keep-awake process remains running (PID 1174); AC power is reported. At this check the aggregate `PreventSystemSleep` flag was 0 despite the process assertion being listed, so an effective system-wide sleep block was not reconfirmed.

Logs: `work/studio-availability-20261020/logs/`. Configuration copies and isolated test results are alongside them.

## Verify after allowing the prompt

```sh
launchctl print gui/$(id -u)/com.neha.creative-ai.server
cat work/studio-availability-20261020/logs/server.log
curl --fail --max-time 5 http://127.0.0.1:1842/health
pmset -g assertions
```

The server log should say `Existing studio listener retained; checking every 10 seconds.` while the original server is still running. Do not kill a production process simply to demonstrate recovery while jobs may be active.

## Limits

Leave the lid open, AC power attached, network connected and the remote-access application running. This is a login agent: after a reboot it starts after login, not before FileVault unlock. No independent remote tunnel was identified or configured. The studio remains localhost-only and uses the existing remote access arrangement.

The fallback detects a process exit / port becoming available, not an unresponsive process still holding the port. It does not promise uninterrupted access through network loss, shutdown, logout or hardware failure. A health check must not blindly kill active creative jobs. No hourly AI automation is required or installed.

## Undo

Unload only these services:

```sh
launchctl bootout gui/$(id -u)/com.neha.creative-ai.server
launchctl bootout gui/$(id -u)/com.neha.creative-ai.keepawake
```

To disable future login startup too, move these exact two plist files out of `~/Library/LaunchAgents`. Keep a copy in the setup checkpoint. If the supervisor owns a server when unloaded, it will stop its own child; it never stops the pre-existing terminal-owned server. Removing keep-awake restores normal macOS sleep behaviour without changing the system power settings.
