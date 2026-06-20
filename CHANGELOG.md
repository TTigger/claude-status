# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-06-20

### Changed

- Progress bars are now high-resolution: the 8-cell Context/Session/Weekly gauges use Unicode eighth-block fills (`█` plus `▏▎▍▌▋▊▉` for the boundary cell), giving 64 levels instead of 8 — `47%`, `50%`, and `52%` now render as visibly different bars instead of the identical `▰▰▰▰▱▱▱▱`. The empty portion is a solid dark track (darkened tier hue for `claude`, darkened segment/pill background for `neon`/`mist`), so the bar reads as a continuous gauge at a glance. `ascii` is unchanged; terminals without colour fall back to a `░` empty track.

## [0.6.1] - 2026-06-16

### Fixed

- `neon` no longer needs a Nerd Font to look right: its powerline segment caps now fall back to standard Unicode half-circles `◖`/`◗` (and only to flat coloured blocks when the terminal has no Unicode at all). The README demo and gallery now show this default look instead of Nerd-Font-only glyphs.
- `ping` on Windows now uses a native WinRT toast (`Windows.UI.Notifications`) as its no-BurntToast fallback — a real, reliable desktop notification with zero install — before degrading to the old tray balloon and terminal bell. It uses the always-registered PowerShell AppUserModelID so the toast shows on every machine.
- Notification text keeps apostrophes (they were being stripped), and `neon` falls back to the default `|` separator on a no-colour terminal (segments were running together with no gap).

## [0.6.0] - 2026-06-16

### Changed

- Consolidated the 7 styles into 4 curated themes — `claude` (refined "Clay" design), `mist` (soft pastel pills), `neon` (powerline segments), `ascii` (compatibility, unchanged). The removed names (`minimal`, `classic`, `tech`, `data`, `emoji`) now alias to the nearest new theme via `STYLE_ALIASES`, so existing configs keep working without changes.

### Added

- Truecolor (24-bit) foreground + background rendering with automatic truecolor→256→8-color degradation (`src/palette.js` `resolveStylePalette`). Per-theme background decoration: rounded pill backgrounds (`mist`) and powerline segments (`neon`), with a no-Nerd-Font rounded-block fallback for `neon`.

## [0.5.1] - 2026-06-04

### Changed

- README: surface `ping` in the headline — added a "Why" bullet and a mention in the tagline (and the package description) so the desktop-notification feature is visible on the GitHub and npm landing pages, not only in its own section.

## [0.5.0] - 2026-06-04

### Added

- **`ping` — session completion notifications.** A zero-dependency, Claude Code hook-driven desktop notifier: it fires when a turn finishes (only for turns ≥ `ping.minSeconds`, default 30s) or when a session is blocked waiting for input, and names the project so you know which session to return to. macOS `osascript`, Linux `notify-send`, Windows tiered toast (BurntToast if present → tray balloon → bell). On by default but quiet; disable with `cs config set ping.enabled false` or install with `--no-ping`. New keys: `ping.enabled`, `ping.minSeconds`, `ping.onWaiting`, `ping.waitingCooldownSec`, `ping.sound`. Nothing is sent over the network.

### Internal

- Added `.gitattributes` enforcing LF line endings (`* text=auto eol=lf`, `*.png binary`) so a checkout on Windows (`core.autocrlf=true`) no longer rewrites files to CRLF and breaks the byte-exact README mockup guard.

## [0.4.2] - 2026-06-03

### Added

- **Mockup-drift guard**: `test/readme-mockups.test.js` asserts the README "The HUD" line and all 7 Styles gallery blocks byte-match the actual `renderHud` output, so docs can't silently drift from code (CI goes red if they do).
- `scripts/sync-readme-styles.js` + `scripts/styleMockup.js`: regenerate those README mockups from real output (handles Nerd/braille/emoji glyphs with zero hand-transcription); run it whenever rendered output changes.

### Fixed

- Aligned all 7 Styles gallery mockups with real output (correct labels, percentages, 8-cell bars, `git: main`, `47.0k/1000k`, actual Nerd-Font glyphs) — they were stale hand-written spec placeholders.

## [0.4.1] - 2026-06-03

### Fixed

- README: the "The HUD" and `claude` style mockups now match the actual default output — `auto` single-line layout, `S`/`W` labels (not `Sess`/`Wk`), `24%`, an 8-cell bar, and the `⎇` branch marker — instead of stale spec placeholders. The default is stated explicitly (`claude` style + `auto` layout).

## [0.4.0] - 2026-06-03

### Added
- Session cost **estimate** element (`elements.cost`, default on): shows `$0.0123 est · 47k ctx` — a client-side estimate of the current session, in USD — only when Claude Code provides no rate_limits (API-key / free usage, or a subscriber's first render). Subscribers stay clean: once rate_limits appear, the cost element hides and Session/Weekly bars return. The `est` marker and docs make clear this is an estimate, not a bill or balance.
- `LIMIT` marker: a Session/Weekly meter at 100% shows a red `LIMIT` with its reset countdown instead of a full bar.

### Changed
- In no-rate_limits situations, the cost estimate replaces the old "waiting for first message" note (which still appears when `elements.cost` is off).

### Notes
- Usage-credit balance, monthly spend limit, current account balance, and auto-reload status are NOT exposed to statusline scripts by Claude Code, so the HUD cannot and does not display them.

## [0.3.0] - 2026-06-03

### Added
- Built-in `cs` short command — `cs <args...>` runs the same CLI as `claude-status` (e.g. `cs style claude`). Installed automatically.
- `claude-status alias <name> --for self` — create a custom short shell alias pointing at the `claude-status` CLI (any name). `alias <name>` without `--for` still aliases the `cc` launcher.
- Installer now warns when a pre-existing `cs` (e.g. coursier) is found on PATH that the new `cs` may shadow.

## [0.2.0] - 2026-06-02

### Added
- `claude-status style [<name>]`, `layout [<name>]`, and `alias <name>` top-level shortcut commands (shorter than `config set ...`); `style`/`layout` with no argument show a gallery / available list.
- Per-topic help: `claude-status help <styles|layout|colors|cc|troubleshooting>` now prints real topic guidance.

### Fixed
- `--alias` is no longer a no-op: `claude-status alias <name>` (and `install --alias <name>`) now writes a shell alias to ~/.zshrc or ~/.bashrc (idempotent), or prints a Set-Alias line for PowerShell on Windows.

### Changed
- `docs/` (design spec + plan) is no longer tracked in the repo; the README Styles gallery is the authoritative public style catalogue.

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
