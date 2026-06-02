---
name: add-style
description: Use when adding a new visual style to the Claude Code statusline HUD. Covers the full closed loop from registry entry to README, design spec, tests, and changelog.
---

# Add a New Visual Style

Follow these steps in order. Do not skip any step — `npm test` will catch missing README entries, and the per-style smoke test will catch missing or malformed descriptors.

1. **Add a descriptor object to `STYLES` in `src/registry.js`.**

   The full descriptor shape is:

   ```js
   {
     name: 'my-style',          // kebab-case, unique
     label: 'My Style',         // human-readable display name
     bar: { full: '█', empty: '░' },  // bar fill characters
     barWrap: ['[', ']'],        // characters wrapping the bar
     labels: {
       branch: 'branch',        // label text for each segment
       ctx: 'ctx',
       sess: 'sess',
       wk: 'wk',
       ac: 'ac',
     },
     icons: null,               // null OR { model: '…', project: '…' } for icon variants
     colorMode: 'coral',        // 'coral' | 'traffic'
     decimals: 1,               // decimal places for token percentages
     rawTokens: false,          // show raw token counts instead of percentages
     lowercase: false,          // lowercase all output text
     requires: 'unicode',       // terminal capability: 'ascii' | 'unicode' | 'truecolor' | 'nerd' | 'braille' | 'emoji'
   }
   ```

   Append the new entry to the `STYLES` array. The array order determines display order in `config list` and `--help`.

2. **Set the correct `requires` capability and `colorMode`.**

   - `requires: 'ascii'` — plain text only, no extended Unicode.
   - `requires: 'unicode'` — Unicode block elements allowed.
   - `requires: 'truecolor'` — 24-bit color required.
   - `requires: 'nerd'` — Nerd Font icons required.
   - `requires: 'braille'` — Braille dot characters required.
   - `requires: 'emoji'` — Emoji characters required.
   - `colorMode: 'coral'` — uses the coral/warm palette.
   - `colorMode: 'traffic'` — uses red/yellow/green traffic-light palette.

   Choose the most restrictive `requires` that your new characters actually need.

3. **Add a one-line mockup to two places:**

   - **README "Styles" section** — add a row to the styles table or a fenced code block mockup matching the existing format. The `test/docdrift.test.js` doc-drift guard checks that every style `name` in the `STYLES` array appears somewhere in `README.md`; the test goes red if the name is absent.
   - **Design spec Appendix A** (`docs/superpowers/specs/2026-06-02-cc-statusline-design.md`) — add a matching mockup line under Appendix A so the visual catalogue stays current.

4. **Run `npm test` and confirm all tests pass.**

   Two test files cover new styles automatically:
   - `test/render.test.js` — per-style smoke test renders every entry in `registry.STYLES`; a malformed descriptor (wrong shape, missing field) will fail here.
   - `test/docdrift.test.js` — README doc-drift guard; fails if the style `name` is not present in `README.md`.

   Fix any failures before proceeding.

5. **Add a `CHANGELOG.md` entry** under `[Unreleased]`:**

   ```md
   ### Added
   - New style `my-style`: <one-sentence description of the aesthetic>.
   ```

   See `sync-docs` skill for the full change → file map.
