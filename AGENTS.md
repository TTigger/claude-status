# Agent Guide — @ttigger/claude-status

## Project Overview

`@ttigger/claude-status` is a portable Claude Code statusline HUD. It injects a pre-prompt hook into `~/.claude/settings.json` that runs `claude-status-render` before every Claude Code prompt, displaying model name, project folder, git branch, context usage bar, auto-compact estimate, and Session/Weekly usage limits with reset countdowns. The package ships three bins (`claude-status`, `claude-status-render`, `cc`), seven visual styles, four layouts, a config CLI, and a live preview command. It has zero runtime dependencies and targets Node ≥ 18 CommonJS.

## Commands

```sh
npm test                        # run full suite: node --test
node --test test/<file>.test.js # run a single test file
```

**Adding a style** — see `.claude/skills/add-style` for the step-by-step skill.

**Releasing** — see `.claude/skills/release` for the release skill (version bump, changelog, tag, publish).

## Architecture

| File | Role |
|---|---|
| `src/registry.js` | **Single source of truth.** `STYLES` array (descriptors), `LAYOUTS`, `CONFIG_SCHEMA`. All other modules read from here. |
| `src/elements.js` | Normalises raw stdin usage data into a typed model object consumed by the engine. |
| `src/engine.js` | `buildParts(model, style, config)` — pure function; assembles HUD segments grouped by layout band (info / context / usage). |
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
2. Add a README gallery mockup in `README.md` (Styles section) and a design-spec entry in `docs/` Appendix A.
3. The `test/docdrift.test.js` doc-drift test enforces that every style `name` in `STYLES` appears literally in `README.md` — it will fail until the README is updated.

**If you add a HUD element:**
1. `src/elements.js` — add normalisation logic for the new data field.
2. `src/engine.js` `buildParts` — create the new segment and assign it to a layout group (info / context / usage).
3. `src/registry.js` `CONFIG_SCHEMA` — add an `elements.<name>` boolean entry so it is configurable.
4. Update the design spec (docs/) §4 element catalogue.
5. Add tests covering the new element in `test/elements.test.js` and `test/engine.test.js`.

See `.claude/skills/sync-docs` for the skill that checks all four files stay consistent after element changes.

## Conventions

- **Module format:** CommonJS (`require` / `module.exports`); no ESM.
- **Dependencies:** zero runtime dependencies. Test-only helpers use Node built-ins only.
- **Testing:** `node --test` (Node's built-in test runner). All tests live in `test/`. New code must be accompanied by tests.
- **Commits:** conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).
- **Purity:** engine and layout functions are pure — no I/O, no side effects. Side-effectful code (fs, git, installer) is isolated in dedicated modules.
