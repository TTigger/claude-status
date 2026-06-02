# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-02

### Added

- Statusline HUD with model, project, git branch, context bar, auto-compact estimate, Session (5 h) and Weekly (7 d) usage meters and reset countdowns.
- Seven visual styles: `claude`, `minimal`, `classic`, `tech`, `data`, `ascii`, `emoji`.
- Four layouts: `auto` (single-line adaptive), `oneline`, `two`, `three`.
- Theme-aware colour palette that mirrors Claude Code's light/dark/system theme.
- `cc` launcher bin — forwards all arguments to `claude`; warns on macOS/Linux about the `cc` C-compiler name collision; `--alias` flag for a custom name.
- Config CLI: `claude-status config set/get/list/reset` with dotted-key support for nested settings.
- Live preview command: `claude-status preview --style <s> --layout <l>`.
- `npx @ttigger/claude-status install` one-command installer; merges hook into `~/.claude/settings.json` with `.bak` backup.
- `claude-status uninstall` restores `~/.claude/settings.json` from backup.
- Zero runtime dependencies; pure Node ≥ 18 CommonJS; cross-platform (Windows, macOS, Linux).
