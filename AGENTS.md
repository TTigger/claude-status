# Agent Guide — @ttigger/claude-status

## Project Overview

`@ttigger/claude-status` is a portable Claude Code statusline HUD. It merges a `statusLine` entry into `~/.claude/settings.json` (`{ "type": "command", "command": "claude-status-render" }`) that Claude Code runs to render the status line on every message, displaying model name, project folder, git branch, context usage bar, auto-compact estimate, and Session/Weekly usage limits with reset countdowns. The package ships three bins (`claude-status`, `claude-status-render`, `cc`), seven visual styles, four layouts, a config CLI, and a live preview command. It has zero runtime dependencies and targets Node ≥ 18 CommonJS.

## Commands

```sh
npm test                        # run full suite: node --test
node --test test/<file>.test.js # run a single test file
```

**Adding a style** — see `.claude/skills/add-style` for the step-by-step skill.

**Releasing** — see `.claude/skills/release` for the release skill (version bump, changelog, tag, publish).

**Shortcut commands (0.2.0+):** `claude-status style [<name>]`, `claude-status layout [<name>]`, and `claude-status alias <name>` are top-level shortcuts. `style`/`layout` with no argument show a gallery / available list; with a name they call `config set` internally. `alias <name>` writes a shell alias to `~/.zshrc` / `~/.bashrc` (macOS/Linux, idempotent) or prints a `Set-Alias` line for PowerShell (Windows). `install --alias <name>` also works.

**0.3.0 additions:** The package ships a built-in `cs` bin (same entry point as `claude-status`) so `cs style claude`, `cs help cc`, etc. all work — installed automatically. `alias <name> --for self` creates a custom shell alias pointing at `claude-status` itself (any name); omitting `--for` or using `--for cc` still aliases the `cc` launcher. The installer warns when a pre-existing `cs` (e.g. coursier) is found on PATH.

## Architecture

| File | Role |
|---|---|
| `src/registry.js` | **Single source of truth.** `STYLES` array (descriptors), `LAYOUTS`, `CONFIG_SCHEMA`. All other modules read from here. |
| `src/elements.js` | Normalises raw stdin usage data into a typed model object consumed by the engine. |
| `src/engine.js` | `buildParts({ els, style, palette, config, now, opts })` — pure function; returns ordered `{ key, text, group }` segments grouped by band (`env` / `context` / `limits`). |
| `src/layout.js` | Distributes parts across one, two, or three lines according to the chosen layout and terminal width. |
| `src/render.js` | Top-level `renderHud` — orchestrates elements → engine → layout → ANSI colour. |
| `src/palette.js` | Theme-aware colour resolver; reads `~/.claude/settings.json` theme field. |
| `src/config.js` | Deep-merge config read/write against `CONFIG_SCHEMA`. |
| `src/installer/` | Merges the render hook into `~/.claude/settings.json` with a `.bak` backup before writing. |
| `src/preview.js` | Renders all layout variants for a given style in a side-by-side preview. |
| `src/git.js` | Reads current git branch via a local `git` subprocess. |
| `src/detect.js` | Terminal capability detection (truecolor / unicode / braille / nerd / emoji / ascii). |
| `src/format.js` | Number and duration formatting primitives. |
| `src/defaults.js` | Default config values derived from `CONFIG_SCHEMA`. |
| `src/fixtures.js` | Shared fixture data used across tests. |
| `bin/` | Thin entry-point scripts for each bin. |

The render pipeline is pure and data-driven: `elements.js → engine.js → layout.js → render.js`. Adding a new style requires only a new descriptor in `STYLES`; no imperative branching elsewhere.

The installer uses a read–backup–merge–write pattern so that `~/.claude/settings.json` is never overwritten without a `.bak` recovery path.

## Maintenance Map (Closed Loop)

**If you change styles:**
1. Update the `STYLES` descriptor in `src/registry.js`.
2. Add a gallery mockup in the `README.md` **Styles** section. This is the authoritative public catalogue — the design spec is a maintainer-local document (not tracked in the repo).
3. The `test/docdrift.test.js` doc-drift test enforces that every style `name` in `STYLES` appears literally in `README.md` — it will fail until the README is updated.

**If you add a HUD element:**
1. `src/elements.js` — add normalisation logic for the new data field.
2. `src/engine.js` `buildParts` — create the new segment (`{ key, text, group }`) and assign it to a layout group (`env` / `context` / `limits`).
3. `src/registry.js` `CONFIG_SCHEMA` — add an `'elements.<name>'` dotted key (`{ type: 'bool', default: true }`) so it is configurable.
4. Update the maintainer-local design spec §4 element catalogue, if present (the spec is not tracked in the repo).
5. Add tests covering the new element in `test/elements.test.js` and `test/engine.test.js`.

See `.claude/skills/sync-docs` for the skill that checks all four files stay consistent after element changes.

## Conventions

- **Module format:** CommonJS (`require` / `module.exports`); no ESM.
- **Dependencies:** zero runtime dependencies. Test-only helpers use Node built-ins only.
- **Testing:** `node --test` (Node's built-in test runner). All tests live in `test/`. New code must be accompanied by tests.
- **Commits:** conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).
- **Purity:** engine and layout functions are pure — no I/O, no side effects. Side-effectful code (fs, git, installer) is isolated in dedicated modules.
