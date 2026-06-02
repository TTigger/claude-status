# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | Yes |

## Data Boundary

`@ttigger/claude-status` is a purely local tool. Its complete data boundary:

- **Reads and writes** `~/.claude/settings.json` (a `.bak` backup is created before any write).
- **Reads** `~/.claude/claude-status.config.json` (your config) and the `theme` field in `~/.claude/settings.json`.
- **Runs** `git rev-parse --abbrev-ref HEAD` (or equivalent) in the current working directory to read the branch name.
- **Spawns** the local `claude` process when you invoke the `cc` launcher.
- **Sends nothing over the network.** There are no analytics, telemetry, update checks, or external requests of any kind.
- Session and weekly usage data is delivered to the renderer via Claude Code's stdin hook mechanism and is only rendered to the terminal. It is never stored to disk or transmitted anywhere.

## Reporting a Vulnerability

If you discover a security vulnerability, please open a **private security advisory** on the GitHub repository (Security → Advisories → New draft security advisory) or, if private reporting is not available, open a GitHub issue marked `[SECURITY]` and avoid disclosing exploit details publicly until a fix is in place.

Please include a description of the issue, steps to reproduce, and any relevant environment details. You can expect an acknowledgement and an initial assessment within a reasonable window (typically a few business days).
