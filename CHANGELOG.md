# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2026-06-02

### Fixed

- Model name no longer shows a duplicate `·1M` when Claude Code's `display_name` already contains "1M" (e.g. `Opus 4.8 (1M context)`). The `·1M` tag is now only appended when the name doesn't already advertise it.

## [0.1.2] - 2026-06-02

### Fixed

- README demo now renders on npmjs.com: switched the embedded demo from SVG to a rasterized PNG (`media/demo.png`) referenced by an absolute `raw.githubusercontent.com` URL, since npm's README renderer blocks SVG images and rewrites relative paths to the repo.
- Squared the demo terminal card so the screenshot has clean edges (no white corners).

## [0.1.1] - 2026-06-02

### Added

- README hero: centered title, badge row (npm version, CI, node, license, install size), and a single-line SVG demo of the rendered HUD (`media/demo.svg`, regenerated via `scripts/gen-demo-svg.js`).

### Fixed

- Documentation accuracy: corrected `AGENTS.md`, `add-style`, and `add-hud-element` skills to match the real code — the installer merges a `statusLine` entry (not a pre-prompt hook), segment groups are `env`/`context`/`limits`, `buildParts` segments are `{ key, text, group }`, `CONFIG_SCHEMA` uses flat dotted keys with type `'bool'`, and `decimals` is a boolean.

## [0.1.0] - 2026-06-02

### Added

- Statusline HUD with model, project, git branch, context bar, auto-compact estimate, Session (5 h) and Weekly (7 d) usage meters and reset countdowns.
- Seven visual styles: `claude`, `minimal`, `classic`, `tech`, `data`, `ascii`, `emoji`.
- Four layouts: `auto` (single-line adaptive), `oneline`, `two`, `three`.
- Theme-aware colour palette that mirrors Claude Code's light/dark/system theme.
- `cc` launcher bin — forwards all arguments to `claude`; warns on macOS/Linux about the `cc` C-compiler name collision; `--alias` flag for a custom name.
- Config CLI: `claude-status config set/get/list/reset` with dotted-key support for nested settings.
- Live preview command: `claude-status preview --style <s> --layout <l>`.
- `npx @ttigger/claude-status install` one-command installer; merges a `statusLine` entry into `~/.claude/settings.json` with `.bak` backup.
- `claude-status uninstall` restores `~/.claude/settings.json` from backup.
- Zero runtime dependencies; pure Node ≥ 18 CommonJS; cross-platform (Windows, macOS, Linux).
