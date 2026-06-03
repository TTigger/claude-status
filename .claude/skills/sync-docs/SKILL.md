---
name: sync-docs
description: Use as the canonical change-to-file maintenance map. Consult this skill whenever making any change to the codebase to know which files and tests must be updated in lockstep. The other three skills (add-style, add-hud-element, release) link here for the full picture.
---

# Sync-Docs: Change → What to Update

This is the canonical closed-loop maintenance map for `@ttigger/claude-status`. Any change to the codebase must propagate to every column in its row below, or the repository will be in an inconsistent state (tests will fail or docs will drift).

## Change → File Map

| Change | Source of truth | Also update | Tests that guard it |
|--------|----------------|-------------|---------------------|
| Add or rename a **style** | `STYLES` array in `src/registry.js` | Run `node scripts/sync-readme-styles.js` to regenerate the README "The HUD" line + Styles gallery from real output (never hand-edit those blocks) | `test/render.test.js` (per-style smoke); `test/docdrift.test.js` (style name present); `test/readme-mockups.test.js` (mockup byte-matches render) |
| Change a **style descriptor field** (bar chars, colorMode, labels, icons, requires, decimals…) | `STYLES` entry in `src/registry.js` | Run `node scripts/sync-readme-styles.js` (the rendered output changed → README mockups must too) | `test/render.test.js` smoke; `test/readme-mockups.test.js` (will go red until you re-sync) |
| Add or rename a **layout** | `LAYOUTS` in `src/registry.js` | README layout docs; design spec if applicable | Existing render tests |
| Add or rename a **config key** | `CONFIG_SCHEMA` in `src/registry.js` | Auto-propagates to: config validation, `config list` output, `--help` text, preview gallery — no extra files needed | Config-schema unit tests (if any) |
| Add a **HUD element** | `src/elements.js` (buildElements normalized model) | `src/engine.js` buildParts (add segment + group); `CONFIG_SCHEMA` elements key in `src/registry.js`; README HUD section; maintainer-local design spec §4 data-source table (optional, not in repo) | `test/elements.test.js`; `test/engine.test.js` |
| Change **render logic** | `src/engine.js` / `src/layout.js` / `src/render.js` | If the default/style output changes, run `node scripts/sync-readme-styles.js` | `test/render.test.js`; `test/readme-mockups.test.js` |
| **Bump version** | `package.json` `"version"` | `CHANGELOG.md` (move `[Unreleased]` → dated heading, add fresh `[Unreleased]`) | None (manual) |
| Add a **CHANGELOG entry** | `CHANGELOG.md` `[Unreleased]` section | Nothing else until release | None (manual) |

## Key Relationships

- **`src/registry.js` is the single source of truth** for styles, layouts, and config schema. Changes there auto-propagate to config validation, CLI help text, and the preview gallery — no separate sync needed for those.
- **`test/docdrift.test.js`** enforces that every `name` in `registry.STYLES` appears in `README.md`. Adding a style without updating the README will break CI.
- **`test/render.test.js`** iterates every entry in `registry.STYLES` and renders it. A malformed descriptor (wrong shape, missing required field) fails here.
- **Design spec** is the human-readable reference; it is not machine-checked, not tracked in the repo, and is an optional maintainer-local document. §4 covers HUD data sources; Appendix A covers style mockups. The README "Styles" gallery (guarded by `test/docdrift.test.js`) is the authoritative public source for styles.
- **GitHub Actions** `.github/workflows/ci.yml` runs `npm test` on every push to `main` and every PR. `.github/workflows/publish.yml` runs on `v*` tags and publishes to npm using the `NPM_TOKEN` secret.

## Quick Reference: Which Skill to Use

- Adding a new visual style → use `add-style` skill.
- Adding a new HUD data element → use `add-hud-element` skill.
- Cutting a release → use `release` skill.
- Unsure what to update after a change → consult this `sync-docs` skill table above.
